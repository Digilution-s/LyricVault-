import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, AlertCircle, Quote } from 'lucide-react';
import { LyricAnnotation } from '../types';
import { annotationService } from '../services/annotationService';
import { useAuth } from '../context/AuthContext';

interface AnnotationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lyricId: string;
  selectedText: string;
  startPosition: number;
  endPosition: number;
  existingAnnotation?: LyricAnnotation | null;
  onSaveSuccess: (annotation: LyricAnnotation) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AnnotationEditorModal: React.FC<AnnotationEditorModalProps> = ({
  isOpen,
  onClose,
  lyricId,
  selectedText,
  startPosition,
  endPosition,
  existingAnnotation,
  onSaveSuccess,
  showToast,
}) => {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingAnnotation) {
      setNote(existingAnnotation.note);
    } else {
      setNote('');
    }
    setErrorMsg(null);
  }, [existingAnnotation, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNote = note.trim();

    if (!cleanNote) {
      setErrorMsg('Please write a note before saving.');
      return;
    }

    if (cleanNote.length > 500) {
      setErrorMsg('Note cannot exceed 500 characters.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (existingAnnotation) {
        const updated = await annotationService.updateAnnotation(existingAnnotation.id, cleanNote);
        showToast?.('Annotation updated.', 'success');
        onSaveSuccess(updated);
      } else {
        const created = await annotationService.createAnnotation({
          lyricId,
          selectedText,
          startPosition,
          endPosition,
          note: cleanNote,
          userId: user?.id,
        });
        showToast?.('Annotation saved.', 'success');
        onSaveSuccess(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Save annotation error:', err);
      const msg = err?.message || 'Unable to save annotation. Please try again.';
      setErrorMsg(msg);
      showToast?.(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Editor Sheet/Modal */}
      <div
        id="annotation-editor-sheet"
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl transition-all"
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
            <h3 className="font-editorial text-lg font-bold text-[var(--text-primary)]">
              {existingAnnotation ? 'Edit Personal Note' : 'Add Personal Note'}
            </h3>
          </div>
          <button
            id="close-annotation-editor-button"
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-90"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Selected Lyric Text Read-Only Preview */}
          <div className="rounded-xl bg-[#8B2F4A]/5 dark:bg-[#E06C88]/10 border-l-3 border-[#8B2F4A] dark:border-[#E06C88] p-3.5 text-xs text-[var(--text-primary)]">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#8B2F4A] dark:text-[#E06C88] block mb-1">
              Selected Lyric
            </span>
            <div className="flex items-start gap-1.5 font-editorial italic text-sm leading-relaxed">
              <Quote className="h-3.5 w-3.5 shrink-0 opacity-60 mt-0.5" />
              <span>"{selectedText || existingAnnotation?.selected_text}"</span>
            </div>
          </div>

          {/* Validation Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Note Input */}
          <div>
            <label
              htmlFor="annotation-note-textarea"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5"
            >
              Your Note / Memory / Thought
            </label>
            <textarea
              id="annotation-note-textarea"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="What does this line mean to you? Add a memory, thought, or reminder..."
              maxLength={500}
              rows={4}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/40 p-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:border-[#8B2F4A] focus:outline-none focus:ring-1 focus:ring-[#8B2F4A] dark:focus:border-[#E06C88] dark:focus:ring-[#E06C88] resize-none transition-all font-sans"
              autoFocus
            />

            <div className="mt-1.5 flex justify-between items-center text-[11px] text-[var(--text-secondary)]">
              <span>Private note — visible only to you</span>
              <span className={note.length >= 480 ? 'text-amber-500 font-semibold' : ''}>
                {note.length} / 500
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
            <button
              id="cancel-annotation-button"
              type="button"
              onClick={onClose}
              className="touch-target rounded-full border border-[var(--border-color)] px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors active:scale-95 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              id="save-annotation-button"
              type="submit"
              disabled={isSaving || !note.trim()}
              className="touch-target inline-flex items-center justify-center gap-2 rounded-full bg-[#8B2F4A] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#72243b] dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d45876] transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSaving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{existingAnnotation ? 'Update Note' : 'Save Note'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
