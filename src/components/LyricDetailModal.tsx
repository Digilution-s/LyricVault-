import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Bookmark, Copy, Check, Share2, Music, Quote, Feather, Sparkles, User, Calendar, ExternalLink, Globe, Radio, FolderPlus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { Lyric, LyricAnnotation } from '../types';
import { MOODS } from '../data/demoData';
import { CreatorLink } from './CreatorLink';
import { detectMusicPlatform, parseSongLinks } from '../utils/musicPlatform';
import { ShareModal } from './ShareModal';
import { annotationService } from '../services/annotationService';
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
    }
  }, [lyric?.id, loadAnnotations]);

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

  const handleCopyText = () => {
    const fullText = `"${lyric.content}"\n\n— ${
      lyric.song_title ? `${lyric.song_title} by ${lyric.artist_name}` : lyric.author_name || lyric.created_by.name
    }\nSaved via LyricVault`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    if (showToast) showToast('Lyrics copied.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (lyric.visibility === 'private') {
      if (showToast) showToast("Private lyrics can't be shared publicly.", 'error');
      return;
    }
    setIsShareModalOpen(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container (Bottom sheet on mobile, centered modal on tablet/desktop) */}
      <div
        id={`lyric-detail-modal-${lyric.id}`}
        className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-8 shadow-2xl transition-all my-0 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile bottom sheet drag handle */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border-color)] sm:hidden mb-4" />

        {/* Close Button */}
        <button
          id="close-detail-modal-button"
          onClick={onClose}
          className="absolute right-4 top-4 sm:right-5 sm:top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors hover:bg-zinc-200 hover:text-[var(--text-primary)] dark:hover:bg-zinc-800 active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 pr-10 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] px-3 py-1 font-sans-ui font-semibold text-[var(--text-secondary)]">
            {lyric.content_type === 'Lyric' || lyric.content_type === 'Song Verse' ? (
              <Music className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
            ) : lyric.content_type === 'Quote' ? (
              <Quote className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
            ) : (
              <Feather className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
            )}
            {lyric.content_type}
          </span>

          {moodObj && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium ${moodObj.color}`}>
              <span>{moodObj.icon}</span>
              <span>{moodObj.label}</span>
            </span>
          )}

          {lyric.language && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1 font-medium text-[var(--text-secondary)]">
              <Globe className="h-3 w-3 opacity-70" />
              <span>{lyric.language}</span>
            </span>
          )}

          {lyric.genre && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1 font-medium text-[var(--text-secondary)]">
              <Radio className="h-3 w-3 opacity-70" />
              <span>{lyric.genre}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="mt-4 font-editorial text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          {lyric.title}
        </h2>

        {/* Song / Artist / Author Metadata Box (if available) */}
        {(lyric.song_title || lyric.artist_name || lyric.author_name || lyric.song_link || lyric.song_links) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--bg-muted)]/30 border-l-2 border-[#8B2F4A] p-3 text-sm text-[var(--text-secondary)] font-sans-ui">
            <div className="flex flex-wrap items-center gap-2">
              {lyric.song_title && (
                <span className="font-semibold text-[var(--text-primary)]">{lyric.song_title}</span>
              )}
              {lyric.artist_name && <span>by {lyric.artist_name}</span>}
              {lyric.album_name && <span className="opacity-75">({lyric.album_name})</span>}
              {lyric.author_name && !lyric.song_title && (
                <span>Author: <strong className="text-[var(--text-primary)]">{lyric.author_name}</strong></span>
              )}
            </div>

            {/* Song streaming link buttons */}
            {(() => {
              const allLinks = parseSongLinks(lyric.song_link, lyric.song_links);
              if (allLinks.length === 0) return null;
              return (
                <div className="flex flex-wrap items-center gap-2">
                  {allLinks.map((url, idx) => {
                    const platform = detectMusicPlatform(url);
                    return (
                      <a
                        key={idx}
                        id={`stream-link-${lyric.id}-${idx}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-xs ${platform.brandBg}`}
                        title={platform.label}
                      >
                        <Music className="h-3.5 w-3.5 shrink-0" />
                        <span>{platform.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </a>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Main Lyric Display Area */}
        <div className="my-8 rounded-2xl bg-[var(--bg-muted)]/50 p-6 sm:p-8 border border-[var(--border-color)]/60 relative group">
          <Quote className="absolute top-4 left-4 h-8 w-8 text-[#8B2F4A]/10 dark:text-[#E06C88]/10 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 pt-1 border-b border-[var(--border-color)]/40 mb-4">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">
              Lyric Content
            </span>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-full">
              {/* Notes List Button */}
              {annotations.length > 0 && (
                <button
                  id={`modal-notes-badge-${lyric.id}`}
                  onClick={() => {
                    if (!isAuthenticated) {
                      onOpenAuthPrompt?.('note');
                      return;
                    }
                    setIsNotesSheetOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#8B2F4A]/10 hover:bg-[#8B2F4A] text-[#8B2F4A] hover:text-white dark:bg-[#E06C88]/20 dark:hover:bg-[#E06C88] dark:text-[#E06C88] dark:hover:text-zinc-950 text-xs font-bold transition-all shadow-xs min-h-[32px] shrink-0 cursor-pointer"
                  title="View your private notes for this lyric"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Your Notes ({annotations.length})</span>
                </button>
              )}

              {onOpenReadingMode && (
                <button
                  id={`modal-reading-mode-badge-${lyric.id}`}
                  onClick={() => {
                    onClose();
                    onOpenReadingMode(lyric);
                  }}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#8B2F4A] text-[var(--text-primary)] text-xs font-semibold transition-all shadow-xs min-h-[32px] shrink-0"
                  title="Open full-screen Reading Mode"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88] shrink-0" />
                  <span className="whitespace-nowrap">Reading Mode</span>
                </button>
              )}

              {/* Create Card Badge Button */}
              <button
                id={`modal-create-card-badge-${lyric.id}`}
                onClick={() => {
                  setCardStudioSelectedText('');
                  setIsCardStudioOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#8B2F4A]/10 hover:bg-[#8B2F4A] text-[#8B2F4A] hover:text-white dark:bg-[#E06C88]/20 dark:hover:bg-[#E06C88] dark:text-[#E06C88] dark:hover:text-zinc-950 text-xs font-semibold transition-all shadow-xs min-h-[32px] shrink-0"
                title="Create a shareable visual Lyric Card"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="whitespace-nowrap">Create Lyric Card</span>
              </button>
            </div>
          </div>

          {/* Interactive Annotated Lyric Text */}
          <AnnotatedLyricText
            content={lyric.content}
            annotations={annotations}
            fontFamily="serif"
            showDoubleQuotes={true}
            customTextClassName="italic text-xl sm:text-2xl leading-relaxed text-[var(--text-primary)]"
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
        </div>

        {/* Optional Description / Commentary */}
        {lyric.description && (
          <div className="mb-6 rounded-xl bg-[var(--bg-surface)] p-4 border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)] block mb-1">Commentary / Context:</span>
            <p className="leading-relaxed">{lyric.description}</p>
          </div>
        )}

        {/* Theme Tags */}
        {lyric.themes && lyric.themes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Themes:</span>
            {lyric.themes.map((theme) => (
              <span
                key={theme}
                className="rounded-lg bg-[var(--bg-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
              >
                #{theme}
              </span>
            ))}
          </div>
        )}

        {/* Creator & Timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-[var(--border-color)]/60 pt-4 text-xs text-[var(--text-secondary)]">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {lyric.created_by.avatar ? (
              <img
                src={lyric.created_by.avatar}
                alt={lyric.created_by.name}
                className="h-6 w-6 rounded-full object-cover border border-[var(--border-color)] shrink-0"
              />
            ) : (
              <User className="h-4 w-4 shrink-0" />
            )}
            <span className="font-normal">Created by</span>
            <span className="font-semibold text-[var(--text-primary)]">{lyric.created_by.name}</span>
            {lyric.created_by.handle && (
              <span className="inline-flex items-center text-[var(--text-secondary)]">
                <span className="mr-0.5">(</span>
                <CreatorLink
                  handle={lyric.created_by.handle}
                  name={lyric.created_by.name}
                  onClickCreator={(u) => {
                    onClose();
                    if (onSelectCreator) onSelectCreator(u);
                  }}
                />
                <span className="ml-0.5">)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-75 shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            <span>{new Date(lyric.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Like */}
            <button
              id={`modal-like-button-${lyric.id}`}
              onClick={(e) => onToggleLike(e, lyric.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                lyric.is_liked
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <Heart className={`h-4 w-4 ${lyric.is_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{lyric.likes_count} Likes</span>
            </button>

            {/* Bookmark / Save */}
            <button
              id={`modal-bookmark-button-${lyric.id}`}
              onClick={(e) => {
                if (!isAuthenticated) {
                  onOpenAuthPrompt?.('bookmark');
                  return;
                }
                onToggleSave(e, lyric.id);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                lyric.is_saved
                  ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950'
                  : 'bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[#8B2F4A]/10 hover:text-[#8B2F4A]'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${lyric.is_saved ? 'fill-current' : ''}`} />
              <span>{lyric.is_saved ? 'Saved in Vault' : 'Save to Library'}</span>
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
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
              >
                <FolderPlus className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88]" />
                <span>Add to Collection</span>
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
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88]" />
              <span>Notes ({annotations.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Edit Lyric (if owner) */}
            {onEditLyric && (
              <button
                id="modal-edit-lyric-button"
                onClick={() => {
                  onClose();
                  onEditLyric(lyric);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
                <span>Edit</span>
              </button>
            )}

            {/* Delete Lyric (if owner) */}
            {onDeleteLyric && (
              <button
                id="modal-delete-lyric-button"
                onClick={() => {
                  onClose();
                  onDeleteLyric(lyric);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}

            {/* Copy Lyric Text */}
            <button
              id="modal-copy-text-button"
              onClick={handleCopyText}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Lyric'}</span>
            </button>

            {/* Share */}
            <button
              id="modal-share-button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <Share2 className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
              <span>Share</span>
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
        initialSelectedText={cardStudioSelectedText}
        showToast={showToast}
      />

    </div>,
    document.body
  );
};
