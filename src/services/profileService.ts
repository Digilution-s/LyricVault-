import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfileData } from '../types';

export const profileService = {
  // Fetch profile by User ID
  async getProfile(userId: string): Promise<UserProfileData | null> {
    if (!isSupabaseConfigured() || !userId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile from Supabase:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      avatar_url: data.avatar_url || data.profile_picture || undefined,
      bio: data.bio || undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || undefined,
    };
  },

  // Fetch profile by Username (case-insensitive)
  async getProfileByUsername(username: string): Promise<UserProfileData | null> {
    if (!isSupabaseConfigured() || !username) return null;
    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUsername) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile by username from Supabase:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      avatar_url: data.avatar_url || data.profile_picture || undefined,
      bio: data.bio || undefined,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || undefined,
    };
  },

  // Get public lyrics created by a user profile (visibility = public strictly)
  async getPublicUserLyrics(profileId: string, currentUserId?: string) {
    if (!isSupabaseConfigured() || !profileId) return [];

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
      .eq('created_by', profileId)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getPublicUserLyrics error:', error.message);
      return [];
    }

    if (!data) return [];

    const formattedLyrics = await Promise.all(
      data.map(async (row) => {
        const { data: themeData } = await supabase
          .from('lyric_themes')
          .select('theme_id')
          .eq('lyric_id', row.id);

        const themesList = (themeData || []).map((t) => t.theme_id as any);

        const { count: bookmarkCount } = await supabase
          .from('bookmarks')
          .select('*', { count: 'exact', head: true })
          .eq('lyric_id', row.id);

        let isSaved = false;
        if (currentUserId) {
          const { data: bookmarkRow } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('lyric_id', row.id)
            .maybeSingle();
          if (bookmarkRow) isSaved = true;
        }

        const creator = row.profiles || {};
        const creatorName = creator.display_name || row.author_name || 'LyricVault Creator';
        const creatorHandle = creator.username ? `@${creator.username}` : '@creator';

        return {
          id: row.id,
          title: row.title,
          content: row.content,
          content_type: row.content_type || 'Lyric',
          author_name: row.author_name,
          song_title: row.song_title,
          artist_name: row.artist_name,
          album_name: row.album_name,
          language: row.language || 'English',
          genre: row.genre,
          song_link: row.song_link,
          mood: row.mood || 'Melancholic',
          description: row.description,
          cover_url: row.cover_url,
          visibility: row.visibility || 'public',
          created_by: {
            name: creatorName,
            handle: creatorHandle,
            avatar: creator.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            userId: row.created_by,
          },
          created_at: row.created_at || new Date().toISOString(),
          updated_at: row.updated_at || new Date().toISOString(),
          likes_count: 0,
          saves_count: bookmarkCount || 0,
          themes: themesList.length > 0 ? themesList : ['Night'],
          is_saved: isSaved,
          is_liked: false,
        };
      })
    );

    return formattedLyrics;
  },

  // Get statistics for a public profile (strictly count public lyrics only)
  async getPublicProfileStats(profileId: string): Promise<{ publicLyricsCount: number }> {
    if (!isSupabaseConfigured() || !profileId) return { publicLyricsCount: 0 };

    const { count, error } = await supabase
      .from('lyrics')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', profileId)
      .eq('visibility', 'public');

    if (error) {
      console.error('Error fetching public profile stats:', error.message);
      return { publicLyricsCount: 0 };
    }

    return { publicLyricsCount: count || 0 };
  },

  // Check if username exists
  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const cleanUsername = username.trim().toLowerCase();
    if (!isSupabaseConfigured() || !cleanUsername) return false;

    let query = supabase
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error checking username availability:', error.message);
      return false;
    }

    return !!(data && data.length > 0);
  },

  // Create or Update Profile
  async createProfile(payload: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    bio?: string;
  }): Promise<UserProfileData> {
    const cleanUsername = payload.username.trim().toLowerCase();

    // Check uniqueness
    const taken = await this.isUsernameTaken(cleanUsername, payload.id);
    if (taken) {
      throw new Error('This username is already taken.');
    }

    // Try to update existing profile first (if created by trigger)
    const { data: updatedData, error: updateError } = await supabase
      .from('profiles')
      .update({
        username: cleanUsername,
        display_name: payload.display_name.trim() || 'LyricVault Creator',
        avatar_url: payload.avatar_url || null,
        bio: payload.bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .select('*')
      .maybeSingle();

    if (updatedData) {
      return {
        id: updatedData.id,
        username: updatedData.username,
        display_name: updatedData.display_name,
        avatar_url: updatedData.avatar_url || undefined,
        bio: updatedData.bio || undefined,
        created_at: updatedData.created_at || new Date().toISOString(),
      };
    }

    // If update returned nothing (e.g., trigger hasn't fired or row doesn't exist), try insert
    const { data: insertedData, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: payload.id,
        username: cleanUsername,
        display_name: payload.display_name.trim() || 'LyricVault Creator',
        avatar_url: payload.avatar_url || null,
        bio: payload.bio || null,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('Supabase profile creation error:', insertError.message);
      // If error is duplicate key on ID or RLS, try fetching profile one last time
      const fetched = await this.getProfile(payload.id);
      if (fetched) return fetched;
      throw new Error(`Failed to save user profile: ${insertError.message}`);
    }

    return {
      id: insertedData.id,
      username: insertedData.username,
      display_name: insertedData.display_name,
      avatar_url: insertedData.avatar_url || undefined,
      bio: insertedData.bio || undefined,
      created_at: insertedData.created_at || new Date().toISOString(),
    };
  },

  // Update Profile
  async updateProfile(
    userId: string,
    updates: { display_name?: string; username?: string; bio?: string; avatar_url?: string }
  ): Promise<UserProfileData> {
    if (updates.username) {
      const taken = await this.isUsernameTaken(updates.username, userId);
      if (taken) {
        throw new Error('This username is already taken.');
      }
    }

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.display_name !== undefined) payload.display_name = updates.display_name;
    if (updates.username !== undefined) payload.username = updates.username.trim().toLowerCase();
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.avatar_url !== undefined) {
      payload.avatar_url = updates.avatar_url;
      payload.profile_picture = updates.avatar_url;
    }

    let { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('*')
      .single();

    // If profile_picture column does not exist yet in table schema, retry without it
    if (error && error.message && error.message.toLowerCase().includes('profile_picture')) {
      delete payload.profile_picture;
      const retry = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    // Conversely, if avatar_url column does not exist, retry with profile_picture only
    if (error && error.message && error.message.toLowerCase().includes('avatar_url')) {
      delete payload.avatar_url;
      if (updates.avatar_url !== undefined) payload.profile_picture = updates.avatar_url;
      const retry = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Supabase update profile error:', error.message);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      avatar_url: data.avatar_url || data.profile_picture || undefined,
      bio: data.bio || undefined,
      created_at: data.created_at || new Date().toISOString(),
    };
  },
};
