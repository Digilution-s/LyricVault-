import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { lyricsService } from './lyricsService';
import { Lyric } from '../types';

// Helper for local fallback storage if database table is not yet created
const LOCAL_LIKES_KEY = 'lyric_vault_local_likes';

function getLocalLikes(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function setLocalLike(userId: string, lyricId: string, liked: boolean) {
  try {
    const map = getLocalLikes();
    const key = `${userId}_${lyricId}`;
    if (liked) {
      map[key] = true;
    } else {
      delete map[key];
    }
    localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(map));
  } catch (e) {
    // Ignore storage errors
  }
}

function isLocalLiked(userId: string, lyricId: string): boolean {
  const map = getLocalLikes();
  return Boolean(map[`${userId}_${lyricId}`]);
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return (
    error.code === '42P01' ||
    msg.includes('lyric_likes') ||
    msg.includes('schema cache') ||
    msg.includes('relation')
  );
}

export const likeService = {
  // Like a lyric
  async likeLyric(userId: string, lyricId: string): Promise<boolean> {
    if (!userId || !lyricId) return false;

    // UUID validation guard
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId)) {
      setLocalLike(userId, lyricId, true);
      return true;
    }

    if (!isSupabaseConfigured()) {
      setLocalLike(userId, lyricId, true);
      return true;
    }

    const { error } = await supabase
      .from('lyric_likes')
      .insert({ user_id: userId, lyric_id: lyricId });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - user already liked this lyric
        return true;
      }
      if (isTableMissingError(error)) {
        console.warn('`lyric_likes` table missing in Supabase. Falling back to local storage.');
        setLocalLike(userId, lyricId, true);
        return true;
      }
      console.error('Supabase like error:', error.message);
      throw new Error(`Failed to like lyric: ${error.message}`);
    }

    setLocalLike(userId, lyricId, true);
    return true;
  },

  // Unlike a lyric
  async unlikeLyric(userId: string, lyricId: string): Promise<boolean> {
    if (!userId || !lyricId) return false;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId)) {
      setLocalLike(userId, lyricId, false);
      return true;
    }

    if (!isSupabaseConfigured()) {
      setLocalLike(userId, lyricId, false);
      return true;
    }

    const { error } = await supabase
      .from('lyric_likes')
      .delete()
      .match({ user_id: userId, lyric_id: lyricId });

    if (error) {
      if (isTableMissingError(error)) {
        setLocalLike(userId, lyricId, false);
        return true;
      }
      console.error('Supabase unlike error:', error.message);
      throw new Error(`Failed to remove like: ${error.message}`);
    }

    setLocalLike(userId, lyricId, false);
    return true;
  },

  // Toggle like status for a lyric
  async toggleLike(userId: string, lyricId: string): Promise<{ liked: boolean; count: number }> {
    if (!userId) {
      throw new Error('Please sign in to like lyrics.');
    }

    const currentlyLiked = await this.isLyricLiked(userId, lyricId);
    if (currentlyLiked) {
      await this.unlikeLyric(userId, lyricId);
    } else {
      await this.likeLyric(userId, lyricId);
    }

    const newCount = await this.getLikeCount(lyricId);
    return { liked: !currentlyLiked, count: newCount };
  },

  // Check if a lyric is liked by a specific user
  async isLyricLiked(userId: string, lyricId: string): Promise<boolean> {
    if (!userId || !lyricId) return false;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId) || !isSupabaseConfigured()) {
      return isLocalLiked(userId, lyricId);
    }

    try {
      const { data, error } = await supabase
        .from('lyric_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('lyric_id', lyricId)
        .maybeSingle();

      if (error) {
        if (isTableMissingError(error)) {
          return isLocalLiked(userId, lyricId);
        }
        return isLocalLiked(userId, lyricId);
      }

      return !!data;
    } catch (e) {
      return isLocalLiked(userId, lyricId);
    }
  },

  // Get total like count for a single lyric
  async getLikeCount(lyricId: string): Promise<number> {
    if (!isSupabaseConfigured() || !lyricId) return 0;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId)) return 0;

    try {
      const { count, error } = await supabase
        .from('lyric_likes')
        .select('*', { count: 'exact', head: true })
        .eq('lyric_id', lyricId);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (e) {
      return 0;
    }
  },

  // Batch fetch like counts for an array of lyric IDs
  async getLikeCounts(lyricIds: string[]): Promise<Record<string, number>> {
    const countsMap: Record<string, number> = {};
    if (!isSupabaseConfigured() || lyricIds.length === 0) return countsMap;

    try {
      const { data, error } = await supabase
        .from('lyric_likes')
        .select('lyric_id')
        .in('lyric_id', lyricIds);

      if (error) return countsMap;

      if (data) {
        for (const row of data) {
          countsMap[row.lyric_id] = (countsMap[row.lyric_id] || 0) + 1;
        }
      }
    } catch (e) {
      return countsMap;
    }

    return countsMap;
  },

  // Get all lyrics liked by a user
  async getUserLikedLyrics(userId: string): Promise<Lyric[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('lyric_likes')
        .select('lyric_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          return [];
        }
        throw new Error(`Failed to load liked lyrics: ${error.message}`);
      }

      if (!data || data.length === 0) return [];

      const lyricIds = data.map((item) => item.lyric_id);
      const lyricsPromises = lyricIds.map((id) => lyricsService.getLyricById(id, userId));
      const results = await Promise.all(lyricsPromises);
      const validLyrics = results.filter((l): l is Lyric => l !== null);

      return validLyrics.map((lyric) => ({
        ...lyric,
        is_liked: true,
      }));
    } catch (e) {
      return [];
    }
  },
};
