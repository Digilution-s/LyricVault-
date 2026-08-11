import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Pencil, Trash2, Calendar, Quote } from 'lucide-react';
import { LyricAnnotation } from '../types';

interface AnnotationViewModalProps {
  annotation: LyricAnnotation | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (annotation: LyricAnnotation) => void;
  onDelete: (annotationId: string) => void;
}

export const AnnotationViewModal: React.FC<AnnotationViewModalProps> = ({
  annotation,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen || !annotation) return null;

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const handleDelete = () => {
    onDelete(annotation.id);
    setShowConfirmDelete(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet / Modal */}
      <div
        id={`annotation-view-modal-${annotation.id}`}
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border-color)] sm:hidden mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B2F4A]/10 text-[#8B2F4A] dark:bg-[#E06C88]/20 dark:text-[#E06C88]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-editorial text-lg font-bold text-[var(--text-primary)]">Your Private Note</h3>
              <p className="text-[10px] text-[var(--text-secondary)]">Visible only to you</p>
            </div>
          </div>
          <button
            id="close-annotation-view-button"
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-90"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Selected Text Preview */}
          <div className="rounded-xl bg-[#8B2F4A]/5 dark:bg-[#E06C88]/10 border-l-3 border-[#8B2F4A] dark:border-[#E06C88] p-3.5 text-xs text-[var(--text-primary)]">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8B2F4A] dark:text-[#E06C88] block mb-1">
              Annotated Lyric Line
            </span>
            <div className="flex items-start gap-1.5 font-editorial italic text-sm leading-relaxed">
              <Quote className="h-3.5 w-3.5 shrink-0 opacity-60 mt-0.5" />
              <span>"{annotation.selected_text}"</span>
            </div>
          </div>

          {/* User Note Body */}
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/30 p-4">
            <p className="text-sm text-[var(--text-primary)] whitespace-pre-line leading-relaxed font-sans">
              {annotation.note}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] opacity-75">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(annotation.created_at)}</span>
            </div>
          </div>

          {/* Delete Confirmation Overlay inside modal */}
          {showConfirmDelete ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3 animate-fadeIn">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                Delete this personal annotation? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="rounded-full border border-rose-200 dark:border-rose-900 bg-transparent px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-rose-500/10 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-annotation-button"
                  type="button"
                  onClick={handleDelete}
                  className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs active:scale-95 min-h-[44px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            /* Action Buttons */
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
              <button
                id="delete-annotation-trigger-button"
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="touch-target inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors min-h-[44px] active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  id="edit-annotation-button"
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(annotation);
                  }}
                  className="touch-target inline-flex items-center gap-1.5 rounded-full bg-[#8B2F4A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#72243b] dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d45876] transition-all shadow-md min-h-[44px] active:scale-95"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit Note</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
