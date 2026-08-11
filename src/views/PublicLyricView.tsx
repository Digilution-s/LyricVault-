import React, { useState, useEffect } from 'react';
import {
  Feather,
  Music,
  Bookmark,
  Share2,
  FolderPlus,
  ArrowLeft,
  Lock,
  AlertCircle,
  ExternalLink,
  Quote,
  Sparkles,
  Calendar,
  Globe,
  BookOpen,
} from 'lucide-react';
import { Lyric } from '../types';
import { lyricsService } from '../services/lyricsService';
import { detectMusicPlatform } from '../utils/musicPlatform';
import { CreatorLink } from '../components/CreatorLink';
import { ShareModal } from '../components/ShareModal';
import { LyricCardStudio } from '../components/LyricCardStudio';
import { useAuth } from '../hooks/useAuth';

interface PublicLyricViewProps {
  lyricId: string;
  onSelectCreator: (username: string) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  onNavigateDiscover: () => void;
  onOpenAuthPrompt?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublicLyricView: React.FC<PublicLyricViewProps> = ({
  lyricId,
  onSelectCreator,
  onToggleLike,
  onToggleSave,
  onOpenAddToCollection,
  onOpenReadingMode,
  onNavigateDiscover,
  onOpenAuthPrompt,
  showToast,
}) => {
  const { user } = useAuth();
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isCardStudioOpen, setIsCardStudioOpen] = useState<boolean>(false);

