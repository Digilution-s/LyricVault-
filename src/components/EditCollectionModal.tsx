import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FolderHeart, Lock, Globe, Loader2, Image as ImageIcon } from 'lucide-react';
import { Collection } from '../types';
import { COLLECTION_GRADIENTS } from '../constants/gradients';

interface EditCollectionModalProps {
  isOpen: boolean;
  collection: Collection | null;
  onClose: () => void;
  onSubmit: (collectionId: string, updates: {
    title: string;
    description: string;
    privacy: 'public' | 'private';
    cover_gradient: string;
    cover_url?: string;
  }) => Promise<void>;
}

export const EditCollectionModal: React.FC<EditCollectionModalProps> = ({
  isOpen,
  collection,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [selectedGradient, setSelectedGradient] = useState(COLLECTION_GRADIENTS[0].class);
  const [coverUrl, setCoverUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (collection) {
      setTitle(collection.title || collection.name || '');
      setDescription(collection.description || '');
      setPrivacy(collection.privacy || 'public');
      setSelectedGradient(collection.cover_gradient || COLLECTION_GRADIENTS[0].class);
      setCoverUrl(collection.cover_url || collection.cover_image || '');
    }
  }, [collection]);

  if (!isOpen || !collection) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a collection name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSubmit(collection.id, {
        title: title.trim(),
        description: description.trim(),
        privacy,
        cover_gradient: selectedGradient,
        cover_url: coverUrl.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update collection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={() => !isSubmitting && onClose()} />

      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#8B2F4A]/10 text-[#8B2F4A] dark:text-[#E06C88]">
              <FolderHeart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
                Edit Collection
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">Update details for "{collection.title}".</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-[var(--bg-muted)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="mt-4">
          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Card Preview
          </label>
          <div
            className={`h-24 w-full rounded-2xl bg-gradient-to-r ${selectedGradient} p-4 flex flex-col justify-between text-white shadow-sm relative overflow-hidden transition-all duration-300`}
          >
            <div className="flex items-center justify-between z-10">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md">
                {privacy === 'private' ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                <span>{privacy === 'private' ? 'Private' : 'Public'} Anthology</span>
              </span>
              <span className="text-[11px] font-medium opacity-90">{collection.item_count} items</span>
            </div>

            <div className="z-10">
              <h4 className="font-editorial text-lg font-bold text-white truncate">
                {title.trim() || 'Collection Title'}
              </h4>
            </div>

            <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Collection Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Description <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Privacy Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Privacy Setting
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPrivacy('public')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs transition-all ${
                  privacy === 'public'
                    ? 'border-[#8B2F4A] bg-[#8B2F4A]/10 text-[#8B2F4A] dark:border-[#E06C88] dark:bg-[#E06C88]/20 dark:text-[#E06C88] font-semibold'
                    : 'border-[var(--border-color)] bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Globe className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">Public</div>
                  <div className="text-[10px] opacity-75">Visible to all visitors</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrivacy('private')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs transition-all ${
                  privacy === 'private'
                    ? 'border-[#8B2F4A] bg-[#8B2F4A]/10 text-[#8B2F4A] dark:border-[#E06C88] dark:bg-[#E06C88]/20 dark:text-[#E06C88] font-semibold'
                    : 'border-[var(--border-color)] bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Lock className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-semibold">Private</div>
                  <div className="text-[10px] opacity-75">Only visible to you</div>
                </div>
              </button>
            </div>
          </div>

          {/* Cover Gradient Selection */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Theme Cover Palette
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {COLLECTION_GRADIENTS.map((grad) => (
                <button
                  key={grad.id}
                  type="button"
                  onClick={() => setSelectedGradient(grad.class)}
                  className={`h-8 w-12 shrink-0 rounded-lg bg-gradient-to-r ${grad.class} border-2 transition-transform hover:scale-105 ${
                    selectedGradient === grad.class
                      ? 'border-[#8B2F4A] dark:border-[#E06C88] scale-105 shadow-sm'
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  title={grad.name}
                />
              ))}
            </div>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Cover Image URL <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
            </label>
            <div className="relative flex items-center">
              <ImageIcon className="absolute left-3 h-3.5 w-3.5 text-[var(--text-secondary)]" />
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] pl-9 pr-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8B2F4A] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
