import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { Lyric } from '../types';
import { lyricsService } from '../services/lyricsService';
import { useAuth } from '../hooks/useAuth';

interface DeleteLyricModalProps {
  isOpen: boolean;
  lyric: Lyric | null;
  onClose: () => void;
  onDeleted: (lyricId: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DeleteLyricModal: React.FC<DeleteLyricModalProps> = ({
  isOpen,
  lyric,
  onClose,
  onDeleted,
  showToast,
}) => {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !lyric) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await lyricsService.deleteLyric(lyric.id, user?.id);
      showToast('Lyric permanently deleted.', 'success');
      onDeleted(lyric.id);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Unable to delete lyric. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-delete-modal-button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
              Delete this lyric?
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              This will permanently remove the lyric from LyricVault.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/50 p-4">
          <p className="font-editorial font-bold text-sm text-[var(--text-primary)]">
            "{lyric.title}"
          </p>
          <p className="mt-1 font-editorial text-xs italic text-[var(--text-secondary)] line-clamp-2">
            "{lyric.content}"
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-full px-5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>

          <button
            id="confirm-delete-lyric-button"
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
