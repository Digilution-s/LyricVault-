import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

// Lazy OpenAI Client Helper
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured. Please set OPENAI_API_KEY in the Secrets panel or .env file.');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Supabase Client for server-side persistence
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder.supabase.co') &&
  !supabaseUrl.includes('your-project.supabase.co') &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'placeholder-anon-key'
);

const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// In-memory concurrency tracker to prevent duplicate concurrent OpenAI calls
const activeTranslationPromises = new Map<string, Promise<any>>();

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    supabaseConfigured: isSupabaseConfigured,
    timestamp: new Date().toISOString(),
  });
});

// GET existing community translations for a lyric
app.get('/api/lyrics/:lyricId/translations', async (req, res) => {
  try {
    const { lyricId } = req.params;
    if (!lyricId) {
      return res.status(400).json({ error: 'lyricId is required' });
    }

    if (!supabase) {
      return res.json({ translations: [] });
    }

    const { data, error } = await supabase
      .from('lyric_translations')
      .select('*')
      .eq('lyric_id', lyricId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Failed to fetch translations from Supabase:', error.message);
      return res.json({ translations: [] });
    }

    return res.json({ translations: data || [] });
  } catch (err: any) {
    console.error('Error fetching lyric translations:', err);
    return res.status(500).json({ error: err?.message || 'Failed to fetch translations' });
  }
});

