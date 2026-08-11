-- ============================================================================
-- Migration: Create Lyric Annotations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lyric_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lyric_id UUID NOT NULL REFERENCES public.lyrics(id) ON DELETE CASCADE,
  selected_text TEXT NOT NULL,
  start_position INTEGER NOT NULL,
  end_position INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lyric_annotations_user_id ON public.lyric_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_lyric_annotations_lyric_id ON public.lyric_annotations(lyric_id);
CREATE INDEX IF NOT EXISTS idx_lyric_annotations_user_lyric ON public.lyric_annotations(user_id, lyric_id);

-- Enable Row Level Security
ALTER TABLE public.lyric_annotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own annotations" ON public.lyric_annotations;
DROP POLICY IF EXISTS "Users can create their own annotations" ON public.lyric_annotations;
DROP POLICY IF EXISTS "Users can update their own annotations" ON public.lyric_annotations;
DROP POLICY IF EXISTS "Users can delete their own annotations" ON public.lyric_annotations;

-- RLS Policies
CREATE POLICY "Users can view their own annotations"
  ON public.lyric_annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own annotations"
  ON public.lyric_annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own annotations"
  ON public.lyric_annotations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
  ON public.lyric_annotations FOR DELETE
  USING (auth.uid() = user_id);
