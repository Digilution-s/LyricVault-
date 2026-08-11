import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Lyric, MoodType, ThemeType, ContentType } from '../types';
import { THEMES } from '../data/demoData';
import { parseSongLinks } from '../utils/musicPlatform';

export interface SearchLyricsParams {
  query?: string;
  mood?: string;
  theme?: string;
  contentType?: string;
  genre?: string;
  sortBy?: 'newest' | 'oldest' | 'most_bookmarked' | 'trending';
  limit?: number;
  offset?: number;
  currentUserId?: string;
}

// Calculate trending score using exact formula:
// Trending Score = ( 3 * ln(1 + Likes) + 2 * ln(1 + Saves) ) * 2^(-AgeInDays / 7)
export function calculateTrendingScore(likes: number, saves: number, createdAt: string): number {
  const likesCount = Math.max(0, likes || 0);
  const savesCount = Math.max(0, saves || 0);
  
  const createdTime = new Date(createdAt).getTime();
  const nowTime = Date.now();
  const ageInMs = Math.max(0, nowTime - createdTime);
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  const engagementScore = 3 * Math.log(1 + likesCount) + 2 * Math.log(1 + savesCount);
  const recencyFactor = Math.pow(2, -ageInDays / 7);

  return engagementScore * recencyFactor;
}

export interface SearchLyricsResult {
  lyrics: Lyric[];
  totalCount: number;
}

