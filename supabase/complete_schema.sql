-- LyricVault Supabase Database Schema Migration
-- Strictly preserves existing user accounts, real lyrics, bookmarks, and collections.

-- ============================================================================
-- 1. DROP DEPENDENT RLS POLICIES FOR SAFE ALTERATIONS
-- ============================================================================
DROP POLICY IF EXISTS "Public lyrics are viewable by everyone" ON public.lyrics;
DROP POLICY IF EXISTS "Users can insert their own lyrics" ON public.lyrics;
DROP POLICY IF EXISTS "Users can update their own lyrics" ON public.lyrics;
DROP POLICY IF EXISTS "Users can delete their own lyrics" ON public.lyrics;

DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;

DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON public.collections;
DROP POLICY IF EXISTS "Users can create their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON public.collections;

DROP POLICY IF EXISTS "View collection lyrics if collection is accessible" ON public.collection_lyrics;
DROP POLICY IF EXISTS "Users can add lyrics to their own collections" ON public.collection_lyrics;
DROP POLICY IF EXISTS "Users can remove lyrics from their own collections" ON public.collection_lyrics;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- ============================================================================
-- 2. CREATE BASE TABLES (IF THEY DO NOT ALREADY EXIST)
-- ============================================================================

-- PROFILES TABLE (Linked directly to auth.users.id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_min_length CHECK (char_length(username) >= 3),
  CONSTRAINT username_format CHECK (username ~* '^[a-zA-Z0-9_]+$')
);

-- LYRICS TABLE
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
  song_link TEXT,
  visibility TEXT DEFAULT 'public',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- THEMES TABLE
CREATE TABLE IF NOT EXISTS public.themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LYRIC THEMES JOIN TABLE
CREATE TABLE IF NOT EXISTS public.lyric_themes (
  lyric_id UUID REFERENCES public.lyrics(id) ON DELETE CASCADE,
  theme_id TEXT REFERENCES public.themes(id) ON DELETE CASCADE,
  PRIMARY KEY (lyric_id, theme_id)
);

-- BOOKMARKS TABLE
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lyric_id UUID NOT NULL REFERENCES public.lyrics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lyric_bookmark UNIQUE (user_id, lyric_id)
);

-- COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  name TEXT,
  description TEXT,
  cover_url TEXT,
  cover_gradient TEXT DEFAULT 'from-rose-950 via-pink-950 to-slate-950',
  privacy TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COLLECTION LYRICS JOIN TABLE
CREATE TABLE IF NOT EXISTS public.collection_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  lyric_id UUID NOT NULL REFERENCES public.lyrics(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_collection_lyric UNIQUE (collection_id, lyric_id)
);

