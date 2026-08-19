import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Bookmark, Copy, Check, Share2, Music, Quote, Feather, Sparkles, User, Calendar, ExternalLink, Globe, Radio, FolderPlus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Lyric, LyricAnnotation, LyricTranslation, TranslationType } from '../types';
import { MOODS } from '../data/demoData';
import { CreatorLink } from './CreatorLink';
import { detectMusicPlatform, parseSongLinks } from '../utils/musicPlatform';
import { ShareModal } from './ShareModal';
import { annotationService } from '../services/annotationService';
import { translationService } from '../services/translationService';
import { LyricTranslationBar } from './LyricTranslationBar';
import { ParallelLyricsView } from './ParallelLyricsView';
import { AnnotatedLyricText } from './AnnotatedLyricText';
import { AnnotationEditorModal } from './AnnotationEditorModal';
import { AnnotationViewModal } from './AnnotationViewModal';
import { AnnotationListSheet } from './AnnotationListSheet';
import { LyricCardStudio } from './LyricCardStudio';
import { useAuth } from '../context/AuthContext';

interface LyricDetailModalProps {
  lyric: Lyric | null;
  onClose: () => void;
  onToggleLike: (e: React.MouseEvent, lyricId: string) => void;
  onToggleSave: (e: React.MouseEvent, lyricId: string) => void;
  onSelectCreator?: (username: string) => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  onEditLyric?: (lyric: Lyric) => void;
  onDeleteLyric?: (lyric: Lyric) => void;
  onOpenAuthPrompt?: (context?: 'save' | 'bookmark' | 'note') => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const getStreamingMeta = (url?: string) => {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('spotify.com')) {
    return { name: 'Listen on Spotify', bgClass: 'bg-[#1DB954] hover:bg-[#1aa34a] text-white' };
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { name: 'Watch on YouTube', bgClass: 'bg-[#FF0000] hover:bg-[#d90000] text-white' };
  }
  if (lower.includes('apple.com')) {
    return { name: 'Listen on Apple Music', bgClass: 'bg-[#FA233B] hover:bg-[#e01b31] text-white' };
  }
  if (lower.includes('soundcloud.com')) {
    return { name: 'Listen on SoundCloud', bgClass: 'bg-[#FF5500] hover:bg-[#e04b00] text-white' };
  }
  return { name: 'Open Song Link', bgClass: 'bg-[#8B2F4A] hover:bg-[#72253c] text-white dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d65775]' };
};

