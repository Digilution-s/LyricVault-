import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Collection, Lyric } from '../types';

export const collectionService = {
  // Fetch collections (public or belonging to user) from Supabase
  async getCollections(userId?: string): Promise<Collection[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabase
      .from('collections')
      .select(`
        id,
        user_id,
        title,
        name,
        description,
        cover_url,
        cover_gradient,
        privacy,
        created_at,
        updated_at,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        ),
        collection_lyrics (
          lyric_id
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`privacy.eq.public,user_id.eq.${userId}`);
    } else {
      query = query.eq('privacy', 'public');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching collections from Supabase:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => {
      const lyricIds = Array.isArray(row.collection_lyrics)
        ? row.collection_lyrics.map((cl: any) => cl.lyric_id)
        : [];
      const creator = row.profiles || {};

      return {
        id: row.id,
        user_id: row.user_id,
        title: row.title || row.name || 'Untitled Collection',
        name: row.name || row.title || 'Untitled Collection',
        description: row.description || '',
        cover_gradient: row.cover_gradient || 'from-rose-950 via-pink-950 to-slate-950',
        cover_image: row.cover_url || undefined,
        cover_url: row.cover_url || undefined,
        privacy: row.privacy as 'public' | 'private',
        lyric_ids: lyricIds,
        created_by: {
          name: creator.display_name || 'LyricVault Creator',
          handle: creator.username ? `@${creator.username}` : '@creator',
          avatar: creator.avatar_url || undefined,
        },
        item_count: lyricIds.length,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || undefined,
      };
    });
  },

  // Fetch collections owned exclusively by a specific user
  async getUserCollections(userId: string): Promise<Collection[]> {
    if (!isSupabaseConfigured() || !userId) return [];

    const { data, error } = await supabase
      .from('collections')
      .select(`
        id,
        user_id,
        title,
        name,
        description,
        cover_url,
        cover_gradient,
        privacy,
        created_at,
        updated_at,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        ),
        collection_lyrics (
          lyric_id
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user collections:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => {
      const lyricIds = Array.isArray(row.collection_lyrics)
        ? row.collection_lyrics.map((cl: any) => cl.lyric_id)
        : [];
      const creator = row.profiles || {};

      return {
        id: row.id,
        user_id: row.user_id,
        title: row.title || row.name || 'Untitled Collection',
        name: row.name || row.title || 'Untitled Collection',
        description: row.description || '',
        cover_gradient: row.cover_gradient || 'from-rose-950 via-pink-950 to-slate-950',
        cover_image: row.cover_url || undefined,
        cover_url: row.cover_url || undefined,
        privacy: row.privacy as 'public' | 'private',
        lyric_ids: lyricIds,
        created_by: {
          name: creator.display_name || 'LyricVault Creator',
          handle: creator.username ? `@${creator.username}` : '@creator',
          avatar: creator.avatar_url || undefined,
        },
        item_count: lyricIds.length,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || undefined,
      };
    });
  },

  // Fetch collection details by ID
  async getCollectionById(collectionId: string, userId?: string): Promise<Collection | null> {
    if (!isSupabaseConfigured() || !collectionId) return null;

    const { data, error } = await supabase
      .from('collections')
      .select(`
        id,
        user_id,
        title,
        name,
        description,
        cover_url,
        cover_gradient,
        privacy,
        created_at,
        updated_at,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        ),
        collection_lyrics (
          lyric_id,
          position,
          created_at
        )
      `)
      .eq('id', collectionId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('Error fetching collection by ID:', error.message);
      return null;
    }

    // Security / Privacy check: Private collections only viewable by owner
    if (data.privacy === 'private' && data.user_id !== userId) {
      return null;
    }

    const sortedCL = Array.isArray(data.collection_lyrics)
      ? [...data.collection_lyrics].sort((a, b) => (a.position - b.position) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      : [];

    const lyricIds = sortedCL.map((cl: any) => cl.lyric_id);
    const creator: any = (data as any).profiles || {};

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title || data.name || 'Untitled Collection',
      name: data.name || data.title || 'Untitled Collection',
      description: data.description || '',
      cover_gradient: data.cover_gradient || 'from-rose-950 via-pink-950 to-slate-950',
      cover_image: data.cover_url || undefined,
      cover_url: data.cover_url || undefined,
      privacy: data.privacy as 'public' | 'private',
      lyric_ids: lyricIds,
      created_by: {
        name: creator.display_name || 'LyricVault Creator',
        handle: creator.username ? `@${creator.username}` : '@creator',
        avatar: creator.avatar_url || undefined,
      },
      item_count: lyricIds.length,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || undefined,
    };
  },

  // Create Collection in Supabase
  async createCollection(payload: {
    userId: string;
    title: string;
    description?: string;
    coverGradient?: string;
    coverUrl?: string;
    privacy?: 'public' | 'private';
    initialLyricIds?: string[];
    userHandle?: string;
    displayName?: string;
  }): Promise<Collection> {
    const title = payload.title.trim();
    if (!title) throw new Error('Collection title is required.');
    if (!payload.userId) throw new Error('User ID is required to create a collection.');

    const { data: newCol, error: colError } = await supabase
      .from('collections')
      .insert({
        user_id: payload.userId,
        title: title,
        name: title,
        description: payload.description?.trim() || null,
        cover_gradient: payload.coverGradient || 'from-rose-950 via-pink-950 to-slate-950',
        cover_url: payload.coverUrl?.trim() || null,
        privacy: payload.privacy || 'public',
      })
      .select(`
        *,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (colError) {
      console.error('Supabase collection insert error:', colError.message);
      throw new Error(`Failed to create collection: ${colError.message}`);
    }

    let lyricIds: string[] = [];
    if (payload.initialLyricIds && payload.initialLyricIds.length > 0) {
      const relationRows = payload.initialLyricIds.map((lyricId, idx) => ({
        collection_id: newCol.id,
        lyric_id: lyricId,
        position: idx,
      }));

      const { error: relError } = await supabase
        .from('collection_lyrics')
        .insert(relationRows);

      if (relError) {
        console.error('Error inserting collection lyrics:', relError.message);
      } else {
        lyricIds = payload.initialLyricIds;
      }
    }

    const creator = newCol.profiles || {};

    return {
      id: newCol.id,
      user_id: newCol.user_id,
      title: newCol.title || newCol.name,
      name: newCol.name || newCol.title,
      description: newCol.description || '',
      cover_gradient: newCol.cover_gradient || 'from-rose-950 via-pink-950 to-slate-950',
      cover_image: newCol.cover_url || undefined,
      cover_url: newCol.cover_url || undefined,
      privacy: newCol.privacy as 'public' | 'private',
      lyric_ids: lyricIds,
      created_by: {
        name: creator.display_name || payload.displayName || 'LyricVault Creator',
        handle: creator.username ? `@${creator.username}` : (payload.userHandle || '@creator'),
        avatar: creator.avatar_url || undefined,
      },
      item_count: lyricIds.length,
      created_at: newCol.created_at || new Date().toISOString(),
    };
  },

  // Update Collection
  async updateCollection(
    collectionId: string,
    updates: {
      title?: string;
      name?: string;
      description?: string;
      cover_gradient?: string;
      cover_url?: string;
      privacy?: 'public' | 'private';
    }
  ): Promise<Collection> {
    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.title !== undefined) {
      payload.title = updates.title.trim();
      payload.name = updates.title.trim();
    }
    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.cover_gradient !== undefined) payload.cover_gradient = updates.cover_gradient;
    if (updates.cover_url !== undefined) payload.cover_url = updates.cover_url.trim() || null;
    if (updates.privacy !== undefined) payload.privacy = updates.privacy;

    const { data, error } = await supabase
      .from('collections')
      .update(payload)
      .eq('id', collectionId)
      .select(`
        *,
        profiles (
          id,
          username,
          display_name,
          avatar_url
        ),
        collection_lyrics (
          lyric_id
        )
      `)
      .single();

    if (error) {
      console.error('Error updating collection:', error.message);
      throw new Error(`Failed to update collection: ${error.message}`);
    }

    const lyricIds = Array.isArray(data.collection_lyrics)
      ? data.collection_lyrics.map((cl: any) => cl.lyric_id)
      : [];
    const creator = data.profiles || {};

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title || data.name,
      name: data.name || data.title,
      description: data.description || '',
      cover_gradient: data.cover_gradient || 'from-rose-950 via-pink-950 to-slate-950',
      cover_image: data.cover_url || undefined,
      cover_url: data.cover_url || undefined,
      privacy: data.privacy as 'public' | 'private',
      lyric_ids: lyricIds,
      created_by: {
        name: creator.display_name || 'LyricVault Creator',
        handle: creator.username ? `@${creator.username}` : '@creator',
        avatar: creator.avatar_url || undefined,
      },
      item_count: lyricIds.length,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  // Delete Collection
  async deleteCollection(collectionId: string): Promise<void> {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', collectionId);

    if (error) {
      console.error('Error deleting collection:', error.message);
      throw new Error(`Failed to delete collection: ${error.message}`);
    }
  },

  // Add Lyric to Collection
  async addLyricToCollection(collectionId: string, lyricId: string): Promise<void> {
    // Check if already in collection to prevent unnecessary insert
    const alreadyIn = await this.isLyricInCollection(collectionId, lyricId);
    if (alreadyIn) return;

    const { error } = await supabase
      .from('collection_lyrics')
      .insert({
        collection_id: collectionId,
        lyric_id: lyricId,
        position: 0,
      });

    if (error && error.code !== '23505') {
      console.error('Error adding lyric to collection:', error.message);
      throw new Error(`Failed to add lyric to collection: ${error.message}`);
    }
  },

  // Remove Lyric from Collection
  async removeLyricFromCollection(collectionId: string, lyricId: string): Promise<void> {
    const { error } = await supabase
      .from('collection_lyrics')
      .delete()
      .eq('collection_id', collectionId)
      .eq('lyric_id', lyricId);

    if (error) {
      console.error('Remove lyric from collection error:', error.message);
      throw new Error(`Failed to remove lyric from collection: ${error.message}`);
    }
  },

  // Get full Lyrics belonging to a collection, ordered by position then created_at
  async getCollectionLyrics(collectionId: string): Promise<Lyric[]> {
    if (!isSupabaseConfigured() || !collectionId) return [];

    const { data: rels, error: relError } = await supabase
      .from('collection_lyrics')
      .select('lyric_id, position, created_at')
      .eq('collection_id', collectionId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (relError || !rels || rels.length === 0) return [];

    const lyricIds = rels.map((r: any) => r.lyric_id);

    const { data: lyricsData, error: lyricsError } = await supabase
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
      .in('id', lyricIds);

    if (lyricsError || !lyricsData) return [];

    const lyricsMap = new Map<string, Lyric>();
    lyricsData.forEach((row: any) => {
      const creator = row.profiles || {};
      lyricsMap.set(row.id, {
        id: row.id,
        title: row.title,
        content: row.content,
        content_type: row.content_type || 'Lyric',
        author_name: row.author_name || undefined,
        song_title: row.song_title || undefined,
        artist_name: row.artist_name || undefined,
        album_name: row.album_name || undefined,
        language: row.language || 'English',
        genre: row.genre || undefined,
        song_link: row.song_link || undefined,
        mood: row.mood || 'Love',
        themes: [],
        description: row.description || undefined,
        cover_url: row.cover_url || undefined,
        visibility: row.visibility || 'public',
        created_by: {
          name: creator.display_name || 'LyricVault Creator',
          handle: creator.username ? `@${creator.username}` : '@creator',
          avatar: creator.avatar_url || undefined,
        },
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at,
        likes_count: 0,
        saves_count: 0,
      });
    });

    return lyricIds.map((id) => lyricsMap.get(id)).filter((l): l is Lyric => Boolean(l));
  },

  // Check if a lyric is in a specific collection
  async isLyricInCollection(collectionId: string, lyricId: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !collectionId || !lyricId) return false;

    const { data } = await supabase
      .from('collection_lyrics')
      .select('id')
      .eq('collection_id', collectionId)
      .eq('lyric_id', lyricId)
      .maybeSingle();

    return Boolean(data);
  },

  // Get user collections containing a given lyric ID
  async getCollectionsContainingLyric(userId: string, lyricId: string): Promise<string[]> {
    if (!isSupabaseConfigured() || !userId || !lyricId) return [];

    const { data: userCols } = await supabase
      .from('collections')
      .select('id')
      .eq('user_id', userId);

    if (!userCols || userCols.length === 0) return [];
    const colIds = userCols.map((c) => c.id);

    const { data: rels } = await supabase
      .from('collection_lyrics')
      .select('collection_id')
      .in('collection_id', colIds)
      .eq('lyric_id', lyricId);

    if (!rels) return [];
    return rels.map((r: any) => r.collection_id);
  },
};