-- ============================================================================
-- 3. SAFE COLUMN ALTERATIONS & TYPE CONVERSIONS
-- ============================================================================
DO $$
BEGIN
  -- Add missing columns to lyrics if table pre-existed
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS cover_url TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS song_link TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS genre TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'Lyric';
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS author_name TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS song_title TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS artist_name TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS album_name TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS mood TEXT;
  ALTER TABLE public.lyrics ADD COLUMN IF NOT EXISTS created_by UUID;

  -- Add missing columns to collections if table pre-existed
  ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS title TEXT;
  ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS cover_gradient TEXT DEFAULT 'from-rose-950 via-pink-950 to-slate-950';
  ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public';

  -- Drop existing foreign keys involving lyrics.created_by before conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'lyrics' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'lyrics_created_by_fkey'
  ) THEN
    ALTER TABLE public.lyrics DROP CONSTRAINT lyrics_created_by_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'lyrics' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'lyrics_created_by_profiles_fkey'
  ) THEN
    ALTER TABLE public.lyrics DROP CONSTRAINT lyrics_created_by_profiles_fkey;
  END IF;

  -- Drop existing foreign keys involving collections.user_id before conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'collections' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'collections_user_id_fkey'
  ) THEN
    ALTER TABLE public.collections DROP CONSTRAINT collections_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'collections' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'collections_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.collections DROP CONSTRAINT collections_user_id_profiles_fkey;
  END IF;

  -- Convert profiles.id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.profiles ALTER COLUMN id TYPE UUID USING id::uuid;
  END IF;

  -- Convert lyrics.created_by to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'lyrics' AND column_name = 'created_by' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.lyrics ALTER COLUMN created_by DROP DEFAULT;
    ALTER TABLE public.lyrics ALTER COLUMN created_by TYPE UUID USING (
      CASE 
        WHEN created_by::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN created_by::uuid 
        ELSE NULL 
      END
    );
  END IF;

  -- Convert lyrics.id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'lyrics' AND column_name = 'id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.lyrics ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.lyrics ALTER COLUMN id TYPE UUID USING (
      CASE 
        WHEN id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN id::uuid 
        ELSE NULL 
      END
    );
    ALTER TABLE public.lyrics ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- Convert bookmarks.user_id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'user_id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.bookmarks ALTER COLUMN user_id DROP DEFAULT;
    ALTER TABLE public.bookmarks ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
  END IF;

  -- Convert bookmarks.lyric_id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'bookmarks' AND column_name = 'lyric_id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.bookmarks ALTER COLUMN lyric_id DROP DEFAULT;
    ALTER TABLE public.bookmarks ALTER COLUMN lyric_id TYPE UUID USING lyric_id::uuid;
  END IF;

  -- Convert collections.user_id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'user_id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.collections ALTER COLUMN user_id DROP DEFAULT;
    ALTER TABLE public.collections ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
  END IF;

  -- Convert collections.id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'collections' AND column_name = 'id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.collections ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.collections ALTER COLUMN id TYPE UUID USING id::uuid;
    ALTER TABLE public.collections ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;

  -- Convert collection_lyrics.collection_id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'collection_lyrics' AND column_name = 'collection_id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.collection_lyrics ALTER COLUMN collection_id DROP DEFAULT;
    ALTER TABLE public.collection_lyrics ALTER COLUMN collection_id TYPE UUID USING collection_id::uuid;
  END IF;

  -- Convert collection_lyrics.lyric_id to UUID if TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'collection_lyrics' AND column_name = 'lyric_id' AND data_type LIKE '%text%'
  ) THEN
    ALTER TABLE public.collection_lyrics ALTER COLUMN lyric_id DROP DEFAULT;
    ALTER TABLE public.collection_lyrics ALTER COLUMN lyric_id TYPE UUID USING lyric_id::uuid;
  END IF;
END $$;

-- ============================================================================
-- 4. BACKFILL PROFILES FOR EXISTING AUTH USERS BEFORE FOREIGN KEY CREATION
-- ============================================================================
INSERT INTO public.profiles (id, username, display_name, avatar_url)
SELECT 
  u.id,
  LOWER(COALESCE(NULLIF(u.raw_user_meta_data->>'username', ''), 'user_' || SUBSTRING(replace(u.id::text, '-', ''), 1, 8))),
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', 'LyricVault Creator'),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. RE-ESTABLISH EXPLICIT FOREIGN KEYS FOR POSTGREST SCHEMA CACHE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'lyrics' AND constraint_name = 'lyrics_created_by_profiles_fkey'
  ) THEN
    ALTER TABLE public.lyrics ADD CONSTRAINT lyrics_created_by_profiles_fkey 
      FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'collections' AND constraint_name = 'collections_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE public.collections ADD CONSTRAINT collections_user_id_profiles_fkey 
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Case-insensitive unique index on profiles username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(LOWER(username));

-- ============================================================================
-- 6. INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_lyrics_created_by ON public.lyrics(created_by);
CREATE INDEX IF NOT EXISTS idx_lyrics_visibility ON public.lyrics(visibility);
CREATE INDEX IF NOT EXISTS idx_lyrics_created_at ON public.lyrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_lyric_id ON public.bookmarks(lyric_id);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_privacy ON public.collections(privacy);

