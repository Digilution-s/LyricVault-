import React, { useState } from 'react';
import { Heart, Bookmark, Music, Quote, Sparkles, Share2, Feather, ExternalLink, Globe, FolderPlus, Trash2, Pencil, Lock, BookOpen } from 'lucide-react';
import { Lyric } from '../types';
import { MOODS } from '../data/demoData';
import { CreatorLink } from './CreatorLink';
import { detectMusicPlatform, parseSongLinks } from '../utils/musicPlatform';
import { ShareModal } from './ShareModal';

interface LyricCardProps {
  lyric: Lyric;
  onSelectLyric: (lyric: Lyric) => void;
  onToggleLike: (e: React.MouseEvent, lyricId: string) => void;
  onToggleSave: (e: React.MouseEvent, lyricId: string) => void;
  onSelectCreator?: (username: string) => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  onRemoveFromCollection?: (lyricId: string) => void;
  onEditLyric?: (lyric: Lyric) => void;
  onDeleteLyric?: (lyric: Lyric) => void;
}

export const LyricCard: React.FC<LyricCardProps> = ({
  lyric,
  onSelectLyric,
  onToggleLike,
  onToggleSave,
  onSelectCreator,
  onOpenAddToCollection,
  onOpenReadingMode,
  onRemoveFromCollection,
  onEditLyric,
  onDeleteLyric,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const moodObj = MOODS.find((m) => m.id === lyric.mood);

  // Format short preview (first 2-3 lines max)
  const lines = lyric.content.split('\n').filter(Boolean);
  const previewText = lines.slice(0, 3).join('\n');
  const hasMore = lines.length > 3;

  // Metadata calculations
  const songName = lyric.song_title || lyric.title;
  const artistName = lyric.artist_name || lyric.author_name;
  const allLinks = parseSongLinks(lyric.song_link, lyric.song_links);

  return (
    <div
      id={`lyric-card-${lyric.id}`}
      onClick={() => onSelectLyric(lyric)}
      className="group relative flex flex-col justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#8B2F4A]/30 hover:shadow-md cursor-pointer overflow-hidden w-full"
    >
      {/* Top Header Meta */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Content Type & Visibility Badge */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 font-sans-ui text-[11px] font-semibold text-[var(--text-secondary)] shrink-0">
              {lyric.content_type === 'Lyric' || lyric.content_type === 'Song Verse' ? (
                <Music className="h-3 w-3 text-[#8B2F4A] dark:text-[#E06C88]" />
              ) : lyric.content_type === 'Quote' ? (
                <Quote className="h-3 w-3 text-[#8B2F4A] dark:text-[#E06C88]" />
              ) : (
                <Feather className="h-3 w-3 text-[#8B2F4A] dark:text-[#E06C88]" />
              )}
              {lyric.content_type}
            </span>

            {lyric.visibility === 'private' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Lock className="h-2.5 w-2.5" />
                <span>Private</span>
              </span>
            )}
          </div>

          {/* Mood Badge */}
          {moodObj && (
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium shrink-0 ${moodObj.color}`}
            >
              <span>{moodObj.icon}</span>
              <span>{moodObj.label}</span>
            </span>
          )}
        </div>

        {/* 1. Song Name + Artist Name */}
        <div className="mt-3.5 truncate font-editorial text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[#8B2F4A] dark:group-hover:text-[#E06C88] transition-colors">
          <span>{songName}</span>
          {artistName && (
            <span className="font-sans-ui text-xs sm:text-sm font-normal text-[var(--text-secondary)] ml-1.5">
              by {artistName}
            </span>
          )}
        </div>

        {/* 2. Lyrics Content Preview */}
        <div className="mt-2.5 relative">
          <p className="font-editorial text-sm sm:text-base italic leading-relaxed text-[var(--text-primary)]/90 whitespace-pre-line tracking-wide break-words">
            "{previewText}"
            {hasMore && <span className="not-italic text-[var(--text-secondary)] font-normal"> ...</span>}
          </p>
        </div>

        {/* 3. Language + Music Platform Links */}
        {(lyric.language || allLinks.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            {lyric.language && (
              <span className="rounded bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)] shrink-0">
                {lyric.language}
              </span>
            )}
            {allLinks.map((url, idx) => {
              const platform = detectMusicPlatform(url);
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-medium border ${platform.color} hover:opacity-80 transition-opacity shrink-0`}
                  title={platform.label}
                >
                  <Music className="h-2.5 w-2.5 shrink-0" />
                  <span>{platform.name}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                </a>
              );
            })}
          </div>
        )}

        {/* 4. Created by @username */}
        {lyric.created_by?.handle && (
          <div
            className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-[var(--text-secondary)] font-sans-ui truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="shrink-0">Created by</span>
            {onSelectCreator ? (
              <CreatorLink
                handle={lyric.created_by.handle}
                name={lyric.created_by.name}
                avatar={lyric.created_by.avatar}
                onClickCreator={onSelectCreator}
              />
            ) : (
              <span className="font-medium text-[var(--text-primary)] truncate">
                {lyric.created_by.name ? `${lyric.created_by.name} (${lyric.created_by.handle})` : lyric.created_by.handle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Footer Actions & Tags */}
      <div className="mt-4 pt-3 border-t border-[var(--border-color)]/60 flex flex-wrap items-center justify-between gap-2 w-full overflow-hidden">
        {/* Themes tags */}
        {lyric.themes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 max-w-full">
            {lyric.themes.slice(0, 2).map((theme) => (
              <span
                key={theme}
                className="rounded-md bg-[var(--bg-muted)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] shrink-0"
              >
                #{theme}
              </span>
            ))}
          </div>
        )}

        {/* Interaction Buttons */}
        <div className="flex flex-wrap items-center gap-1 ml-auto max-w-full" onClick={(e) => e.stopPropagation()}>
          {/* Like Button */}
          <button
            id={`like-button-${lyric.id}`}
            onClick={(e) => onToggleLike(e, lyric.id)}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors shrink-0 ${
              lyric.is_liked
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-rose-600'
            }`}
            title="Like"
          >
            <Heart
              className={`h-3.5 w-3.5 transition-transform active:scale-125 ${
                lyric.is_liked ? 'fill-rose-500 text-rose-500' : ''
              }`}
            />
            <span className="font-medium text-[11px]">{lyric.likes_count}</span>
          </button>

          {/* Bookmark / Save Button */}
          <button
            id={`bookmark-button-${lyric.id}`}
            onClick={(e) => onToggleSave(e, lyric.id)}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors shrink-0 ${
              lyric.is_saved
                ? 'bg-[#8B2F4A]/10 text-[#8B2F4A] font-semibold dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[#8B2F4A]'
            }`}
            title={lyric.is_saved ? 'Saved in Library' : 'Save to Library'}
          >
            <Bookmark
              className={`h-3.5 w-3.5 transition-transform active:scale-125 ${
                lyric.is_saved ? 'fill-[#8B2F4A] text-[#8B2F4A] dark:fill-[#E06C88] dark:text-[#E06C88]' : ''
              }`}
            />
            <span className="font-medium text-[11px]">
              {lyric.is_saved ? 'Saved' : 'Save'}
            </span>
          </button>

          {/* Reading Mode Button */}
          {onOpenReadingMode && (
            <button
              id={`card-reading-mode-button-${lyric.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenReadingMode(lyric);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-[var(--text-secondary)] hover:bg-[#8B2F4A]/10 hover:text-[#8B2F4A] dark:hover:bg-[#E06C88]/20 dark:hover:text-[#E06C88] transition-all active:scale-90 shrink-0 cursor-pointer"
              title="Enter Reading Mode"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
            </button>
          )}

          {/* Add to Collection Button */}
          {onOpenAddToCollection && (
            <button
              id={`add-to-collection-button-${lyric.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenAddToCollection(lyric);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-all active:scale-90 shrink-0 cursor-pointer"
              title="Add to Collection"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Share Button */}
          <button
            id={`share-lyric-button-${lyric.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsShareOpen(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-all active:scale-90 shrink-0 cursor-pointer"
            title="Share Lyric"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>

          {/* Edit Button */}
          {onEditLyric && (
            <button
              id={`edit-lyric-button-${lyric.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onEditLyric(lyric);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-all active:scale-90 shrink-0 cursor-pointer"
              title="Edit Lyric"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete Button */}
          {onDeleteLyric && (
            <button
              id={`delete-lyric-button-${lyric.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLyric(lyric);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90 shrink-0 cursor-pointer"
              title="Delete Lyric"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Remove from Collection Button */}
          {onRemoveFromCollection && (
            <button
              id={`remove-from-collection-button-${lyric.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromCollection(lyric.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
              title="Remove from this collection"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <ShareModal
        lyric={lyric}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
};
