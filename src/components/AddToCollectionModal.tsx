import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderHeart, Plus, Check, Loader2, Lock, Globe } from 'lucide-react';
import { Lyric, Collection } from '../types';
import { collectionService } from '../services/collectionService';
import { useAuth } from '../hooks/useAuth';

interface AddToCollectionModalProps {
  isOpen: boolean;
  lyric: Lyric | null;
  onClose: () => void;
  onOpenCreateCollection: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onCollectionUpdated?: () => void;
}

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  lyric,
  onClose,
  onOpenCreateCollection,
  showToast,
  onCollectionUpdated,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [userCollections, setUserCollections] = useState<Collection[]>([]);
  const [containingMap, setContainingMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && lyric && user && isAuthenticated) {
      loadCollections();
    }
  }, [isOpen, lyric, user, isAuthenticated]);

  const loadCollections = async () => {
    if (!user || !lyric) return;
    setIsLoading(true);
    try {
      const cols = await collectionService.getUserCollections(user.id);
      setUserCollections(cols);

      const containingIds = await collectionService.getCollectionsContainingLyric(user.id, lyric.id);
      const map: Record<string, boolean> = {};
      cols.forEach((c) => {
        map[c.id] = containingIds.includes(c.id);
      });
      setContainingMap(map);
    } catch (err) {
      console.error('Error loading collections for add modal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !lyric) return null;

  const handleToggleCollection = async (collection: Collection) => {
    if (!user || !lyric) return;
    const isCurrentlyIn = containingMap[collection.id];
    setProcessingId(collection.id);

    try {
      if (isCurrentlyIn) {
        await collectionService.removeLyricFromCollection(collection.id, lyric.id);
        setContainingMap((prev) => ({ ...prev, [collection.id]: false }));
        if (showToast) showToast(`Removed from "${collection.title}"`, 'info');
      } else {
        await collectionService.addLyricToCollection(collection.id, lyric.id);
        setContainingMap((prev) => ({ ...prev, [collection.id]: true }));
        if (showToast) showToast(`Added to "${collection.title}"`, 'success');
      }

      if (onCollectionUpdated) {
        onCollectionUpdated();
      }
    } catch (err: any) {
      console.error('Error toggling lyric in collection:', err);
      if (showToast) showToast(err.message || 'Failed to update collection.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border-color)] sm:hidden mb-3" />
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#8B2F4A]/10 text-[#8B2F4A] dark:text-[#E06C88]">
              <FolderHeart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
                Add to Collection
              </h3>
              <p className="text-xs text-[var(--text-secondary)] truncate max-w-[220px]">
                "{lyric.title}"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-[var(--bg-muted)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Collections Picker List */}
        <div className="mt-4 my-2 max-h-60 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-xs text-[var(--text-secondary)] gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#8B2F4A] dark:text-[#E06C88]" />
              <span>Loading your collections...</span>
            </div>
          ) : userCollections.length > 0 ? (
            userCollections.map((col) => {
              const isIn = containingMap[col.id];
              const isProcessing = processingId === col.id;

              return (
                <button
                  key={col.id}
                  onClick={() => handleToggleCollection(col)}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                    isIn
                      ? 'border-[#8B2F4A] bg-[#8B2F4A]/10 text-[var(--text-primary)] dark:border-[#E06C88] dark:bg-[#E06C88]/15'
                      : 'border-[var(--border-color)] bg-[var(--bg-muted)]/50 hover:bg-[var(--bg-muted)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`h-9 w-9 shrink-0 rounded-xl bg-gradient-to-r ${
                        col.cover_gradient || 'from-rose-950 to-slate-950'
                      } flex items-center justify-center text-white text-xs font-bold shadow-xs`}
                    >
                      <FolderHeart className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span className="truncate">{col.title}</span>
                        {col.privacy === 'private' ? (
                          <Lock className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                        ) : (
                          <Globe className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] truncate">
                        {col.description || `${col.item_count} items`}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#8B2F4A] dark:text-[#E06C88]" />
                    ) : isIn ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#8B2F4A] dark:bg-[#E06C88] px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-950">
                        <Check className="h-3 w-3" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-6 px-4 bg-[var(--bg-muted)]/40 rounded-2xl border border-[var(--border-color)] space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">You don't have any collections yet.</p>
            </div>
          )}
        </div>

        {/* Create New Collection Option */}
        <div className="pt-3 mt-2 border-t border-[var(--border-color)] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateCollection();
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] hover:underline"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Collection</span>
          </button>

          <button
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
