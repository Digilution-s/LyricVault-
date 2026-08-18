import { LyricTranslation, TranslationType } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface LanguageOption {
  id: string;
  name: string;
  nativeName?: string;
  type: TranslationType;
  description: string;
  popularFor?: string[];
}

export const SUPPORTED_TRANSLATIONS: LanguageOption[] = [
  // Transliterations (Roman Script / Pronunciation)
  {
    id: 'Hinglish (Roman Hindi)',
    name: 'Hinglish (Roman Hindi)',
    nativeName: 'हिंग्लिश',
    type: 'transliteration',
    description: 'Read Hindi lyrics phonetically in English/Latin letters',
    popularFor: ['Hindi', 'Urdu', 'Punjabi'],
  },
  {
    id: 'Roman Bengali (Banglish)',
    name: 'Banglish (Roman Bengali)',
    nativeName: 'বাংলা লিপিান্তর',
    type: 'transliteration',
    description: 'Read Bengali lyrics phonetically in English/Latin letters',
    popularFor: ['Bengali', 'Bangla'],
  },
  {
    id: 'Roman Assamese',
    name: 'Roman Assamese',
    nativeName: 'অসমীয়া ৰোমান',
    type: 'transliteration',
    description: 'Read Assamese lyrics phonetically in English/Latin letters',
    popularFor: ['Assamese'],
  },
  {
    id: 'Roman Urdu',
    name: 'Roman Urdu',
    nativeName: 'رومن اردو',
    type: 'transliteration',
    description: 'Read Urdu poetry and lyrics in Latin script',
    popularFor: ['Urdu', 'Ghazal'],
  },
  {
    id: 'Roman Punjabi',
    name: 'Roman Punjabi',
    nativeName: 'ਰੋਮਨ ਪੰਜਾਬੀ',
    type: 'transliteration',
    description: 'Read Punjabi songs phonetically in English alphabet',
    popularFor: ['Punjabi'],
  },
  {
    id: 'Roman Gujarati',
    name: 'Roman Gujarati',
    nativeName: 'રોમન ગુજરાતી',
    type: 'transliteration',
    description: 'Read Gujarati folk & garba lyrics in Latin letters',
    popularFor: ['Gujarati'],
  },
  {
    id: 'Roman Tamil',
    name: 'Roman Tamil',
    nativeName: 'ரோமன் தமிழ்',
    type: 'transliteration',
    description: 'Read Tamil lyrics in Romanized English script',
    popularFor: ['Tamil'],
  },
  {
    id: 'Roman Telugu',
    name: 'Roman Telugu',
    nativeName: 'రోమన్ తెలుగు',
    type: 'transliteration',
    description: 'Read Telugu lyrics in Romanized English script',
    popularFor: ['Telugu'],
  },

  // Semantic Meaning Translations
  {
    id: 'English Translation',
    name: 'English Translation',
    nativeName: 'English (Meaning)',
    type: 'translation',
    description: 'Understand the poetic and emotional meaning in English',
  },
  {
    id: 'Hindi Translation',
    name: 'Hindi Translation',
    nativeName: 'हिन्दी अनुवाद',
    type: 'translation',
    description: 'Understand regional poetry translated into Hindi',
  },
  {
    id: 'Bengali Translation',
    name: 'Bengali Translation',
    nativeName: 'বাংলা অনুবাদ',
    type: 'translation',
    description: 'Poetic translation into Bengali',
  },
  {
    id: 'Spanish Translation',
    name: 'Spanish Translation',
    nativeName: 'Español',
    type: 'translation',
    description: 'Poetic translation into Spanish',
  },
];

const LOCAL_STORAGE_KEY = 'lyricvault-cached-translations';

class TranslationService {
  private memoryCache: Map<string, LyricTranslation[]> = new Map();

  constructor() {
    this.loadLocalStorageCache();
  }

