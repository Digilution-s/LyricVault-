import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LyricAnnotation } from '../types';

const LOCAL_STORAGE_KEY = 'lyricvault_personal_annotations';

// Helper for local storage memory store when Supabase is not configured
const getLocalAnnotations = (): LyricAnnotation[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalAnnotations = (annotations: LyricAnnotation[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(annotations));
  } catch (err) {
    console.error('Failed to save local annotations:', err);
  }
};

export interface CreateAnnotationParams {
  lyricId: string;
  selectedText: string;
  startPosition: number;
  endPosition: number;
  note: string;
  userId?: string;
}

export const annotationService = {
  // Get current authenticated user ID
  async getCurrentUserId(): Promise<string | null> {
    if (isSupabaseConfigured()) {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) return data.user.id;
    }
    // Check local session or demo user
    try {
      const authData = localStorage.getItem('supabase.auth.token') || localStorage.getItem('demo_user');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed?.user?.id) return parsed.user.id;
        if (parsed?.id) return parsed.id;
      }
    } catch {
      // ignore
    }
    return null;
  },

  // Create a new annotation
  async createAnnotation(params: CreateAnnotationParams): Promise<LyricAnnotation> {
    let userId = params.userId;
    if (!userId) {
      userId = (await this.getCurrentUserId()) || undefined;
    }

    if (!userId) {
      throw new Error('User must be authenticated to create an annotation.');
    }

    const cleanSelectedText = params.selectedText.trim();
    const cleanNote = params.note.trim();

    if (!cleanSelectedText) {
      throw new Error('Selected text is required for an annotation.');
    }

    if (!cleanNote) {
      throw new Error('Note content cannot be empty.');
    }

    if (cleanNote.length > 500) {
      throw new Error('Note must not exceed 500 characters.');
    }

    if (!isSupabaseConfigured()) {
      // Local fallback
      const localList = getLocalAnnotations();
      const newAnno: LyricAnnotation = {
        id: `anno_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        user_id: userId,
        lyric_id: params.lyricId,
        selected_text: cleanSelectedText,
        start_position: params.startPosition,
        end_position: params.endPosition,
        note: cleanNote,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveLocalAnnotations([newAnno, ...localList]);
      return newAnno;
    }

    // Supabase DB insertion
    const { data, error } = await supabase
      .from('lyric_annotations')
      .insert({
        user_id: userId,
        lyric_id: params.lyricId,
        selected_text: cleanSelectedText,
        start_position: params.startPosition,
        end_position: params.endPosition,
        note: cleanNote,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase createAnnotation error:', error);
      throw new Error(`Unable to save annotation: ${error.message}`);
    }

    return data as LyricAnnotation;
  },

  // Get annotations for a lyric belonging ONLY to the specified user (or current user)
  async getAnnotationsForLyric(lyricId: string, userId?: string): Promise<LyricAnnotation[]> {
    let targetUserId = userId;
    if (!targetUserId) {
      targetUserId = (await this.getCurrentUserId()) || undefined;
    }

    if (!targetUserId) {
      return [];
    }

    if (!isSupabaseConfigured()) {
      const localList = getLocalAnnotations();
      return localList.filter((a) => a.lyric_id === lyricId && a.user_id === targetUserId);
    }

    const { data, error } = await supabase
      .from('lyric_annotations')
      .select('*')
      .eq('lyric_id', lyricId)
      .eq('user_id', targetUserId)
      .order('start_position', { ascending: true });

    if (error) {
      console.error('Supabase getAnnotationsForLyric error:', error);
      return [];
    }

    return (data as LyricAnnotation[]) || [];
  },

  // Alias for getting user's annotations for a lyric
  async getUserAnnotationsForLyric(lyricId: string, userId: string): Promise<LyricAnnotation[]> {
    return this.getAnnotationsForLyric(lyricId, userId);
  },

  // Update an existing annotation
  async updateAnnotation(annotationId: string, note: string): Promise<LyricAnnotation> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to update an annotation.');
    }

    const cleanNote = note.trim();
    if (!cleanNote) {
      throw new Error('Note content cannot be empty.');
    }

    if (cleanNote.length > 500) {
      throw new Error('Note must not exceed 500 characters.');
    }

    if (!isSupabaseConfigured()) {
      const localList = getLocalAnnotations();
      const index = localList.findIndex((a) => a.id === annotationId && a.user_id === userId);
      if (index === -1) {
        throw new Error('Annotation not found or unauthorized.');
      }
      const updated: LyricAnnotation = {
        ...localList[index],
        note: cleanNote,
        updated_at: new Date().toISOString(),
      };
      localList[index] = updated;
      saveLocalAnnotations(localList);
      return updated;
    }

    const { data, error } = await supabase
      .from('lyric_annotations')
      .update({
        note: cleanNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', annotationId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase updateAnnotation error:', error);
      throw new Error(`Unable to update annotation: ${error.message}`);
    }

    return data as LyricAnnotation;
  },

  // Delete an annotation
  async deleteAnnotation(annotationId: string): Promise<boolean> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('User must be authenticated to delete an annotation.');
    }

    if (!isSupabaseConfigured()) {
      const localList = getLocalAnnotations();
      const filtered = localList.filter((a) => !(a.id === annotationId && a.user_id === userId));
      saveLocalAnnotations(filtered);
      return true;
    }

    const { error } = await supabase
      .from('lyric_annotations')
      .delete()
      .eq('id', annotationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase deleteAnnotation error:', error);
      throw new Error(`Unable to delete annotation: ${error.message}`);
    }

    return true;
  },

  // Get annotation by ID
  async getAnnotationById(annotationId: string): Promise<LyricAnnotation | null> {
    const userId = await this.getCurrentUserId();
    if (!userId) return null;

    if (!isSupabaseConfigured()) {
      const localList = getLocalAnnotations();
      return localList.find((a) => a.id === annotationId && a.user_id === userId) || null;
    }

    const { data, error } = await supabase
      .from('lyric_annotations')
      .select('*')
      .eq('id', annotationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as LyricAnnotation;
  },
};
