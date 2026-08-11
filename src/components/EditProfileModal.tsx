import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Camera, Upload, Trash2, Link as LinkIcon, Check, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, showToast }) => {
  const { profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  // Compress & resize image to lightweight Base64 Data URL for database storage
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size should be under 10MB.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400; // 400x400px is ideal for crisp avatars
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          setAvatarUrl(dataUrl);
          showToast('Profile photo ready!', 'info');
        } else {
          setAvatarUrl(event.target?.result as string);
        }
        setIsUploading(false);
      };

      img.onerror = () => {
        setErrorMsg('Failed to process image file.');
        setIsUploading(false);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read image file.');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!displayName.trim()) {
      setErrorMsg('Display name is required.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Username is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      showToast('Profile updated successfully.', 'success');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const AVATAR_PRESETS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  ];

  const defaultFallbackAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-8 shadow-2xl space-y-6 animate-scaleUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">Edit Profile</h2>
            <p className="text-xs text-[var(--text-secondary)]">Update your photo, display name and personal bio.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-200">
            {errorMsg}
          </div>
        )}

        {/* Profile Picture Upload Header & Interactive Avatar */}
        <div className="flex flex-col items-center justify-center gap-3 py-2">
          <div
            className={`relative group cursor-pointer rounded-full p-1 border-2 transition-all ${
              dragActive ? 'border-[#8B2F4A] scale-105' : 'border-[var(--border-color)] hover:border-[#8B2F4A]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Click or drag an image here to upload profile picture"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile preview"
                className="h-24 w-24 rounded-full object-cover shadow-inner"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                <User className="h-10 w-10" />
              </div>
            )}

            {/* Overlay Camera Icon */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold">
              <Camera className="h-6 w-6 mb-0.5" />
              <span>Upload Photo</span>
            </div>

            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[#8B2F4A] hover:bg-[#8B2F4A]/10 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
              <span>Upload Picture</span>
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl('')}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Remove current avatar"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              placeholder="Your Name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-xs font-medium text-[var(--text-secondary)]">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 pl-8 pr-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                placeholder="username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-3 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none resize-none"
              placeholder="Tell other lyric lovers a little about yourself..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Presets or Custom Image URL</label>
            <div className="flex items-center gap-3 mb-2.5">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatarUrl(preset)}
                  className={`relative rounded-full p-0.5 border-2 transition-all ${
                    avatarUrl === preset ? 'border-[#8B2F4A] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  title="Select preset avatar"
                >
                  <img src={preset} alt="preset avatar" className="h-9 w-9 rounded-full object-cover" />
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-xs text-[var(--text-secondary)]">
                <LinkIcon className="h-3.5 w-3.5" />
              </span>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 pl-9 pr-4 py-2.5 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none truncate"
                placeholder="https://example.com/my-photo.jpg"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-[var(--border-color)] px-5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex items-center gap-2 rounded-2xl bg-[#8B2F4A] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
