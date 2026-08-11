import React, { useState } from 'react';
import { Database, CheckCircle2, AlertTriangle, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const SupabaseStatusBanner: React.FC = () => {
  const isConnected = isSupabaseConfigured();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const sqlSchema = `-- Run this in your Supabase SQL Editor:
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

CREATE TABLE IF NOT EXISTS public.themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lyric_themes (
  lyric_id UUID REFERENCES public.lyrics(id) ON DELETE CASCADE,
  theme_id TEXT REFERENCES public.themes(id) ON DELETE CASCADE,
  PRIMARY KEY (lyric_id, theme_id)
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  lyric_id UUID REFERENCES public.lyrics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_lyric_bookmark UNIQUE (user_id, lyric_id)
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-b border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-2.5 text-xs transition-all">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88]" />
          <span className="font-semibold text-[var(--text-primary)]">Supabase Engine:</span>
          {isConnected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" /> Live Supabase Database Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" /> Active Persisted Store (Set VITE_SUPABASE_URL in .env to connect remote DB)
            </span>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <span>SQL Schema & Tables Setup</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mx-auto max-w-7xl mt-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Supabase PostgreSQL Schema (`/supabase/schema.sql`)</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Tables: <code className="font-mono bg-[var(--bg-muted)] px-1 rounded">lyrics</code>,{' '}
                <code className="font-mono bg-[var(--bg-muted)] px-1 rounded">themes</code>,{' '}
                <code className="font-mono bg-[var(--bg-muted)] px-1 rounded">lyric_themes</code>,{' '}
                <code className="font-mono bg-[var(--bg-muted)] px-1 rounded">bookmarks</code>
              </p>
            </div>
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <pre className="max-h-40 overflow-y-auto rounded-xl bg-zinc-950 p-3 text-[11px] font-mono text-zinc-200">
            {sqlSchema}
          </pre>
        </div>
      )}
    </div>
  );
};