CREATE INDEX IF NOT EXISTS idx_collection_lyrics_collection_id ON public.collection_lyrics(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_lyrics_lyric_id ON public.collection_lyrics(lyric_id);

CREATE INDEX IF NOT EXISTS idx_lyric_themes_lyric_id ON public.lyric_themes(lyric_id);
CREATE INDEX IF NOT EXISTS idx_lyric_themes_theme_id ON public.lyric_themes(theme_id);

-- ============================================================================
-- 7. RECREATE ROW LEVEL SECURITY (RLS) POLICIES SAFELY
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lyric_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_lyrics ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- LYRICS POLICIES
CREATE POLICY "Public lyrics are viewable by everyone" ON public.lyrics;
CREATE POLICY "Public lyrics are viewable by everyone" ON public.lyrics
  FOR SELECT USING (
    visibility = 'public' 
    OR (created_by IS NOT NULL AND auth.uid()::text = created_by::text)
    OR created_by IS NULL
  );

CREATE POLICY "Users can insert their own lyrics" ON public.lyrics
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (created_by IS NULL OR auth.uid()::text = created_by::text)
  );

CREATE POLICY "Users can update their own lyrics" ON public.lyrics
  FOR UPDATE USING (created_by IS NOT NULL AND auth.uid()::text = created_by::text);

CREATE POLICY "Users can delete their own lyrics" ON public.lyrics
  FOR DELETE USING (created_by IS NOT NULL AND auth.uid()::text = created_by::text);

-- THEMES & LYRIC THEMES POLICIES
DROP POLICY IF EXISTS "Themes are viewable by everyone" ON public.themes;
CREATE POLICY "Themes are viewable by everyone" ON public.themes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lyric themes are viewable by everyone" ON public.lyric_themes;
CREATE POLICY "Lyric themes are viewable by everyone" ON public.lyric_themes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can link themes" ON public.lyric_themes;
CREATE POLICY "Authenticated users can link themes" ON public.lyric_themes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- BOOKMARKS POLICIES
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can create their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- COLLECTIONS POLICIES
CREATE POLICY "Public collections are viewable by everyone" ON public.collections;
CREATE POLICY "Public collections are viewable by everyone" ON public.collections
  FOR SELECT USING (privacy = 'public' OR auth.uid()::text = user_id::text);

CREATE POLICY "Users can create their own collections" ON public.collections;
CREATE POLICY "Users can create their own collections" ON public.collections
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own collections" ON public.collections;
CREATE POLICY "Users can update their own collections" ON public.collections
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own collections" ON public.collections;
CREATE POLICY "Users can delete their own collections" ON public.collections
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- COLLECTION LYRICS POLICIES
CREATE POLICY "View collection lyrics if collection is accessible" ON public.collection_lyrics;
CREATE POLICY "View collection lyrics if collection is accessible" ON public.collection_lyrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id::text = collection_id::text 
      AND (c.privacy = 'public' OR c.user_id::text = auth.uid()::text)
    )
  );

CREATE POLICY "Users can add lyrics to their own collections" ON public.collection_lyrics;
CREATE POLICY "Users can add lyrics to their own collections" ON public.collection_lyrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id::text = collection_id::text 
      AND c.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can remove lyrics from their own collections" ON public.collection_lyrics;
CREATE POLICY "Users can remove lyrics from their own collections" ON public.collection_lyrics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id::text = collection_id::text 
      AND c.user_id::text = auth.uid()::text
    )
  );

-- ============================================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_username TEXT;
  clean_username TEXT;
BEGIN
  raw_username := NEW.raw_user_meta_data->>'username';
  
  IF raw_username IS NULL OR char_length(trim(raw_username)) < 3 THEN
    clean_username := 'user_' || SUBSTRING(replace(NEW.id::text, '-', ''), 1, 8);
  ELSE
    clean_username := LOWER(trim(raw_username));
  END IF;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    clean_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'LyricVault Creator'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. SEED INITIAL THEMES
-- ============================================================================
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

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
