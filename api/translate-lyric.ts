import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// Lazy OpenAI client initialization
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not configured. Please set OPENAI_API_KEY in the Vercel project environment variables.'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Lazy Supabase client initialization
function getSupabaseClient() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    '';

  const isConfigured = Boolean(
    supabaseUrl &&
      supabaseUrl.startsWith('https://') &&
      !supabaseUrl.includes('placeholder') &&
      !supabaseUrl.includes('your-project') &&
      supabaseKey &&
      supabaseKey !== 'placeholder-anon-key'
  );

  if (!isConfigured) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle test GET requests or verification probes
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      route: 'translate-lyric',
      method: 'GET',
      service: 'translation-api',
      message: 'Send a POST request with lyricId, content, targetLanguage to translate.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Parse request body
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  // Support quick routing verification test probe
  if (body.test === true && !body.content) {
    return res.status(200).json({
      ok: true,
      route: 'translate-lyric',
    });
  }

  const {
    lyricId,
    content,
    title,
    artist,
    sourceLanguage,
    targetLanguage,
    translationType = 'transliteration',
    userId = 'community_user',
  } = body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Lyric content is required.' });
  }

  if (!targetLanguage || typeof targetLanguage !== 'string') {
    return res.status(400).json({ error: 'Target language is required.' });
  }

  const type: 'transliteration' | 'translation' =
    translationType === 'translation' ? 'translation' : 'transliteration';

  const supabase = getSupabaseClient();

  try {
    // 1. Check Supabase cache first if lyricId is provided
    if (lyricId && supabase) {
      try {
        const { data: cached, error: checkError } = await supabase
          .from('lyric_translations')
          .select('*')
          .eq('lyric_id', lyricId)
          .eq('target_language', targetLanguage)
          .eq('translation_type', type)
          .maybeSingle();

        if (!checkError && cached) {
          return res.status(200).json({
            success: true,
            cached: true,
            translation: cached,
          });
        }
      } catch (cacheLookupErr) {
        console.warn('Cache lookup exception:', cacheLookupErr);
      }
    }

    // 2. Perform OpenAI translation/transliteration
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

    // Clean any markdown backticks or wrappers
    let cleanedContent = rawOutput
      .replace(/^```[a-z]*\n/i, '')
      .replace(/\n```$/g, '')
      .trim();

    let translatedTitle: string | undefined = undefined;
    const titleMatch = cleanedContent.match(/^TITLE:\s*(.+?)(?:\n\n|\n)(?:LYRICS:\s*)?([\s\S]+)$/i);
    if (titleMatch) {
      translatedTitle = titleMatch[1].trim();
      cleanedContent = titleMatch[2].trim();
    } else if (title) {
      translatedTitle = title;
    }

    const newRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `trans-${Date.now()}`,
      lyric_id: lyricId || null,
      target_language: targetLanguage,
      translation_type: type,
      translated_title: translatedTitle,
      translated_content: cleanedContent,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Save canonical translation to Supabase if configured
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
          return res.status(200).json({
            success: true,
            cached: false,
            translation: savedData,
          });
        }
      } catch (dbErr: any) {
        console.error('[Supabase Upsert Exception]:', dbErr?.message);
      }
    }

    return res.status(200).json({
      success: true,
      cached: false,
      translation: newRecord,
    });
  } catch (err: any) {
    console.error('Translation error in /api/translate-lyric:', err);

    let statusCode = 500;
    let errorMessage = err?.message || 'Failed to process lyric translation.';

    if (err?.status === 401 || err?.message?.includes('API key')) {
      statusCode = 401;
      errorMessage = 'OpenAI API key is missing or invalid. Please configure OPENAI_API_KEY in the Vercel environment variables.';
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
  }
}
