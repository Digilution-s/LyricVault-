import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Plus, Calendar, ChevronRight, Quote } from 'lucide-react';
import { LyricAnnotation } from '../types';

interface AnnotationListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  annotations: LyricAnnotation[];
  onSelectAnnotation: (annotation: LyricAnnotation) => void;
  onOpenAddPrompt?: () => void;
}

export const AnnotationListSheet: React.FC<AnnotationListSheetProps> = ({
  isOpen,
  onClose,
  annotations,
  onSelectAnnotation,
  onOpenAddPrompt,
}) => {
  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container */}
      <div
        id="annotation-list-sheet"
        className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border-color)] sm:hidden mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B2F4A]/10 text-[#8B2F4A] dark:bg-[#E06C88]/20 dark:text-[#E06C88]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-editorial text-lg font-bold text-[var(--text-primary)]">
                Your Annotations ({annotations.length})
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)]">Private notes attached to this lyric</p>
            </div>
          </div>
          <button
            id="close-annotation-list-button"
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-90"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Annotations List */}
        <div className="mt-4 space-y-3">
          {annotations.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                You haven't added any personal notes to this lyric yet.
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] italic">
                Tip: Highlight any line or phrase in the lyric to attach a private note or memory!
              </p>
              {onOpenAddPrompt && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddPrompt();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#8B2F4A]/10 px-4 py-2 text-xs font-semibold text-[#8B2F4A] dark:bg-[#E06C88]/20 dark:text-[#E06C88] hover:bg-[#8B2F4A] hover:text-white transition-all mt-2 min-h-[44px]"
                >
                  <Plus className="h-4 w-4" />
                  <span>How to Add Note</span>
                </button>
              )}
            </div>
          ) : (
            annotations.map((anno) => (
              <div
                key={anno.id}
                id={`annotation-list-item-${anno.id}`}
                onClick={() => {
                  onClose();
                  onSelectAnnotation(anno);
                }}
                className="group relative cursor-pointer rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/30 p-3.5 hover:border-[#8B2F4A]/50 dark:hover:border-[#E06C88]/50 hover:bg-[#8B2F4A]/5 transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-editorial italic font-medium text-[#8B2F4A] dark:text-[#E06C88] line-clamp-1">
                    <Quote className="h-3 w-3 shrink-0 opacity-70" />
                    <span>"{anno.selected_text}"</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[#8B2F4A] dark:group-hover:text-[#E06C88] shrink-0 transition-colors" />
                </div>

                <p className="mt-2 text-xs text-[var(--text-primary)] font-sans line-clamp-2 leading-relaxed">
                  {anno.note}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-secondary)] opacity-75">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(anno.created_at)}
                  </span>
                  <span className="font-semibold text-[#8B2F4A] dark:text-[#E06C88]">View Note</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