// POST /api/translate-lyric: Cache-first transliteration & translation via OpenAI
app.post('/api/translate-lyric', async (req, res) => {
  const {
    lyricId,
    content,
    title,
    artist,
    sourceLanguage,
    targetLanguage,
    translationType = 'transliteration',
    userId = 'community_user',
  } = req.body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Lyric content is required.' });
  }

  if (!targetLanguage || typeof targetLanguage !== 'string') {
    return res.status(400).json({ error: 'Target language is required.' });
  }

  const type: 'transliteration' | 'translation' =
    translationType === 'translation' ? 'translation' : 'transliteration';

  const cacheKey = `${lyricId || 'custom'}_${targetLanguage}_${type}`;

  try {
    // 1. Check Supabase cache first if lyricId is provided
    if (lyricId && supabase) {
      const { data: cached, error: checkError } = await supabase
        .from('lyric_translations')
        .select('*')
        .eq('lyric_id', lyricId)
        .eq('target_language', targetLanguage)
        .eq('translation_type', type)
        .maybeSingle();

      if (!checkError && cached) {
        return res.json({
          success: true,
          cached: true,
          translation: cached,
        });
      }
    }

    // 2. Prevent concurrent duplicate requests for the exact same lyric + language + type
    if (activeTranslationPromises.has(cacheKey)) {
      const result = await activeTranslationPromises.get(cacheKey);
      return res.json({
        success: true,
        cached: false,
        translation: result,
      });
    }

    // 3. Perform the OpenAI generation with lock
    const translationPromise = (async () => {
      const openai = getOpenAIClient();

      let systemPrompt = '';
      if (type === 'transliteration') {
        systemPrompt = `You are an expert linguistic transliterator specializing in song lyrics, poetry, and Indic/world scripts (including Hindi Devanagari, Assamese, Bengali/Bangla, Urdu Nastaliq, Punjabi Gurmukhi, Tamil, Telugu, Gujarati, Marathi, etc.).
Your job is to convert the lyrics from their original script to phonetic Latin/Roman script (${targetLanguage}), such as Hinglish for Hindi, Banglish / Roman Bengali for Bengali, Roman Assamese for Assamese, Roman Urdu for Urdu, etc.

CRITICAL TRANSLITERATION RULES:
1. SCRIPT-AWARE CONVERSION: Accurately transliterate the pronunciation into easy-to-read Roman/Latin script for singing and reading along.
2. PRESERVE STRUCTURE: Maintain EXACT line breaks, blank lines between stanzas, repeated chorus lines, punctuation, and stanza structure. Do NOT collapse lines into paragraphs.
3. NO TRANSLATION: Do NOT translate the meaning into English. Only transliterate the sound/phonetics.
4. CLEAN OUTPUT: Return ONLY the transliterated lyrics. Absolutely NO markdown formatting like \`\`\`, no conversational preamble, no notes, and no explanations.`;
      } else {
        systemPrompt = `You are a master literary and musical translator.
Your job is to translate the given song lyrics into ${targetLanguage} while preserving poetic meaning, emotional resonance, and musical meter.

CRITICAL TRANSLATION RULES:
1. MEANING-PRESERVING: Translate the lyric accurately into natural, expressive ${targetLanguage} that captures the heart of the song.
2. PRESERVE STRUCTURE: Maintain EXACT line breaks, blank lines between stanzas, repeated chorus lines, and stanza structure.
3. CLEAN OUTPUT: Return ONLY the translated lyrics. Absolutely NO markdown backticks \`\`\`, no preamble, no commentary, and no notes.`;
      }

      // Title transliteration/translation prompt if title exists
      let userPrompt = '';
      if (title && title.trim()) {
        userPrompt = `TITLE: ${title.trim()}\n\nLYRICS:\n${content.trim()}`;
      } else {
        userPrompt = `LYRICS:\n${content.trim()}`;
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Source Language: ${sourceLanguage || 'Auto-detect'}\nTarget: ${targetLanguage}\nOperation: ${type}\n${userPrompt}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      });

      const rawOutput = completion.choices[0]?.message?.content?.trim();
      if (!rawOutput) {
        throw new Error('OpenAI returned an empty translation response.');
      }

      // Clean any accidental markdown backticks or wrappers
      let cleanedContent = rawOutput
        .replace(/^```[a-z]*\n/i, '')
        .replace(/\n```$/g, '')
        .trim();

      // Extract translated title if formatted as TITLE: ... \n\n LYRICS:
      let translatedTitle: string | undefined = undefined;
      const titleMatch = cleanedContent.match(/^TITLE:\s*(.+?)(?:\n\n|\n)(?:LYRICS:\s*)?([\s\S]+)$/i);
      if (titleMatch) {
        translatedTitle = titleMatch[1].trim();
        cleanedContent = titleMatch[2].trim();
      } else if (title) {
        // Simple heuristic: if original title had text and we have the same, keep or use title
        translatedTitle = title;
      }

      const newRecord = {
        id: (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `trans-${Date.now()}`,
        lyric_id: lyricId || null,
        target_language: targetLanguage,
        translation_type: type,
        translated_title: translatedTitle,
        translated_content: cleanedContent,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save to Supabase if lyricId and Supabase are configured
      if (lyricId && supabase) {
        try {
          const { data: savedData, error: insertError } = await supabase
            .from('lyric_translations')
            .upsert(
              {
                lyric_id: lyricId,
                target_language: targetLanguage,
                translation_type: type,
                translated_title: translatedTitle,
                translated_content: cleanedContent,
                created_by: userId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'lyric_id,target_language,translation_type' }
            )
            .select()
            .single();

          if (!insertError && savedData) {
            console.log(`[Supabase Cache] Successfully saved canonical translation for lyric ${lyricId} (${targetLanguage})`);
            return savedData;
          } else if (insertError) {
            console.error('[Supabase Save Error]:', insertError.message, insertError.details || '');
          }
        } catch (dbErr: any) {
          console.error('[Supabase Upsert Exception]:', dbErr.message);
        }
      } else if (!supabase) {
        console.warn('[Supabase Cache] Supabase is not configured on the server. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your settings.');
      }

      return newRecord;
    })();

    activeTranslationPromises.set(cacheKey, translationPromise);
    const translationResult = await translationPromise;

    return res.json({
      success: true,
      cached: false,
      translation: translationResult,
    });
  } catch (err: any) {
    console.error('Translation error:', err);

    let statusCode = 500;
    let errorMessage = err?.message || 'Failed to process lyric translation.';

    if (err?.status === 401 || err?.message?.includes('API key')) {
      statusCode = 401;
      errorMessage = 'OpenAI API key is missing or invalid. Please check OPENAI_API_KEY in the project settings.';
    } else if (err?.status === 429 || err?.message?.includes('rate limit') || err?.message?.includes('quota')) {
      statusCode = 429;
      errorMessage = 'OpenAI rate limit or quota exceeded. Please try again shortly.';
    } else if (err?.code === 'ETIMEDOUT' || err?.message?.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'The translation request timed out. Please try again.';
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details: err?.message,
    });
  } finally {
    activeTranslationPromises.delete(cacheKey);
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LyricVault server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
