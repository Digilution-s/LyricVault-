import React, { useState, useEffect } from 'react';
import { LyricCard } from '../components/LyricCard';
import { EmptyState } from '../components/EmptyState';
import { Lyric } from '../types';
import { Library, Bookmark, Feather, PlusCircle, LogIn, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { lyricsService } from '../services/lyricsService';

interface LibraryViewProps {
  lyrics: Lyric[];
  onSelectLyric: (lyric: Lyric) => void;
  onSelectCreator?: (username: string) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onOpenCreateModal: () => void;
  onOpenLogin: () => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  onEditLyric?: (lyric: Lyric) => void;
  onDeleteLyric?: (lyric: Lyric) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  lyrics,
  onSelectLyric,
  onSelectCreator,
  onToggleLike,
  onToggleSave,
  onOpenCreateModal,
  onOpenLogin,
  onOpenAddToCollection,
  onOpenReadingMode,
  onEditLyric,
  onDeleteLyric,
}) => {
  const { isAuthenticated, user, profile } = useAuth();
  const [activeSubtab, setActiveSubtab] = useState<'saved' | 'created'>('saved');
  const [myAdditions, setMyAdditions] = useState<Lyric[]>([]);
  const [isLoadingAdditions, setIsLoadingAdditions] = useState(false);

  // Load user additions directly from Supabase
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setIsLoadingAdditions(true);
      lyricsService
        .getUserLyrics(user.id)
        .then((userLyrics) => {
          setMyAdditions(userLyrics);
        })
        .catch((err) => {
          console.error('Error fetching user additions:', err);
        })
        .finally(() => {
          setIsLoadingAdditions(false);
        });
    } else {
      setMyAdditions([]);
    }
  }, [isAuthenticated, user?.id, lyrics]);

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto inline-flex items-center justify-center p-4 rounded-3xl bg-[#8B2F4A]/10 text-[#8B2F4A] dark:text-[#E06C88]">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
          Your Personal Library
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          Log in or create a free account to access your bookmarked lyrics and saved additions across all devices.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            id="library-login-cta"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#8B2F4A] px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
          >
            <LogIn className="h-4 w-4" />
            <span>Log In to Your Vault</span>
          </button>
        </div>
      </div>
    );
  }

  const savedLyrics = lyrics.filter((l) => l.is_saved);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
            <Library className="h-4 w-4" />
            <span>Personal Vault</span>
          </div>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Your Lyric Library
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            A sanctuary for the lyrics and words you've chosen to remember.
          </p>
        </div>

        <button
          id="library-save-new-button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Save New Words</span>
        </button>
      </div>

      {/* Subtab navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-color)] pb-2 text-xs sm:text-sm">
        <button
          id="subtab-saved"
          onClick={() => setActiveSubtab('saved')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-medium transition-all ${
            activeSubtab === 'saved'
              ? 'bg-[#8B2F4A]/10 text-[#8B2F4A] font-semibold dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Bookmark className="h-4 w-4" />
          <span>Saved Lyrics ({savedLyrics.length})</span>
        </button>

        <button
          id="subtab-created"
          onClick={() => setActiveSubtab('created')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-medium transition-all ${
            activeSubtab === 'created'
              ? 'bg-[#8B2F4A]/10 text-[#8B2F4A] font-semibold dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Feather className="h-4 w-4" />
          <span>My Additions ({myAdditions.length})</span>
        </button>
      </div>

      {/* Content grid or empty state */}
      {activeSubtab === 'saved' ? (
        savedLyrics.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedLyrics.map((lyric) => (
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
          <EmptyState
            title="Your saved library is empty"
            description="Bookmarked lyrics will automatically gather here so you can revisit them anytime."
            actionText="Save a Lyric Now"
            onAction={onOpenCreateModal}
            icon="bookmark"
          />
        )
      ) : isLoadingAdditions ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-xs text-[var(--text-secondary)]">
          <Loader2 className="h-6 w-6 animate-spin text-[#8B2F4A] dark:text-[#E06C88]" />
          <span>Loading your additions from vault...</span>
        </div>
      ) : myAdditions.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {myAdditions.map((lyric) => (
            <LyricCard
              key={lyric.id}
              lyric={lyric}
              onSelectLyric={onSelectLyric}
              onSelectCreator={onSelectCreator}
              onToggleLike={(e, id) => {
                onToggleLike(e, id);
                setMyAdditions((prev) =>
                  prev.map((l) => {
                    if (l.id === id) {
                      const newLiked = !l.is_liked;
                      return {
                        ...l,
                        is_liked: newLiked,
                        likes_count: newLiked ? (l.likes_count ?? 0) + 1 : Math.max(0, (l.likes_count ?? 1) - 1),
                      };
                    }
                    return l;
                  })
                );
              }}
              onToggleSave={(e, id) => {
                onToggleSave(e, id);
                setMyAdditions((prev) =>
                  prev.map((l) => {
                    if (l.id === id) {
                      const newSaved = !l.is_saved;
                      return {
                        ...l,
                        is_saved: newSaved,
                        saves_count: newSaved ? (l.saves_count ?? 0) + 1 : Math.max(0, (l.saves_count ?? 1) - 1),
                      };
                    }
                    return l;
                  })
                );
              }}
              onOpenAddToCollection={onOpenAddToCollection}
              onOpenReadingMode={onOpenReadingMode}
              onEditLyric={onEditLyric}
              onDeleteLyric={onDeleteLyric}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="You haven't saved any additions yet"
          description="Add your favorite stanzas, quotes, or original words to build your vault."
          actionText="Save a Lyric Now"
          onAction={onOpenCreateModal}
          icon="bookmark"
        />
      )}
    </div>
  );
};