export const lyricsService = {
  // Fetch themes dynamically from Supabase
  async getThemes(): Promise<{ id: string; label: string }[]> {
    if (!isSupabaseConfigured()) return THEMES;
    try {
      const { data, error } = await supabase.from('themes').select('*');
      if (error || !data || data.length === 0) {
        return THEMES;
      }
      return data.map((t: any) => ({
        id: t.id || t.name || t.label,
        label: t.label || t.name || t.id,
      }));
    } catch {
      return THEMES;
    }
  },

  // Main Discover Search & Filter Service
  async searchLyrics(params: SearchLyricsParams = {}): Promise<SearchLyricsResult> {
    if (!isSupabaseConfigured()) {
      return { lyrics: [], totalCount: 0 };
    }

    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;
    const sortBy = params.sortBy || 'newest';

    // 1. If filtering by Theme, find matching lyric_ids from lyric_themes
    let themeLyricIds: string[] | null = null;
    if (params.theme && params.theme !== 'All') {
      const { data: themeRows, error: themeError } = await supabase
        .from('lyric_themes')
        .select('lyric_id')
        .eq('theme_id', params.theme);

      if (themeError) {
        console.error('Error fetching theme lyrics:', themeError.message);
      }

      if (themeRows && themeRows.length > 0) {
        themeLyricIds = Array.from(new Set(themeRows.map((r: any) => r.lyric_id)));
      } else {
        // No lyrics matching this theme
        return { lyrics: [], totalCount: 0 };
      }
    }

    // 2. Build main query for lyrics
    let queryBuilder = supabase
      .from('lyrics')
      .select(
        `
        *,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `,
        { count: 'exact' }
      );

    // 3. Visibility Filter
    if (params.currentUserId) {
      queryBuilder = queryBuilder.or(`visibility.eq.public,created_by.eq.${params.currentUserId}`);
    } else {
      queryBuilder = queryBuilder.eq('visibility', 'public');
    }

    // 4. Text Search Across title, content, song_title, artist_name, author_name, album_name, description
    const cleanQ = params.query?.trim();
    if (cleanQ) {
      const escaped = cleanQ.replace(/,/g, '');
      queryBuilder = queryBuilder.or(
        `title.ilike.%${escaped}%,content.ilike.%${escaped}%,song_title.ilike.%${escaped}%,artist_name.ilike.%${escaped}%,author_name.ilike.%${escaped}%,album_name.ilike.%${escaped}%,description.ilike.%${escaped}%`
      );
    }

    // 5. Categorical Filters
    if (params.mood && params.mood !== 'All') {
      queryBuilder = queryBuilder.eq('mood', params.mood);
    }
    if (params.contentType && params.contentType !== 'All') {
      queryBuilder = queryBuilder.eq('content_type', params.contentType);
    }
    if (params.genre && params.genre !== 'All') {
      queryBuilder = queryBuilder.eq('genre', params.genre);
    }
    if (themeLyricIds) {
      queryBuilder = queryBuilder.in('id', themeLyricIds);
    }

    // 6. Sorting & Pagination
    if (sortBy === 'oldest') {
      queryBuilder = queryBuilder.order('created_at', { ascending: true });
    } else if (sortBy === 'newest') {
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    } else {
      // most_bookmarked: will order in memory after fetching
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    // Range pagination if sorting by date
    if (sortBy !== 'most_bookmarked') {
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);
    }

    const { data, count, error } = await queryBuilder;

    if (error) {
      console.error('Supabase searchLyrics error:', error.message);
      throw new Error(`Failed to search lyrics: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return { lyrics: [], totalCount: count || 0 };
    }

    // 7. Enrich each lyric with Themes, Bookmark Counts, Like Counts, Saved Status & Liked Status
    let formattedLyrics: Lyric[] = await Promise.all(
      data.map(async (row) => {
        // Fetch themes
        const { data: themeData } = await supabase
          .from('lyric_themes')
          .select('theme_id')
          .eq('lyric_id', row.id);

        const themesList = (themeData || []).map((t) => t.theme_id as ThemeType);

        // Fetch bookmark count (Saves)
        const { count: bookmarkCount } = await supabase
          .from('bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('lyric_id', row.id);

        // Fetch like count (Likes)
        let likeCount = 0;
        try {
          const { count } = await supabase
            .from('lyric_likes')
            .select('*', { count: 'exact', head: true })
            .eq('lyric_id', row.id);
          likeCount = count || 0;
        } catch (e) {
          likeCount = 0;
        }

        // Fetch user saved and liked status if logged in
        let isSaved = false;
        let isLiked = false;
        if (params.currentUserId) {
          const { data: bookmarkRow } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', params.currentUserId)
            .eq('lyric_id', row.id)
            .maybeSingle();
          if (bookmarkRow) isSaved = true;

          try {
            const { data: likeRow } = await supabase
              .from('lyric_likes')
              .select('id')
              .eq('user_id', params.currentUserId)
              .eq('lyric_id', row.id)
              .maybeSingle();
            if (likeRow) isLiked = true;
          } catch (e) {
            isLiked = false;
          }
        }

        const creator = row.profiles || {};
        const creatorName = creator.display_name || row.author_name || 'LyricVault Creator';
        const creatorHandle = creator.username ? `@${creator.username}` : '@creator';

        return {
          id: row.id,
          title: row.title,
          content: row.content,
          content_type: (row.content_type || 'Lyric') as ContentType,
          author_name: row.author_name,
          song_title: row.song_title,
          artist_name: row.artist_name,
          album_name: row.album_name,
          language: row.language || 'English',
          genre: row.genre,
          song_link: row.song_link,
          song_links: parseSongLinks(row.song_link),
          mood: (row.mood || 'Melancholic') as MoodType,
          description: row.description,
          cover_url: row.cover_url,
          visibility: row.visibility || 'public',
          created_by: {
            name: creatorName,
            handle: creatorHandle,
            avatar: creator.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            userId: creator.id || row.created_by,
          },
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
          likes_count: likeCount,
          saves_count: bookmarkCount || 0,
          themes: themesList.length > 0 ? themesList : ['Night'],
          is_saved: isSaved,
          is_liked: isLiked,
        };
      })
    );

    // 8. In-memory sorting for special sort options like most_bookmarked or trending
    let totalCount = count || formattedLyrics.length;
    if (sortBy === 'most_bookmarked') {
      formattedLyrics.sort((a, b) => b.saves_count - a.saves_count);
      formattedLyrics = formattedLyrics.slice(offset, offset + limit);
    } else if (sortBy === 'trending') {
      formattedLyrics.sort((a, b) => {
        const scoreA = calculateTrendingScore(a.likes_count, a.saves_count, a.created_at);
        const scoreB = calculateTrendingScore(b.likes_count, b.saves_count, b.created_at);
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      formattedLyrics = formattedLyrics.slice(offset, offset + limit);
    }

    return {
      lyrics: formattedLyrics,
      totalCount,
    };
  },

  // Fetch all public lyrics (wrapper around searchLyrics)
  async getPublicLyrics(currentUserId?: string): Promise<Lyric[]> {
    const res = await this.searchLyrics({ currentUserId, limit: 100 });
    return res.lyrics;
  },

  // Convenience methods
  async getLyricsByMood(mood: string, currentUserId?: string): Promise<Lyric[]> {
    const res = await this.searchLyrics({ mood, currentUserId, limit: 50 });
    return res.lyrics;
  },

  async getLyricsByTheme(theme: string, currentUserId?: string): Promise<Lyric[]> {
    const res = await this.searchLyrics({ theme, currentUserId, limit: 50 });
    return res.lyrics;
  },

  async getLyricsByGenre(genre: string, currentUserId?: string): Promise<Lyric[]> {
    const res = await this.searchLyrics({ genre, currentUserId, limit: 50 });
    return res.lyrics;
  },

  async getLyricsByContentType(contentType: string, currentUserId?: string): Promise<Lyric[]> {
    const res = await this.searchLyrics({ contentType, currentUserId, limit: 50 });
    return res.lyrics;
  },

  async getTrendingLyrics(limit = 8, currentUserId?: string): Promise<Lyric[]> {
    try {
      // Try calling RPC if installed in database
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_trending_lyrics');
      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        // Map RPC result and enrich with user liked/saved status
        const publicOnly = rpcData.filter((r: any) => r.visibility === 'public').slice(0, limit);
        const mapped = await Promise.all(
          publicOnly.map(async (row: any) => {
            const fullLyric = await this.getLyricById(row.id, currentUserId);
            if (fullLyric) {
              return {
                ...fullLyric,
                likes_count: Number(row.like_count || fullLyric.likes_count),
                saves_count: Number(row.bookmark_count || fullLyric.saves_count),
              };
            }
            return null;
          })
        );
        const valid = mapped.filter((l): l is Lyric => l !== null);
        if (valid.length > 0) return valid;
      }
    } catch (e) {
      console.warn('RPC get_trending_lyrics not available, using dynamic calculation:', e);
    }

    // Dynamic fallback using searchLyrics with trending sort
    const res = await this.searchLyrics({ sortBy: 'trending', limit, currentUserId });
    return res.lyrics;
  },

  async getRecentLyrics(limit = 10, currentUserId?: string): Promise<Lyric[]> {
    const res = await this.searchLyrics({ sortBy: 'newest', limit, currentUserId });
    return res.lyrics;
  },

  // Fetch a single lyric by ID
  async getLyricById(id: string, currentUserId?: string): Promise<Lyric | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('lyrics')
      .select(`
        *,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Supabase getLyricById error:', error.message);
      return null;
    }

    if (!data) return null;

    const { data: themeData } = await supabase
      .from('lyric_themes')
      .select('theme_id')
      .eq('lyric_id', data.id);

    const themesList = (themeData || []).map((t) => t.theme_id as ThemeType);

    const { count: bookmarkCount } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('lyric_id', data.id);

    let likeCount = 0;
    try {
      const { count } = await supabase
        .from('lyric_likes')
        .select('*', { count: 'exact', head: true })
        .eq('lyric_id', data.id);
      likeCount = count || 0;
    } catch (e) {
      likeCount = 0;
    }

    let isSaved = false;
    let isLiked = false;
    if (currentUserId) {
      const { data: bData } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('lyric_id', data.id)
        .maybeSingle();
      isSaved = !!bData;

      try {
        const { data: lData } = await supabase
          .from('lyric_likes')
          .select('id')
          .eq('user_id', currentUserId)
          .eq('lyric_id', data.id)
          .maybeSingle();
        isLiked = !!lData;
      } catch (e) {
        isLiked = false;
      }
    }

    const creator = data.profiles || {};
    const creatorName = creator.display_name || data.author_name || 'LyricVault Creator';
    const creatorHandle = creator.username ? `@${creator.username}` : '@creator';

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      content_type: (data.content_type || 'Lyric') as ContentType,
      author_name: data.author_name,
      song_title: data.song_title,
      artist_name: data.artist_name,
      album_name: data.album_name,
      language: data.language || 'English',
      genre: data.genre,
      song_link: data.song_link,
      song_links: parseSongLinks(data.song_link),
      mood: (data.mood || 'Melancholic') as MoodType,
      description: data.description,
      cover_url: data.cover_url,
      visibility: data.visibility || 'public',
      created_by: {
        name: creatorName,
        handle: creatorHandle,
        avatar: creator.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        userId: creator.id || data.created_by,
      },
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      likes_count: likeCount,
      saves_count: bookmarkCount || 0,
      themes: themesList.length > 0 ? themesList : ['Night'],
      is_saved: isSaved,
      is_liked: isLiked,
    };
  },

  // Create a new lyric in Supabase
  async createLyric(payload: {
    title: string;
    content: string;
    contentType?: ContentType;
    authorName?: string;
    songTitle?: string;
    artistName?: string;
    albumName?: string;
    language?: string;
    genre?: string;
    songLink?: string;
    mood?: MoodType;
    description?: string;
    coverUrl?: string;
    visibility?: 'public' | 'private';
    selectedThemes?: ThemeType[];
    creatorInfo?: {
      name: string;
      handle: string;
      avatar?: string;
      userId: string;
    };
  }): Promise<Lyric> {
    const title = payload.title.trim();
    const content = payload.content.trim();

    if (!title) {
      throw new Error('Please enter a title.');
    }
    if (!content) {
      throw new Error('Please add some lyrics.');
    }

    if (!payload.creatorInfo?.userId) {
      throw new Error('You must be logged in to save a lyric.');
    }

    const { data, error } = await supabase
      .from('lyrics')
      .insert({
        title,
        content,
        content_type: payload.contentType || 'Lyric',
        author_name: payload.authorName || null,
        song_title: payload.songTitle || null,
        artist_name: payload.artistName || null,
        album_name: payload.albumName || null,
        language: payload.language || 'English',
        genre: payload.genre || null,
        song_link: payload.songLink || null,
        mood: payload.mood || 'Melancholic',
        description: payload.description || null,
        cover_url: payload.coverUrl || null,
        visibility: payload.visibility || 'public',
        created_by: payload.creatorInfo.userId,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert lyric error:', error.message);
      throw new Error(`Failed to save lyric to database: ${error.message}`);
    }

    if (payload.selectedThemes && payload.selectedThemes.length > 0) {
      const themeInserts = payload.selectedThemes.map((themeId) => ({
        lyric_id: data.id,
        theme_id: themeId,
      }));
      await supabase.from('lyric_themes').insert(themeInserts);
    }

    const creatorHandle = payload.creatorInfo.handle.startsWith('@')
      ? payload.creatorInfo.handle
      : `@${payload.creatorInfo.handle}`;

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      content_type: (data.content_type || 'Lyric') as ContentType,
      author_name: data.author_name,
      song_title: data.song_title,
      artist_name: data.artist_name,
      album_name: data.album_name,
      language: data.language || 'English',
      genre: data.genre,
      song_link: data.song_link,
      song_links: parseSongLinks(data.song_link),
      mood: (data.mood || 'Melancholic') as MoodType,
      description: data.description,
      cover_url: data.cover_url,
      visibility: data.visibility || 'public',
      created_by: {
        name: payload.creatorInfo.name,
        handle: creatorHandle,
        avatar: payload.creatorInfo.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      likes_count: 0,
      saves_count: 0,
      themes: payload.selectedThemes || ['Night'],
      is_saved: false,
      is_liked: false,
    };
  },

  // Update existing lyric
  async updateLyric(
    id: string,
    userId: string,
    payload: {
      title: string;
      content: string;
      contentType?: ContentType;
      authorName?: string;
      songTitle?: string;
      artistName?: string;
      albumName?: string;
      language?: string;
      genre?: string;
      songLink?: string;
      mood?: MoodType;
      description?: string;
      coverUrl?: string;
      visibility?: 'public' | 'private';
      selectedThemes?: ThemeType[];
    }
  ): Promise<Lyric> {
    const title = payload.title.trim();
    const content = payload.content.trim();

    if (!title) {
      throw new Error('Please enter a title.');
    }
    if (!content) {
      throw new Error('Please add some lyrics.');
    }
    if (!userId) {
      throw new Error('User authentication required.');
    }

    const { data, error } = await supabase
      .from('lyrics')
      .update({
        title,
        content,
        content_type: payload.contentType || 'Lyric',
        author_name: payload.authorName || null,
        song_title: payload.songTitle || null,
        artist_name: payload.artistName || null,
        album_name: payload.albumName || null,
        language: payload.language || 'English',
        genre: payload.genre || null,
        song_link: payload.songLink || null,
        mood: payload.mood || 'Melancholic',
        description: payload.description || null,
        cover_url: payload.coverUrl || null,
        visibility: payload.visibility || 'public',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('created_by', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating lyric in Supabase:', error.message);
      throw new Error(`Failed to update lyric: ${error.message}`);
    }

    // Update themes in lyric_themes
    if (payload.selectedThemes) {
      await supabase.from('lyric_themes').delete().eq('lyric_id', id);
      if (payload.selectedThemes.length > 0) {
        const themeInserts = payload.selectedThemes.map((themeId) => ({
          lyric_id: id,
          theme_id: themeId,
        }));
        await supabase.from('lyric_themes').insert(themeInserts);
      }
    }

    const updatedLyric = await this.getLyricById(id);
    if (!updatedLyric) {
      throw new Error('Failed to retrieve updated lyric.');
    }
    return updatedLyric;
  },

  // Delete lyric
  async deleteLyric(id: string, userId?: string): Promise<boolean> {
    let query = supabase.from('lyrics').delete().eq('id', id);
    if (userId) {
      query = query.eq('created_by', userId);
    }
    const { error } = await query;
    if (error) {
      console.error('Error deleting lyric:', error.message);
      throw new Error(`Failed to delete lyric: ${error.message}`);
    }
    return true;
  },

  // Get user additions / created lyrics
  async getUserLyrics(userId: string): Promise<Lyric[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('lyrics')
      .select(`
        *,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getUserLyrics error:', error.message);
      return [];
    }

    if (!data) return [];

    const formattedLyrics: Lyric[] = await Promise.all(
      data.map(async (row) => {
        const { data: themeData } = await supabase
          .from('lyric_themes')
          .select('theme_id')
          .eq('lyric_id', row.id);

        const themesList = (themeData || []).map((t) => t.theme_id as ThemeType);

        const { count: bookmarkCount } = await supabase
          .from('bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('lyric_id', row.id);

        let likeCount = 0;
        try {
          const { count } = await supabase
            .from('lyric_likes')
            .select('*', { count: 'exact', head: true })
            .eq('lyric_id', row.id);
          likeCount = count || 0;
        } catch (e) {
          likeCount = 0;
        }

        const { data: bookmarkRow } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('lyric_id', row.id)
          .maybeSingle();

        let isLiked = false;
        try {
          const { data: likeRow } = await supabase
            .from('lyric_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('lyric_id', row.id)
            .maybeSingle();
          isLiked = !!likeRow;
        } catch (e) {
          isLiked = false;
        }

        const creator = row.profiles || {};
        const creatorName = creator.display_name || row.author_name || 'LyricVault Creator';
        const creatorHandle = creator.username ? `@${creator.username}` : '@creator';

        return {
          id: row.id,
          title: row.title,
          content: row.content,
          content_type: (row.content_type || 'Lyric') as ContentType,
          author_name: row.author_name,
          song_title: row.song_title,
          artist_name: row.artist_name,
          album_name: row.album_name,
          language: row.language || 'English',
          genre: row.genre,
          song_link: row.song_link,
          song_links: parseSongLinks(row.song_link),
          mood: (row.mood || 'Melancholic') as MoodType,
          description: row.description,
          cover_url: row.cover_url,
          visibility: row.visibility || 'public',
          created_by: {
            name: creatorName,
            handle: creatorHandle,
            avatar: creator.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            userId: creator.id || row.created_by,
          },
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
          likes_count: likeCount,
          saves_count: bookmarkCount || 0,
          themes: themesList.length > 0 ? themesList : ['Night'],
          is_saved: Boolean(bookmarkRow),
          is_liked: isLiked,
        };
      })
    );

    return formattedLyrics;
  },
};