  const fetchLyric = async () => {
    setIsLoading(true);
    setNotFound(false);

    try {
      const fetchedLyric = await lyricsService.getLyricById(lyricId, user?.id);
      if (!fetchedLyric) {
        setNotFound(true);
      } else {
        setLyric(fetchedLyric);
      }
    } catch (err) {
      console.error('Error fetching public lyric:', err);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (lyricId) {
      fetchLyric();
    }
  }, [lyricId, user?.id]);

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8 animate-pulse">
        <div className="h-6 w-32 bg-[var(--bg-muted)] rounded-lg" />
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-10 space-y-6">
          <div className="h-8 w-3/4 bg-[var(--bg-muted)] rounded-lg" />
          <div className="h-4 w-1/2 bg-[var(--bg-muted)] rounded-lg" />
          <div className="h-40 w-full bg-[var(--bg-muted)]/60 rounded-2xl" />
          <div className="h-12 w-full max-w-sm bg-[var(--bg-muted)] rounded-2xl" />
        </div>
      </div>
    );
  }

  // Not Found state
  if (notFound || !lyric) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto inline-flex items-center justify-center p-4 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
          Lyric not found
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          This lyric may have been removed or the link might be incorrect.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            id="public-lyric-not-found-back"
            onClick={onNavigateDiscover}
            className="inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Discover</span>
          </button>
        </div>
      </div>
    );
  }

  // Private Protection check
  const isOwner = user?.id && lyric.created_by?.userId === user.id;
  const isPrivate = lyric.visibility === 'private';

  if (isPrivate && !isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6 animate-fadeIn">
        <div className="mx-auto inline-flex items-center justify-center p-4 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
          This lyric is private.
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          The creator has set this lyric to private. Only the creator can view this content.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            id="private-lyric-back-discover"
            onClick={onNavigateDiscover}
            className="inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Discover</span>
          </button>
        </div>
      </div>
    );
  }

  // Detect Music Platform details
  const platform = detectMusicPlatform(lyric.song_link);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    if (!user) {
      if (onOpenAuthPrompt) onOpenAuthPrompt();
      return;
    }
    onToggleSave(e, lyric.id);
    setLyric((prev) => (prev ? { ...prev, is_saved: !prev.is_saved } : prev));
  };

  const handleOpenCollectionClick = () => {
    if (!user) {
      if (onOpenAuthPrompt) onOpenAuthPrompt();
      return;
    }
    if (onOpenAddToCollection) onOpenAddToCollection(lyric);
  };

  const formattedDate = lyric.created_at
    ? new Date(lyric.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8 animate-fadeIn">
      {/* Back Button */}
      <button
        id="public-lyric-back-button"
        onClick={onNavigateDiscover}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Discover</span>
      </button>

      {/* Main Lyric Container */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-10 shadow-xs space-y-8 relative overflow-hidden">
        {/* Header Metadata */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-[11px] font-semibold text-[#8B2F4A] dark:text-[#E06C88]">
                {lyric.content_type || 'Lyric'}
              </span>
              <span className="rounded-full bg-[var(--bg-muted)]/80 px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                {lyric.mood}
              </span>
              {lyric.genre && (
                <span className="rounded-full bg-[var(--bg-muted)]/80 px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {lyric.genre}
                </span>
              )}
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight">
              {lyric.title}
            </h1>

            {(lyric.song_title || lyric.artist_name) && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium">
                <Music className="h-4 w-4 text-[#8B2F4A] shrink-0" />
                <span>
                  {lyric.song_title || 'Untitled Song'}{' '}
                  {lyric.artist_name && <strong className="text-[var(--text-primary)]">by {lyric.artist_name}</strong>}
                  {lyric.album_name && <span className="opacity-75"> • {lyric.album_name}</span>}
                </span>
              </div>
            )}

            {/* Creator Attribution */}
            {lyric.created_by?.handle && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pt-1">
                <span>Created by</span>
                <CreatorLink
                  handle={lyric.created_by.handle}
                  name={lyric.created_by.name}
                  avatar={lyric.created_by.avatar}
                  showAvatar
                  onClickCreator={onSelectCreator}
                />
                {formattedDate && (
                  <span className="opacity-60 flex items-center gap-1 ml-2">
                    <Calendar className="h-3 w-3" />
                    {formattedDate}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cover Art if available */}
          {lyric.cover_url && (
            <img
              src={lyric.cover_url}
              alt={lyric.title}
              className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl object-cover border border-[var(--border-color)] shadow-md shrink-0"
            />
          )}
        </div>

        {/* Lyric Content Body */}
        <div className="rounded-2xl bg-[var(--bg-muted)]/30 border border-[var(--border-color)]/60 p-6 sm:p-8 relative">
          <Quote className="absolute top-4 right-4 h-8 w-8 text-[#8B2F4A]/10 pointer-events-none" />
          <div className="font-editorial text-lg sm:text-xl text-[var(--text-primary)] leading-relaxed whitespace-pre-line tracking-wide">
            {lyric.content}
          </div>
        </div>

        {/* Description / Story if available */}
        {lyric.description && (
          <div className="space-y-1.5 text-xs text-[var(--text-secondary)] bg-[var(--bg-muted)]/20 p-4 rounded-xl border border-[var(--border-color)]/40">
            <span className="font-semibold text-[var(--text-primary)] block">Creator's Note</span>
            <p className="italic leading-relaxed">{lyric.description}</p>
          </div>
        )}

        {/* Themes List */}
        {lyric.themes && lyric.themes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-color)]/60 pt-4">
            <span className="text-xs font-semibold text-[var(--text-secondary)] mr-1">Themes:</span>
            {lyric.themes.map((theme) => (
              <span
                key={theme}
                className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border-color)]/40"
              >
                #{theme}
              </span>
            ))}
          </div>
        )}

        {/* Primary Action Buttons Bar */}
        <div className="border-t border-[var(--border-color)] pt-6 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Music Platform Button */}
          {lyric.song_link ? (
            <a
              id="public-lyric-open-music-link"
              href={lyric.song_link}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2.5 rounded-2xl px-5 py-3 text-xs font-bold transition-all shadow-xs ${platform.brandBg}`}
              title={platform.label}
            >
              <Music className="h-4 w-4 shrink-0" />
              <span>{platform.label}</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </a>
          ) : (
            <div className="text-xs text-[var(--text-secondary)] italic">
              No direct music link provided.
            </div>
          )}

          {/* Right: Actions (Bookmark, Collection, Share) */}
          <div className="flex items-center gap-3">
            <button
              id="public-lyric-bookmark-button"
              type="button"
              onClick={handleBookmarkClick}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold border transition-all ${
                lyric.is_saved
                  ? 'bg-[#8B2F4A] text-white border-[#8B2F4A]'
                  : 'bg-[var(--bg-muted)]/60 text-[var(--text-primary)] border-[var(--border-color)] hover:border-[#8B2F4A]'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${lyric.is_saved ? 'fill-current' : ''}`} />
              <span>{lyric.is_saved ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <button
              id="public-lyric-collection-button"
              type="button"
              onClick={handleOpenCollectionClick}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--bg-muted)]/60 px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[#8B2F4A] transition-all"
            >
              <FolderPlus className="h-4 w-4 text-[#8B2F4A]" />
              <span className="hidden sm:inline">Add to Collection</span>
            </button>

            {onOpenReadingMode && lyric && (
              <button
                id="public-lyric-reading-mode-button"
                type="button"
                onClick={() => onOpenReadingMode(lyric)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#8B2F4A]/10 text-[#8B2F4A] hover:bg-[#8B2F4A] hover:text-white dark:bg-[#E06C88]/20 dark:text-[#E06C88] dark:hover:bg-[#E06C88] dark:hover:text-zinc-950 px-4 py-2.5 text-xs font-bold border border-[#8B2F4A]/30 transition-all"
              >
                <BookOpen className="h-4 w-4" />
                <span>Reading Mode</span>
              </button>
            )}

            <button
              id="public-lyric-create-card-button"
              type="button"
              onClick={() => setIsCardStudioOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#8B2F4A] text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 px-4 py-2.5 text-xs font-bold shadow-sm transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Create Card</span>
            </button>

            <button
              id="public-lyric-share-button"
              type="button"
              onClick={() => setIsShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--bg-muted)]/60 px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[#8B2F4A] transition-all"
            >
              <Share2 className="h-4 w-4 text-[#8B2F4A]" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        lyric={lyric}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        showToast={showToast}
      />

      {/* Lyric Card Studio */}
      <LyricCardStudio
        isOpen={isCardStudioOpen}
        onClose={() => setIsCardStudioOpen(false)}
        lyric={lyric}
        showToast={showToast}
      />
    </div>
  );
};
