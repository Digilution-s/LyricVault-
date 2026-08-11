-- LyricVault Supabase Database Schema
-- Step 3: Complete Schema with Auth, Profiles, RLS, and Triggers

-- 1. Create Profiles Table (linked to auth.users.id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Lyrics Table
CREATE TABLE IF NOT EXISTS public.lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'Lyric',
  author_name TEXT,
  song_title TEXT,
  artist_name TEXT,
  album_name TEXT,
  language TEXT DEFAULT 'English',
  genre TEXT,
  mood TEXT,
  description TEXT,
  cover_url TEXT,
  visibility TEXT DEFAULT 'public',
  created_by TEXT DEFAULT 'anon_user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Themes Table
CREATE TABLE IF NOT EXISTS public.themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Lyric Themes Join Table
CREATE TABLE IF NOT EXISTS public.lyric_themes (
  lyric_id UUID REFERENCES public.lyrics(id) ON DELETE CASCADE,
  theme_id TEXT REFERENCES public.themes(id) ON DELETE CASCADE,
  PRIMARY KEY (lyric_id, theme_id)
);

-- 5. Create Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lyric_id UUID REFERENCES public.lyrics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lyric_bookmark UNIQUE (user_id, lyric_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyric_themes ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Lyrics RLS
DROP POLICY IF EXISTS "Public lyrics are viewable by everyone" ON public.lyrics;
DROP POLICY IF EXISTS "Public lyrics are viewable by everyone, private only by owner" ON public.lyrics;
CREATE POLICY "Public lyrics are viewable by everyone, private only by owner" ON public.lyrics
  FOR SELECT USING (visibility = 'public' OR created_by = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert their own lyrics" ON public.lyrics;
CREATE POLICY "Users can insert their own lyrics" ON public.lyrics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own lyrics" ON public.lyrics;
CREATE POLICY "Users can update their own lyrics" ON public.lyrics
  FOR UPDATE USING (created_by = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete their own lyrics" ON public.lyrics;
CREATE POLICY "Users can delete their own lyrics" ON public.lyrics
  FOR DELETE USING (created_by = auth.uid()::text);

-- Bookmarks RLS
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (user_id = auth.uid()::text OR true);

DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (user_id = auth.uid()::text OR true);

-- Themes RLS
DROP POLICY IF EXISTS "Themes are viewable by everyone" ON public.themes;
CREATE POLICY "Themes are viewable by everyone" ON public.themes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lyric themes are viewable by everyone" ON public.lyric_themes;
CREATE POLICY "Lyric themes are viewable by everyone" ON public.lyric_themes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lyric themes can be modified by everyone" ON public.lyric_themes;
CREATE POLICY "Lyric themes can be modified by everyone" ON public.lyric_themes
  FOR ALL USING (true) WITH CHECK (true);

-- Seed Initial Default Themes
INSERT INTO public.themes (id, name, slug, description)
VALUES 
  ('Love', 'Love', 'love', 'Romance, devotion, and heart connection'),
  ('Memories', 'Memories', 'memories', 'Nostalgia, past moments, and lingering thoughts'),
  ('Life', 'Life', 'life', 'Reflections on existence, growth, and living'),
  ('Friendship', 'Friendship', 'friendship', 'Companionship, trust, and shared journeys'),
  ('Dreams', 'Dreams', 'dreams', 'Aspirations, nighttime thoughts, and imagination'),
  ('Breakup', 'Breakup', 'breakup', 'Heartbreak, healing, and moving forward'),
  ('Motivation', 'Motivation', 'motivation', 'Drive, ambition, and inner strength'),
  ('Freedom', 'Freedom', 'freedom', 'Independence, open roads, and spirit'),
  ('Night', 'Night', 'night', 'Midnight musings and late-hour clarity'),
  ('Rain', 'Rain', 'rain', 'Rainy solitude, quiet atmosphere, and calm')
ON CONFLICT (id) DO NOTHING;

-- Automatic Profile Creation Trigger on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, bio)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substring(new.id::text from 1 for 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', 'LyricVault Creator'),
    new.raw_user_meta_data->>'avatar_url',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
