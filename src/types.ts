export type ContentType = 'Lyric' | 'Poetry' | 'Quote' | 'Excerpt' | 'Song Verse';

export type MoodType =
  | 'Love'
  | 'Heartbreak'
  | 'Happy'
  | 'Sad'
  | 'Romantic'
  | 'Melancholic'
  | 'Nostalgic'
  | 'Motivational'
  | 'Peaceful'
  | 'Hopeful'
  | 'Energetic'
  | 'Dark'
  | 'Dreamy'
  | 'Late Night';

export type ThemeType =
  | 'Love'
  | 'Heartbreak'
  | 'Memories'
  | 'Life'
  | 'Friendship'
  | 'Dreams'
  | 'Motivation'
  | 'Freedom'
  | 'Night'
  | 'Rain'
  | 'Solitude'
  | 'Time';

export type TranslationType = 'transliteration' | 'translation';

export interface LyricTranslation {
  id: string;
  lyric_id: string;
  target_language: string; // e.g. 'Hinglish (Roman Hindi)', 'Roman Bengali (Banglish)', 'Roman Assamese', 'Roman Urdu', 'English'
  translation_type: TranslationType;
  translated_title?: string;
  translated_content: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface Lyric {
  id: string;
  title: string;
  content: string; // The core lyric text with line breaks
  content_type: ContentType;
  author_name?: string; // Optional author/poet name
  song_title?: string; // Optional music metadata
  artist_name?: string; // Optional music metadata
  album_name?: string; // Optional music metadata
  language?: string;
  genre?: string;
  song_link?: string; // Optional URL to YouTube, Spotify, Apple Music, etc.
  song_links?: string[]; // Multiple URLs to streaming platforms
  mood?: MoodType | '';
  themes: ThemeType[];
  description?: string; // Optional personal commentary
  cover_url?: string; // Optional image artwork
  visibility: 'public' | 'private' | 'unlisted';
  created_by: {
    name: string;
    handle: string;
    avatar?: string;
    userId?: string;
  };
  created_at: string;
  updated_at: string;
  likes_count: number;
  saves_count: number;
  is_liked?: boolean;
  is_saved?: boolean;
  translations?: LyricTranslation[];
}

export interface Collection {
  id: string;
  user_id?: string;
  title: string;
  name?: string;
  description: string;
  cover_gradient?: string;
  cover_image?: string;
  cover_url?: string;
  privacy?: 'public' | 'private';
  lyric_ids: string[];
  created_by: {
    name: string;
    handle: string;
    avatar?: string;
  };
  is_curated?: boolean;
  item_count: number;
  created_at: string;
  updated_at?: string;
}

export interface UserProfile {
  name: string;
  handle: string;
  bio: string;
  avatar: string;
  joined: string;
  saved_count: number;
  likes_count: number;
  collections_count: number;
}

export interface UserProfileData {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at?: string;
}

export interface LyricAnnotation {
  id: string;
  user_id: string;
  lyric_id: string;
  selected_text: string;
  start_position: number;
  end_position: number;
  note: string;
  created_at: string;
  updated_at: string;
}