export const LyricDetailModal: React.FC<LyricDetailModalProps> = ({
  lyric,
  onClose,
  onToggleLike,
  onToggleSave,
  onSelectCreator,
  onOpenAddToCollection,
  onOpenReadingMode,
  onEditLyric,
  onDeleteLyric,
  onOpenAuthPrompt,
  showToast,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Personal Annotations State
  const [annotations, setAnnotations] = useState<LyricAnnotation[]>([]);
  const [activeEditorSelection, setActiveEditorSelection] = useState<{
    selectedText: string;
    startPosition: number;
    endPosition: number;
  } | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<LyricAnnotation | null>(null);
  const [viewingAnnotation, setViewingAnnotation] = useState<LyricAnnotation | null>(null);
  const [isNotesSheetOpen, setIsNotesSheetOpen] = useState(false);

  // Lyric Card Studio State
  const [isCardStudioOpen, setIsCardStudioOpen] = useState(false);
  const [cardStudioSelectedText, setCardStudioSelectedText] = useState<string>('');

  // Translation & Transliteration State
  const [availableTranslations, setAvailableTranslations] = useState<LyricTranslation[]>([]);
  const [activeTranslation, setActiveTranslation] = useState<LyricTranslation | null>(null);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState<boolean>(false);
  const [isParallelView, setIsParallelView] = useState<boolean>(false);

  const loadTranslations = useCallback(async () => {
    if (!lyric?.id) return;
    try {
      const list = await translationService.getTranslationsForLyric(lyric.id);
      setAvailableTranslations(list);
    } catch (err) {
      console.error('Failed to load translations in modal:', err);
    }
  }, [lyric?.id]);

  const handleRequestTranslation = async (targetLanguage: string, type: TranslationType) => {
    if (!lyric) return;
    setIsLoadingTranslation(true);
    try {
      const result = await translationService.translateLyric({
        lyricId: lyric.id,
        content: lyric.content,
        title: lyric.title,
        artist: lyric.artist_name,
        sourceLanguage: lyric.language,
        targetLanguage,
        translationType: type,
        userId: user?.id || 'community_user',
      });

      setActiveTranslation(result.translation);
      const updatedList = await translationService.getTranslationsForLyric(lyric.id);
      setAvailableTranslations(updatedList);

      if (result.isCached) {
        showToast?.(`Loaded ${targetLanguage} from community cache!`, 'info');
      } else {
        showToast?.(`Generated & saved ${targetLanguage} to LyricVault translations!`, 'success');
      }
    } catch (err: any) {
      console.error('Translation failed in modal:', err);
      showToast?.(err?.message || 'Failed to translate lyric. Please try again.', 'error');
    } finally {
      setIsLoadingTranslation(false);
    }
  };

  const loadAnnotations = useCallback(async () => {
    if (!lyric?.id) return;
    try {
      const list = await annotationService.getAnnotationsForLyric(lyric.id, user?.id);
      setAnnotations(list);
    } catch (err) {
      console.error('Failed to load annotations:', err);
    }
  }, [lyric?.id, user?.id]);

  useEffect(() => {
    if (lyric?.id) {
      loadAnnotations();
      loadTranslations();
      setActiveTranslation(null);
      setIsParallelView(false);
    }
  }, [lyric?.id, loadAnnotations, loadTranslations]);

  if (!lyric) return null;

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await annotationService.deleteAnnotation(annotationId);
      showToast?.('Annotation deleted.', 'success');
      loadAnnotations();
    } catch (err: any) {
      showToast?.(err?.message || 'Failed to delete annotation.', 'error');
    }
  };

  const moodObj = MOODS.find((m) => m.id === lyric.mood);

  const handleCopyText = async () => {
    if (!lyric) return;

    // Dynamically retrieve active translated/transliterated content or original
    const currentContent = activeTranslation
      ? activeTranslation.translated_content
      : lyric.content;

    const currentTitle = activeTranslation?.translated_title || lyric.title;
    const authorLine = lyric.song_title
      ? `${lyric.song_title} by ${lyric.artist_name || 'Unknown'}`
      : lyric.author_name || lyric.created_by?.name || '';

    const versionTag = activeTranslation
      ? ` [${activeTranslation.target_language}]`
      : '';

    const fullText = `"${currentContent}"\n\n— ${authorLine}${versionTag}\nSaved via LyricVault`;

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      if (showToast) {
        const msg = activeTranslation
          ? `${activeTranslation.target_language} lyrics copied.`
          : 'Lyrics copied.';
        showToast(msg, 'success');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast?.('Failed to copy lyrics', 'error');
    }
  };

  const handleShare = () => {
    if (lyric.visibility === 'private') {
      if (showToast) showToast("Private lyrics can't be shared publicly.", 'error');
      return;
    }
    setIsShareModalOpen(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop click on desktop */}
      <div className="absolute inset-0 hidden sm:block" onClick={onClose} />

      {/* Modal Container: Full screen page on mobile, clean modal on tablet/desktop */}
      <div
        id={`lyric-detail-modal-${lyric.id}`}
        className="relative z-10 w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[88vh] flex flex-col rounded-none sm:rounded-2xl border-0 sm:border sm:border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Sticky Control Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-[calc(0.65rem+env(safe-area-inset-top,0px))] pb-2.5 sm:py-3 border-b border-[var(--border-color)]/60 bg-[var(--bg-surface)] shrink-0">
          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0 pr-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] px-2 py-0.5 font-sans-ui text-[10px] font-semibold text-[var(--text-secondary)] shrink-0">
              {lyric.content_type === 'Lyric' || lyric.content_type === 'Song Verse' ? (
                <Music className="h-2.5 w-2.5 text-[#8B2F4A] dark:text-[#E06C88]" />
              ) : lyric.content_type === 'Quote' ? (
                <Quote className="h-2.5 w-2.5 text-[#8B2F4A] dark:text-[#E06C88]" />
              ) : (
                <Feather className="h-2.5 w-2.5 text-[#8B2F4A] dark:text-[#E06C88]" />
              )}
              {lyric.content_type}
            </span>

            {moodObj && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 ${moodObj.color}`}>
                <span>{moodObj.icon}</span>
                <span>{moodObj.label}</span>
              </span>
            )}

            {lyric.language && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] shrink-0">
                <Globe className="h-2.5 w-2.5 opacity-70" />
                <span>{lyric.language}</span>
              </span>
            )}
          </div>

          {/* Top Quick Actions & Close Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Reading Mode Primary Action */}
            {onOpenReadingMode && (
              <button
                id={`modal-reading-mode-badge-${lyric.id}`}
                onClick={() => {
                  onClose();
                  onOpenReadingMode(lyric);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#8B2F4A] hover:bg-[#72253c] text-white dark:bg-[#E06C88] dark:hover:bg-[#d65775] dark:text-zinc-950 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Distraction-free Reading Mode"
                aria-label="Reading Mode"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="font-sans-ui tracking-wide">Reading Mode</span>
              </button>
            )}

            {/* Lyric Card Studio Button */}
            <button
              id={`modal-create-card-badge-${lyric.id}`}
              onClick={() => {
                setCardStudioSelectedText('');
                setIsCardStudioOpen(true);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[#8B2F4A]/10 hover:text-[#8B2F4A] dark:hover:bg-[#E06C88]/20 dark:hover:text-[#E06C88] transition-all cursor-pointer"
              title="Create Lyric Card"
              aria-label="Create Lyric Card"
            >
              <Sparkles className="h-4 w-4" />
            </button>

            {/* Share Button */}
            <button
              id="modal-share-button"
              onClick={handleShare}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              title="Share"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4" />
            </button>

            {/* Close Button */}
            <button
              id="close-detail-modal-button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-zinc-200 hover:text-[var(--text-primary)] dark:hover:bg-zinc-800 transition-colors ml-0.5 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
          {/* Title and Subtitle */}
          <div>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-snug">
              {activeTranslation?.translated_title || lyric.title}
            </h2>

            {/* Song / Artist / Author Line */}
            {(lyric.song_title || lyric.artist_name || lyric.author_name) && (
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-secondary)] font-sans-ui">
                {lyric.song_title && (
                  <span className="font-semibold text-[var(--text-primary)]">{lyric.song_title}</span>
                )}
                {lyric.artist_name && <span>• {lyric.artist_name}</span>}
                {lyric.album_name && <span className="opacity-70">({lyric.album_name})</span>}
                {lyric.author_name && !lyric.song_title && (
                  <span>• By {lyric.author_name}</span>
                )}
              </div>
            )}

            {/* Streaming Links (Compact, uniform platform pills) */}
            {(() => {
              const allLinks = parseSongLinks(lyric.song_link, lyric.song_links);
              if (allLinks.length === 0) return null;
              return (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {allLinks.map((url, idx) => {
                    const platform = detectMusicPlatform(url);
                    return (
                      <a
                        key={idx}
                        id={`stream-link-${lyric.id}-${idx}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all shadow-xs hover:opacity-95 active:scale-95 ${platform.brandBg}`}
                        title={platform.label}
                      >
                        <Music className="h-3 w-3 shrink-0" />
                        <span>{platform.name}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-75 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Dedicated Reading Mode Feature Bar */}
          {onOpenReadingMode && (
            <div
              className="flex items-center justify-between p-2.5 rounded-xl border border-[#8B2F4A]/25 bg-[#8B2F4A]/5 dark:border-[#E06C88]/25 dark:bg-[#E06C88]/5 transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B2F4A]/15 text-[#8B2F4A] dark:bg-[#E06C88]/20 dark:text-[#E06C88] shrink-0">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate">
                    Distraction-Free Reading Mode
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-tight truncate">
                    Immersive typography, translations, notes & auto-scroll
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenReadingMode(lyric);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8B2F4A] hover:bg-[#72253c] text-white dark:bg-[#E06C88] dark:hover:bg-[#d65775] dark:text-zinc-950 text-xs font-bold shrink-0 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <span>Read</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Translation Bar */}
          <LyricTranslationBar
            lyric={lyric}
            activeTranslation={activeTranslation}
            availableTranslations={availableTranslations}
            onSelectTranslation={setActiveTranslation}
            onRequestTranslation={handleRequestTranslation}
            isLoading={isLoadingTranslation}
            themeMode="modal"
            isParallelView={isParallelView}
            onToggleParallelView={() => setIsParallelView(!isParallelView)}
          />

          {/* Main Lyric Display Area: Clean, spacious typography with zero visual clutter */}
          <div className="relative rounded-xl bg-[var(--bg-muted)]/35 p-4 sm:p-5 border border-[var(--border-color)]/50">
            <Quote className="absolute top-3 left-3 h-6 w-6 text-[#8B2F4A]/10 dark:text-[#E06C88]/10 pointer-events-none" />

            {/* Interactive Annotated Lyric Text / Parallel Lyrics View */}
            {isParallelView && activeTranslation ? (
              <ParallelLyricsView
                originalContent={lyric.content}
                translation={activeTranslation}
                fontFamily="serif"
                fontSize={18}
                lineHeight={1.65}
                textColor="var(--text-primary)"
                mutedColor="var(--text-secondary)"
                accentColor="#8B2F4A"
              />
            ) : (
              <AnnotatedLyricText
                content={activeTranslation ? activeTranslation.translated_content : lyric.content}
                annotations={activeTranslation ? [] : annotations}
                fontFamily="serif"
                showDoubleQuotes={true}
                customTextClassName="italic text-base sm:text-lg leading-relaxed text-[var(--text-primary)]"
                onSelectAnnotation={(anno) => setViewingAnnotation(anno)}
                onRequestAddAnnotation={(sel) => {
                  if (!isAuthenticated) {
                    onOpenAuthPrompt?.('note');
                    return;
                  }
                  setActiveEditorSelection(sel);
                  setEditingAnnotation(null);
                }}
                onRequestCreateCard={(sel) => {
                  setCardStudioSelectedText(sel.selectedText);
                  setIsCardStudioOpen(true);
                }}
              />
            )}
          </div>

          {/* Optional Description / Commentary */}
          {lyric.description && (
            <div className="rounded-lg bg-[var(--bg-surface)] p-3 border border-[var(--border-color)]/60 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)] block mb-0.5">Notes:</span>
              <p className="leading-relaxed">{lyric.description}</p>
            </div>
          )}

          {/* Theme Tags */}
          {lyric.themes && lyric.themes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {lyric.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-md bg-[var(--bg-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
                >
                  #{theme}
                </span>
              ))}
            </div>
          )}

          {/* Creator & Timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)]/50 text-[11px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5 min-w-0">
              {lyric.created_by.avatar ? (
                <img
                  src={lyric.created_by.avatar}
                  alt={lyric.created_by.name}
                  className="h-5 w-5 rounded-full object-cover border border-[var(--border-color)] shrink-0"
                />
              ) : (
                <User className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">
                Shared by{' '}
                <span className="font-semibold text-[var(--text-primary)]">{lyric.created_by.name}</span>
                {lyric.created_by.handle && (
                  <span className="ml-1 text-[var(--text-secondary)]">
                    (<CreatorLink
                      handle={lyric.created_by.handle}
                      name={lyric.created_by.name}
                      onClickCreator={(u) => {
                        onClose();
                        if (onSelectCreator) onSelectCreator(u);
                      }}
                    />)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-70 shrink-0">
              <Calendar className="h-3 w-3" />
              <span>{new Date(lyric.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer: Minimalist, clean bar with accessible icon buttons */}
        {/* Action Footer (Unified responsive bottom bar) */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--border-color)]/60 bg-[var(--bg-surface)] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shrink-0 w-full overflow-hidden">
          {/* Scrollable / Flexible Action Strip */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
            {/* Like Button */}
            <button
              id={`modal-like-button-${lyric.id}`}
              onClick={(e) => {
                if (!isAuthenticated) {
                  onOpenAuthPrompt?.('like');
                  return;
                }
                onToggleLike(e, lyric.id);
              }}
              className={`inline-flex h-8.5 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                lyric.is_liked
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50'
                  : 'bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20'
              }`}
              title="Like"
              aria-label="Like"
            >
              <Heart className={`h-3.5 w-3.5 ${lyric.is_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span className="text-[11px] font-semibold">{lyric.likes_count ?? 0}</span>
            </button>

            {/* Bookmark / Save Button */}
            <button
              id={`modal-bookmark-button-${lyric.id}`}
              onClick={(e) => {
                if (!isAuthenticated) {
                  onOpenAuthPrompt?.('bookmark');
                  return;
                }
                onToggleSave(e, lyric.id);
              }}
              className={`inline-flex h-8.5 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                lyric.is_saved
                  ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 shadow-xs'
                  : 'bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[#8B2F4A]/10 hover:text-[#8B2F4A]'
              }`}
              title={lyric.is_saved ? 'Saved in Vault' : 'Save to Vault'}
              aria-label="Bookmark"
            >
              <Bookmark className={`h-3.5 w-3.5 ${lyric.is_saved ? 'fill-current' : ''}`} />
              <span className="text-[11px] font-semibold">{lyric.saves_count ?? 0}</span>
            </button>

            {/* Add to Collection */}
            {onOpenAddToCollection && (
              <button
                id={`modal-add-to-collection-button-${lyric.id}`}
                onClick={() => {
                  if (!isAuthenticated) {
                    onOpenAuthPrompt?.('save');
                    return;
                  }
                  onOpenAddToCollection(lyric);
                }}
                className="inline-flex h-8.5 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl bg-[var(--bg-muted)] px-2.5 sm:px-3 text-xs font-semibold text-[var(--text-primary)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-all cursor-pointer active:scale-95"
                title="Add to Collection"
                aria-label="Add to Collection"
              >
                <FolderPlus className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
                <span className="text-[11px] font-semibold">Collection</span>
              </button>
            )}

            {/* Notes Trigger */}
            <button
              id={`modal-notes-sheet-trigger-${lyric.id}`}
              onClick={() => {
                if (!isAuthenticated) {
                  onOpenAuthPrompt?.('note');
                  return;
                }
                setIsNotesSheetOpen(true);
              }}
              className={`inline-flex h-8.5 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                annotations.length > 0
                  ? 'bg-[#8B2F4A]/10 text-[#8B2F4A] dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
                  : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Personal Notes"
              aria-label="Personal Notes"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">{annotations.length > 0 ? `${annotations.length} Notes` : 'Notes'}</span>
            </button>

            {/* Create Card Button (Bottom) */}
            <button
              id={`modal-create-card-bottom-${lyric.id}`}
              onClick={() => {
                setCardStudioSelectedText('');
                setIsCardStudioOpen(true);
              }}
              className="inline-flex h-8.5 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold bg-[#8B2F4A] text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Create Lyric Card"
              aria-label="Create Lyric Card"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">Card</span>
            </button>

            {/* Share Button (Bottom) */}
            <button
              id={`modal-share-bottom-${lyric.id}`}
              onClick={handleShare}
              className="inline-flex h-8.5 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs font-semibold bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[#8B2F4A]/10 hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-all cursor-pointer active:scale-95"
              title="Share Lyric"
              aria-label="Share"
            >
              <Share2 className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
              <span className="text-[11px] font-semibold">Share</span>
            </button>
          </div>

          {/* Right Action Icons (Copy, Edit, Delete) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-1.5 sm:pl-2 border-l border-[var(--border-color)]/50">
            {/* Edit Lyric (Owner) */}
            {onEditLyric && (
              <button
                id="modal-edit-lyric-button"
                onClick={() => {
                  onClose();
                  onEditLyric(lyric);
                }}
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-colors cursor-pointer active:scale-95"
                title="Edit Lyric"
                aria-label="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Delete Lyric (Owner) */}
            {onDeleteLyric && (
              <button
                id="modal-delete-lyric-button"
                onClick={() => {
                  onClose();
                  onDeleteLyric(lyric);
                }}
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer active:scale-95"
                title="Delete Lyric"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Copy Lyric Text Button */}
            <button
              id="modal-copy-text-button"
              onClick={handleCopyText}
              className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer active:scale-95"
              title="Copy Text"
              aria-label="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        lyric={lyric}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        showToast={showToast}
      />

      {/* Personal Annotation Modals */}
      <AnnotationEditorModal
        isOpen={Boolean(activeEditorSelection || editingAnnotation)}
        onClose={() => {
          setActiveEditorSelection(null);
          setEditingAnnotation(null);
        }}
        lyricId={lyric.id}
        selectedText={editingAnnotation ? editingAnnotation.selected_text : activeEditorSelection?.selectedText || ''}
        startPosition={editingAnnotation ? editingAnnotation.start_position : activeEditorSelection?.startPosition || 0}
        endPosition={editingAnnotation ? editingAnnotation.end_position : activeEditorSelection?.endPosition || 0}
        existingAnnotation={editingAnnotation}
        onSaveSuccess={() => {
          loadAnnotations();
          setActiveEditorSelection(null);
          setEditingAnnotation(null);
        }}
        showToast={showToast}
      />

      <AnnotationViewModal
        isOpen={Boolean(viewingAnnotation)}
        annotation={viewingAnnotation}
        onClose={() => setViewingAnnotation(null)}
        onEdit={(anno) => {
          setViewingAnnotation(null);
          setEditingAnnotation(anno);
        }}
        onDelete={(id) => {
          setViewingAnnotation(null);
          handleDeleteAnnotation(id);
        }}
      />

      <AnnotationListSheet
        isOpen={isNotesSheetOpen}
        onClose={() => setIsNotesSheetOpen(false)}
        annotations={annotations}
        onSelectAnnotation={(anno) => {
          setIsNotesSheetOpen(false);
          setViewingAnnotation(anno);
        }}
      />

      <LyricCardStudio
        isOpen={isCardStudioOpen}
        onClose={() => setIsCardStudioOpen(false)}
        lyric={lyric}
        activeTranslation={activeTranslation}
        initialSelectedText={cardStudioSelectedText}
        showToast={showToast}
      />

    </div>,
    document.body
  );
};
