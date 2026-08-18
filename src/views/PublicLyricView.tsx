import React, { useState, useEffect } from 'react';
import {
  Feather,
  Music,
  Heart,
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
import { detectMusicPlatform, parseSongLinks } from '../utils/musicPlatform';
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

  const handleLikeClick = (e: React.MouseEvent) => {
    if (!user) {
      if (onOpenAuthPrompt) onOpenAuthPrompt();
      return;
    }
    onToggleLike(e, lyric.id);
    setLyric((prev) => {
      if (!prev) return prev;
      const willLike = !prev.is_liked;
      return {
        ...prev,
        is_liked: willLike,
        likes_count: willLike ? (prev.likes_count ?? 0) + 1 : Math.max(0, (prev.likes_count ?? 1) - 1),
      };
    });
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    if (!user) {
      if (onOpenAuthPrompt) onOpenAuthPrompt();
      return;
    }
    onToggleSave(e, lyric.id);
    setLyric((prev) => {
      if (!prev) return prev;
      const willSave = !prev.is_saved;
      return {
        ...prev,
        is_saved: willSave,
        saves_count: willSave ? (prev.saves_count ?? 0) + 1 : Math.max(0, (prev.saves_count ?? 1) - 1),
      };
    });
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

        {/* Streaming & Music Platforms (All Available Links) */}
        {(() => {
          const allMusicLinks = parseSongLinks(lyric.song_link, lyric.song_links);
          if (allMusicLinks.length === 0) return null;

          return (
            <div className="border-t border-[var(--border-color)]/60 pt-5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <Music className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88]" />
                <span>Listen / Streaming Links ({allMusicLinks.length})</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {allMusicLinks.map((url, idx) => {
                  const pConfig = detectMusicPlatform(url);
                  return (
                    <a
                      key={idx}
                      id={`public-lyric-platform-link-${idx}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-xs hover:opacity-95 active:scale-95 cursor-pointer ${pConfig.brandBg}`}
                      title={pConfig.label}
                    >
                      <Music className="h-3.5 w-3.5 shrink-0" />
                      <span>{pConfig.name}</span>
                      <ExternalLink className="h-3 w-3 opacity-75 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Primary Action Buttons Bar */}
        <div className="border-t border-[var(--border-color)] pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left Group: Engagement Actions (Like, Save, Collection) */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <button
                id="public-lyric-like-button"
                type="button"
                onClick={handleLikeClick}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                  lyric.is_liked
                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50 shadow-xs'
                    : 'bg-[var(--bg-muted)]/70 text-[var(--text-primary)] border-[var(--border-color)] hover:border-rose-400 hover:text-rose-600'
                }`}
                title={`Like (${lyric.likes_count ?? 0})`}
              >
                <Heart className={`h-4 w-4 ${lyric.is_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{lyric.likes_count ?? 0}</span>
              </button>

              <button
                id="public-lyric-bookmark-button"
                type="button"
                onClick={handleBookmarkClick}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                  lyric.is_saved
                    ? 'bg-[#8B2F4A] text-white border-[#8B2F4A] dark:bg-[#E06C88] dark:text-zinc-950 dark:border-[#E06C88] shadow-xs'
                    : 'bg-[var(--bg-muted)]/70 text-[var(--text-primary)] border-[var(--border-color)] hover:border-[#8B2F4A]'
                }`}
                title={`Save to Vault (${lyric.saves_count ?? 0})`}
              >
                <Bookmark className={`h-4 w-4 ${lyric.is_saved ? 'fill-current' : ''}`} />
                <span>{lyric.saves_count ?? 0}</span>
              </button>

              <button
                id="public-lyric-collection-button"
                type="button"
                onClick={handleOpenCollectionClick}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--bg-muted)]/70 px-4 text-xs font-semibold text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[#8B2F4A] transition-all cursor-pointer active:scale-95"
                title="Add to Collection"
              >
                <FolderPlus className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88]" />
                <span>Collection</span>
              </button>
            </div>

            {/* Right Group: Reader, Card Creator & Share */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              {onOpenReadingMode && lyric && (
                <button
                  id="public-lyric-reading-mode-button"
                  type="button"
                  onClick={() => onOpenReadingMode(lyric)}
                  className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#8B2F4A]/10 text-[#8B2F4A] hover:bg-[#8B2F4A] hover:text-white dark:bg-[#E06C88]/15 dark:text-[#E06C88] dark:hover:bg-[#E06C88] dark:hover:text-zinc-950 px-4 text-xs font-semibold border border-[#8B2F4A]/30 transition-all cursor-pointer active:scale-95"
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span>Reading Mode</span>
                </button>
              )}

              <button
                id="public-lyric-create-card-button"
                type="button"
                onClick={() => setIsCardStudioOpen(true)}
                className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#8B2F4A] text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 px-4 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>Create Card</span>
              </button>

              <button
                id="public-lyric-share-button"
                type="button"
                onClick={() => setIsShareOpen(true)}
                className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--bg-muted)]/70 hover:bg-[#8B2F4A]/10 text-[var(--text-primary)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] px-4 text-xs font-semibold border border-[var(--border-color)] hover:border-[#8B2F4A] transition-all cursor-pointer active:scale-95"
              >
                <Share2 className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88] shrink-0" />
                <span>Share</span>
              </button>
            </div>
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