  private loadLocalStorageCache() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([lyricId, transList]) => {
          this.memoryCache.set(lyricId, transList as LyricTranslation[]);
        });
      }
    } catch (e) {
      console.warn('Failed to load local translations cache:', e);
    }
  }

  private persistLocalStorageCache() {
    try {
      const obj: Record<string, LyricTranslation[]> = {};
      this.memoryCache.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('Failed to persist local translations cache:', e);
    }
  }

  /**
   * Seed mock/pre-cached translations for known demo lyrics (e.g. Hindi, Assamese, Bengali, Urdu)
   */
  seedDemoTranslations(lyricId: string, translations: LyricTranslation[]) {
    const existing = this.memoryCache.get(lyricId) || [];
    const merged = [...existing];
    translations.forEach((t) => {
      if (!merged.some((m) => m.target_language === t.target_language && m.translation_type === t.translation_type)) {
        merged.push(t);
      }
    });
    this.memoryCache.set(lyricId, merged);
    this.persistLocalStorageCache();
  }

  /**
   * Get all cached community translations for a specific lyric
   */
  async getTranslationsForLyric(lyricId: string): Promise<LyricTranslation[]> {
    if (!lyricId) return [];

    // Check memory / localStorage cache first
    const cachedLocal = this.memoryCache.get(lyricId) || [];

    if (!isSupabaseConfigured()) {
      return cachedLocal;
    }

    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('lyric_translations')
        .select('*')
        .eq('lyric_id', lyricId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Supabase getTranslations error:', error.message);
        return cachedLocal;
      }

      if (data && data.length > 0) {
        // Merge with local memory cache
        this.memoryCache.set(lyricId, data);
        this.persistLocalStorageCache();
        return data;
      }
    } catch (e) {
      console.warn('Error fetching translations from Supabase:', e);
    }

    return cachedLocal;
  }

  /**
   * Request a translation or transliteration via backend OpenAI API
   * Implements Cache-First Architecture:
   * 1. Checks local cache & Supabase
   * 2. If cached, returns immediately without calling OpenAI
   * 3. If not cached, calls /api/translate-lyric (which runs OpenAI backend)
   * 4. Updates cache and returns response
   */
  async translateLyric(params: {
    lyricId: string;
    content: string;
    title?: string;
    artist?: string;
    sourceLanguage?: string;
    targetLanguage: string;
    translationType: TranslationType;
    userId?: string;
  }): Promise<{ translation: LyricTranslation; isCached: boolean }> {
    const {
      lyricId,
      content,
      title,
      artist,
      sourceLanguage,
      targetLanguage,
      translationType,
      userId,
    } = params;

    // 1. Check existing cached translations
    const existingList = await this.getTranslationsForLyric(lyricId);
    const matched = existingList.find(
      (t) =>
        t.target_language.toLowerCase() === targetLanguage.toLowerCase() &&
        t.translation_type === translationType
    );

    if (matched) {
      return { translation: matched, isCached: true };
    }

    // 2. Call backend OpenAI translation API
    try {
      const response = await fetch('/api/translate-lyric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lyricId,
          content,
          title,
          artist,
          sourceLanguage,
          targetLanguage,
          translationType,
          userId,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Translation request failed with status ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !result.translation) {
        throw new Error(result.error || 'Invalid translation response received from server.');
      }

      const newTranslation: LyricTranslation = result.translation;

      // 3. Update local cache
      const updatedList = [...(this.memoryCache.get(lyricId) || []), newTranslation];
      this.memoryCache.set(lyricId, updatedList);
      this.persistLocalStorageCache();

      return { translation: newTranslation, isCached: result.cached || false };
    } catch (apiError: any) {
      console.error('Translation API call failed:', apiError);
      throw apiError;
    }
  }

  /**
   * Helper to check if any translation matches a search query
   */
  matchesSearchQuery(lyricId: string, query: string): boolean {
    if (!query) return false;
    const cleanQ = query.toLowerCase().trim();
    const list = this.memoryCache.get(lyricId) || [];
    return list.some(
      (t) =>
        t.translated_content.toLowerCase().includes(cleanQ) ||
        (t.translated_title && t.translated_title.toLowerCase().includes(cleanQ))
    );
  }
}

export const translationService = new TranslationService();
