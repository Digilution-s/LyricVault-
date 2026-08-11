import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { lyricsService } from './lyricsService';
import { Lyric } from '../types';

export const bookmarkService = {
  // Bookmark a lyric
  async bookmarkLyric(userId: string, lyricId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    if (!userId || !lyricId) return false;

    // Guard against non-UUID strings
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId)) {
      console.error('bookmarkLyric rejected non-UUID lyricId:', lyricId);
      throw new Error('Invalid lyric ID format.');
    }

    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: userId, lyric_id: lyricId });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - already bookmarked
        return true;
      }
      console.error('Supabase bookmark error:', error.message);
      throw new Error(`Failed to bookmark lyric: ${error.message}`);
    }

    return true;
  },

  // Remove a bookmark
  async unbookmarkLyric(userId: string, lyricId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    if (!userId || !lyricId) return false;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId)) {
      return true; // nothing to unbookmark
    }

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .match({ user_id: userId, lyric_id: lyricId });

    if (error) {
      console.error('Supabase unbookmark error:', error.message);
      throw new Error(`Failed to remove bookmark: ${error.message}`);
    }

    return true;
  },

  // Check if a lyric is bookmarked by user
  async isLyricBookmarked(userId: string, lyricId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !userId || !lyricId) return false;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId)) return false;

    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('lyric_id', lyricId)
      .maybeSingle();

    if (error) {
      console.error('Error checking bookmark status:', error.message);
      return false;
    }

    return !!data;
  },

  // Get total bookmark count for a lyric
  async getLyricBookmarkCount(lyricId: string): Promise<number> {
    if (!isSupabaseConfigured() || !lyricId) return 0;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(lyricId)) return 0;

    const { count, error } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('lyric_id', lyricId);

    if (error) {
      console.error('Error getting bookmark count:', error.message);
      return 0;
    }

    return count || 0;
  },

  // Fetch all saved lyrics for a user
  async getUserSavedLyrics(userId: string): Promise<Lyric[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('bookmarks')
      .select('lyric_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user saved lyrics:', error.message);
      throw new Error(`Failed to load saved lyrics: ${error.message}`);
    }

    if (!data || data.length === 0) return [];

    const lyricIds = data.map((b) => b.lyric_id);
    const lyricsPromises = lyricIds.map((id) => lyricsService.getLyricById(id));
    const results = await Promise.all(lyricsPromises);
    const validLyrics = results.filter((l): l is Lyric => l !== null);

    return validLyrics.map((lyric) => ({
      ...lyric,
      is_saved: true,
    }));
  },
};
