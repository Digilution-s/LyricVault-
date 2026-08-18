import React, { useState, useEffect } from 'react';
import { CollectionCard } from '../components/CollectionCard';
import { LyricCard } from '../components/LyricCard';
import { EmptyState } from '../components/EmptyState';
import { CreateCollectionModal } from '../components/CreateCollectionModal';
import { EditCollectionModal } from '../components/EditCollectionModal';
import { Collection, Lyric } from '../types';
import { FolderHeart, Plus, ArrowLeft, Lock, Globe, Edit3, Trash2, Loader2, Sparkles, User, AlertTriangle } from 'lucide-react';
import { collectionService } from '../services/collectionService';
import { useAuth } from '../hooks/useAuth';

interface CollectionsViewProps {
  collections: Collection[];
  lyrics: Lyric[];
  onSelectLyric: (lyric: Lyric) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onOpenAddToCollection: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  onCreateCollectionSubmit: (data: {
    title: string;
    description: string;
    privacy: 'public' | 'private';
    coverGradient: string;
    coverUrl?: string;
  }) => Promise<void>;
  onUpdateCollectionSubmit: (collectionId: string, updates: {
    title: string;
    description: string;
    privacy: 'public' | 'private';
    cover_gradient: string;
    cover_url?: string;
  }) => Promise<void>;
  onDeleteCollectionSubmit: (collectionId: string) => Promise<void>;
  onNavigateTab: (tab: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuthPrompt: (context?: 'save' | 'bookmark' | 'note') => void;
  onRefreshCollections: () => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  lyrics,
  onSelectLyric,
  onToggleLike,
  onToggleSave,
  onOpenAddToCollection,
  onOpenReadingMode,
  onCreateCollectionSubmit,
  onUpdateCollectionSubmit,
  onDeleteCollectionSubmit,
  onNavigateTab,
  showToast,
  onOpenAuthPrompt,
  onRefreshCollections,
}) => {
  const { user, isAuthenticated } = useAuth();

  // Navigation / Selection State
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [collectionLyrics, setCollectionLyrics] = useState<Lyric[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync selectedCollection if collections array changes
  useEffect(() => {
    if (selectedCollection) {
      const updated = collections.find((c) => c.id === selectedCollection.id);
      if (updated) {
        setSelectedCollection(updated);
      }
    }
  }, [collections]);

  // Load lyrics when a collection is selected
  useEffect(() => {
    if (selectedCollection) {
      loadCollectionLyrics(selectedCollection.id);
    } else {
      setCollectionLyrics([]);
    }
  }, [selectedCollection?.id]);

  const loadCollectionLyrics = async (collectionId: string) => {
    setIsLoadingLyrics(true);
    try {
      const fetched = await collectionService.getCollectionLyrics(collectionId);
      // Merge with saves/likes from global lyrics state
      const merged = fetched.map((l) => {
        const globalLyric = lyrics.find((g) => g.id === l.id);
        if (globalLyric) {
          return {
            ...l,
            is_liked: globalLyric.is_liked,
            is_saved: globalLyric.is_saved,
            likes_count: globalLyric.likes_count,
            saves_count: globalLyric.saves_count,
          };
        }
        return l;
      });
      setCollectionLyrics(merged);
    } catch (err) {
      console.error('Error loading collection lyrics:', err);
    } finally {
      setIsLoadingLyrics(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      onOpenAuthPrompt('bookmark');
      return;
    }
    setShowCreateModal(true);
  };

  const handleRemoveFromCollection = async (lyricId: string) => {
    if (!selectedCollection) return;
    try {
      await collectionService.removeLyricFromCollection(selectedCollection.id, lyricId);
      setCollectionLyrics((prev) => prev.filter((l) => l.id !== lyricId));
      if (showToast) showToast('Removed lyric from collection.', 'info');
      onRefreshCollections();
    } catch (err: any) {
      console.error('Error removing lyric:', err);
      if (showToast) showToast(err.message || 'Could not remove lyric.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCollection) return;
    setIsDeleting(true);
    try {
      await onDeleteCollectionSubmit(selectedCollection.id);
      setShowDeleteConfirm(false);
      setSelectedCollection(null);
      if (showToast) showToast('Collection deleted.', 'info');
    } catch (err: any) {
      console.error('Error deleting collection:', err);
      if (showToast) showToast(err.message || 'Failed to delete collection.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const isOwner = selectedCollection && user && selectedCollection.user_id === user.id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
            <FolderHeart className="h-4 w-4" />
            <span>Word Anthologies</span>
          </div>
          <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Collections
          </h1>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Create and browse curated collections to organize the stanzas and words you love into thematic sets.
          </p>
        </div>

        <button
          id="create-collection-button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Selected Collection Detail View */}
      {selectedCollection ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCollection(null)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to All Collections</span>
            </button>

            {/* Owner Actions */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
                  <span>Edit Details</span>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/5 px-3.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>

          {/* Collection Cover Hero Card */}
          <div
            className={`rounded-3xl bg-gradient-to-r ${
              selectedCollection.cover_gradient || 'from-rose-950 via-pink-950 to-slate-950'
            } p-6 sm:p-8 text-white shadow-lg relative overflow-hidden`}
          >
            <div className="flex items-center justify-between z-10 relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                {selectedCollection.privacy === 'private' ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                <span>{selectedCollection.privacy === 'private' ? 'Private Anthology' : 'Public Anthology'}</span>
              </span>

              <span className="text-xs font-semibold text-white/90">
                {collectionLyrics.length} {collectionLyrics.length === 1 ? 'lyric' : 'lyrics'}
              </span>
            </div>

            <h2 className="mt-4 font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-white relative z-10">
              {selectedCollection.title || selectedCollection.name}
            </h2>

            {selectedCollection.description && (
              <p className="mt-2 text-sm text-white/85 max-w-2xl leading-relaxed relative z-10">
                {selectedCollection.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/70 relative z-10 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                {selectedCollection.created_by.avatar ? (
                  <img
                    src={selectedCollection.created_by.avatar}
                    alt={selectedCollection.created_by.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>Created by <strong className="text-white font-medium">{selectedCollection.created_by.name}</strong></span>
              </div>
              <span>•</span>
              <span>Created {new Date(selectedCollection.created_at).toLocaleDateString()}</span>
            </div>

            {/* Ambient background glow */}
            <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          </div>

          <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)] pt-4">
            Lyrics in this Anthology
          </h3>

          {/* Collection Lyrics Grid / Loading / Empty */}
          {isLoadingLyrics ? (
            <div className="flex items-center justify-center py-16 text-xs text-[var(--text-secondary)] gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#8B2F4A] dark:text-[#E06C88]" />
              <span>Fetching lyrics...</span>
            </div>
          ) : collectionLyrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {collectionLyrics.map((lyric) => (
                <LyricCard
                  key={lyric.id}
                  lyric={lyric}
                  onSelectLyric={onSelectLyric}
                  onToggleLike={(e, id) => {
                    onToggleLike(e, id);
                    setCollectionLyrics((prev) =>
                      prev.map((l) => {
                        if (l.id === id) {
                          const newLiked = !l.is_liked;
                          return {
                            ...l,
                            is_liked: newLiked,
                            likes_count: newLiked ? (l.likes_count ?? 0) + 1 : Math.max(0, (l.likes_count ?? 1) - 1),
                          };
                        }
                        return l;
                      })
                    );
                  }}
                  onToggleSave={(e, id) => {
                    onToggleSave(e, id);
                    setCollectionLyrics((prev) =>
                      prev.map((l) => {
                        if (l.id === id) {
                          const newSaved = !l.is_saved;
                          return {
                            ...l,
                            is_saved: newSaved,
                            saves_count: newSaved ? (l.saves_count ?? 0) + 1 : Math.max(0, (l.saves_count ?? 1) - 1),
                          };
                        }
                        return l;
                      })
                    );
                  }}
                  onOpenAddToCollection={onOpenAddToCollection}
                  onOpenReadingMode={onOpenReadingMode}
                  onRemoveFromCollection={isOwner ? handleRemoveFromCollection : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="This collection is empty"
              description="Add lyrics from your library or discovery feed to start building this anthology."
              actionText="Browse Lyrics"
              onAction={() => onNavigateTab('discover')}
              icon="music"
            />
          )}
        </div>
      ) : (
        /* All Collections Grid */
        collections.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onClick={(c) => setSelectedCollection(c)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Create your first collection"
            description="Organize the lyrics that mean something to you into personal or shared anthologies."
            actionText="Create Collection"
            onAction={handleOpenCreateModal}
            icon="bookmark"
          />
        )
      )}

      {/* Create Collection Modal */}
      <CreateCollectionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={onCreateCollectionSubmit}
      />

      {/* Edit Collection Modal */}
      <EditCollectionModal
        isOpen={showEditModal}
        collection={selectedCollection}
        onClose={() => setShowEditModal(false)}
        onSubmit={onUpdateCollectionSubmit}
      />

      {/* Delete Collection Confirm Modal */}
      {showDeleteConfirm && selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => !isDeleting && setShowDeleteConfirm(false)} />

          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
                Delete Collection?
              </h3>
            </div>

            <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to delete <strong className="text-[var(--text-primary)]">"{selectedCollection.title}"</strong>?
              This will remove the collection anthology, but <strong className="text-[var(--text-primary)]">will not delete your lyrics or bookmarks</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-full px-4 py-2 text-xs font-medium text-[var(--text-secondary)]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Collection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
