import React, { useState } from 'react';
import { Hero } from '../components/Hero';
import { LyricCard } from '../components/LyricCard';
import { MoodChip } from '../components/MoodChip';
import { ThemeCard } from '../components/ThemeCard';
import { CollectionCard } from '../components/CollectionCard';
import { Lyric, Collection, MoodType, ThemeType, ContentType } from '../types';
import { calculateTrendingScore } from '../services/lyricsService';
import { MOODS, THEMES } from '../data/demoData';
import { TrendingUp, Clock, Sparkles, FolderHeart, ArrowRight, Hash } from 'lucide-react';

interface HomeViewProps {
  lyrics: Lyric[];
  collections: Collection[];
  onSelectLyric: (lyric: Lyric) => void;
  onSelectCreator?: (username: string) => void;
  onSelectCollection: (col: Collection) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  onLyricCreated: (newLyric: Lyric) => void;
  onNavigateTab: (tab: string, filterMood?: MoodType, filterTheme?: ThemeType) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  lyrics,
  collections,
  onSelectLyric,
  onSelectCreator,
  onSelectCollection,
  onToggleLike,
  onToggleSave,
  onOpenAddToCollection,
  onOpenReadingMode,
  onLyricCreated,
  onNavigateTab,
  showToast,
}) => {
  // Homepage Moods specified in prompt: Love, Heartbreak, Happy, Sad, Nostalgic, Motivational, Peaceful, Late Night
  const homeMoods: MoodType[] = [
    'Love',
    'Heartbreak',
    'Happy',
    'Sad',
    'Nostalgic',
    'Motivational',
    'Peaceful',
    'Late Night',
  ];

  // Homepage Themes specified in prompt: Love, Memories, Life, Friendship, Dreams, Breakup, Motivation, Freedom
  const homeThemes: ThemeType[] = [
    'Love',
    'Memories',
    'Life',
    'Friendship',
    'Dreams',
    'Breakup' as ThemeType,
    'Motivation',
    'Freedom',
  ];

  // Trending lyrics (public lyrics sorted by exact Trending Score formula)
  const publicLyrics = lyrics.filter((l) => l.visibility === 'public' || !l.visibility);
  const trendingLyrics = [...publicLyrics]
    .sort((a, b) => {
      const scoreA = calculateTrendingScore(a.likes_count, a.saves_count, a.created_at);
      const scoreB = calculateTrendingScore(b.likes_count, b.saves_count, b.created_at);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 6);

  // Recently saved lyrics
  const recentLyrics = [...lyrics].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

  return (
    <div className="space-y-16 pb-28 sm:pb-16">
      {/* Hero Section */}
      <Hero
        onLyricCreated={onLyricCreated}
        showToast={showToast}
        onExploreClick={() => {
          const section = document.getElementById('trending-lyrics-section');
          section?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Trending Lyrics Section */}
        <section id="trending-lyrics-section" className="space-y-6">
          <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
                <TrendingUp className="h-4 w-4" />
                <span>Most Remembered</span>
              </div>
              <h2 className="mt-1 font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Trending Lyrics
              </h2>
            </div>

            <button
              id="view-all-trending-button"
              onClick={() => onNavigateTab('discover')}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-colors"
            >
              <span>Explore All</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {trendingLyrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {trendingLyrics.map((lyric) => (
                <LyricCard
                  key={lyric.id}
                  lyric={lyric}
                  onSelectLyric={onSelectLyric}
                  onSelectCreator={onSelectCreator}
                  onToggleLike={onToggleLike}
                  onToggleSave={onToggleSave}
                  onOpenAddToCollection={onOpenAddToCollection}
                  onOpenReadingMode={onOpenReadingMode}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]/50 p-10 text-center space-y-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">No lyrics yet</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Use the box above to save the first lyric into your Supabase database.
              </p>
            </div>
          )}
        </section>

        {/* Recently Saved Section */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
                <Clock className="h-4 w-4" />
                <span>Freshly Added</span>
              </div>
              <h2 className="mt-1 font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Recently Saved
              </h2>
            </div>

            <button
              id="view-all-recent-button"
              onClick={() => onNavigateTab('discover')}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-colors"
            >
              <span>See More</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {recentLyrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recentLyrics.map((lyric) => (
                <LyricCard
                  key={lyric.id}
                  lyric={lyric}
                  onSelectLyric={onSelectLyric}
                  onSelectCreator={onSelectCreator}
                  onToggleLike={onToggleLike}
                  onToggleSave={onToggleSave}
                  onOpenAddToCollection={onOpenAddToCollection}
                  onOpenReadingMode={onOpenReadingMode}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]/50 p-10 text-center space-y-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">Your vault is ready</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Save your favorite verses, poetry, or quotes to build your shared collection.
              </p>
            </div>
          )}
        </section>

        {/* Browse by Mood */}
        <section className="space-y-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Emotional Spectrum</span>
            </div>
            <h2 className="mt-1 font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Browse by Mood
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Find words that echo how you feel right now.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {homeMoods.map((mId) => (
              <MoodChip
                key={mId}
                moodId={mId}
                onClick={(m) => onNavigateTab('discover', m, undefined)}
              />
            ))}
          </div>
        </section>

        {/* Browse by Theme */}
        <section className="space-y-6">
          <div className="border-b border-[var(--border-color)] pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
              <Hash className="h-4 w-4" />
              <span>Topics & Subjects</span>
            </div>
            <h2 className="mt-1 font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Browse by Theme
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {homeThemes.map((tId) => (
              <ThemeCard
                key={tId}
                themeId={tId}
                onClick={(t) => onNavigateTab('discover', undefined, t)}
              />
            ))}
          </div>
        </section>

        {/* Popular Collections */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b border-[var(--border-color)] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
                <FolderHeart className="h-4 w-4" />
                <span>Curated Anthologies</span>
              </div>
              <h2 className="mt-1 font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Popular Collections
              </h2>
            </div>

            <button
              id="view-all-collections-button"
              onClick={() => onNavigateTab('collections')}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-colors"
            >
              <span>All Collections</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onClick={onSelectCollection}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
