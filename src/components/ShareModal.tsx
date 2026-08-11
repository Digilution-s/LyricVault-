import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Share2, Send, Mail, MessageCircle, ExternalLink, Lock } from 'lucide-react';
import { Lyric } from '../types';

interface ShareModalProps {
  lyric: Lyric | null;
  isOpen: boolean;
  onClose: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  lyric,
  isOpen,
  onClose,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !lyric) return null;

  const isPrivate = lyric.visibility === 'private';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/lyrics/${lyric.id}`
    : `https://lyricvault.app/lyrics/${lyric.id}`;

  const shareText = `Check out this lyric on LyricVault: "${lyric.title}"`;

  const handleCopyLink = async () => {
    if (isPrivate) {
      if (showToast) showToast("Private lyrics can't be shared publicly.", 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (showToast) showToast('Link copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (showToast) showToast('Failed to copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    if (isPrivate) {
      if (showToast) showToast("Private lyrics can't be shared publicly.", 'error');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: lyric.title,
          text: shareText,
          url: shareUrl,
        });
        if (showToast) showToast('Share opened.', 'info');
        onClose();
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Web share error:', err);
        }
      }
    }
  };

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: copied ? Check : Copy,
      color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
      action: handleCopyLink,
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
    },
    {
      name: 'X (Twitter)',
      icon: Send,
      color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Facebook',
      icon: Share2,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      url: `mailto:?subject=${encodeURIComponent(`Check out this lyric on LyricVault: "${lyric.title}"`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
    },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-6 relative animate-scaleUp text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#8B2F4A] dark:text-[#E06C88]" />
            <h2 className="font-editorial text-xl font-bold text-[var(--text-primary)]">
              Share Lyric
            </h2>
          </div>
          <button
            id="close-share-modal-button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isPrivate ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto" />
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Private lyrics can't be shared publicly.
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Change this lyric's visibility to public if you wish to share it.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lyric Title Preview */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-muted)]/50 border border-[var(--border-color)] space-y-1">
              <p className="font-editorial text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                {lyric.title}
              </p>
              {lyric.artist_name && (
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  by {lyric.artist_name}
                </p>
              )}
            </div>

            {/* Native Share button if supported */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                id="native-web-share-button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#8B2F4A] py-3 text-xs font-semibold text-white shadow-md hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
              >
                <Share2 className="h-4 w-4" />
                <span>Share via System Share Sheet</span>
              </button>
            )}

            {/* Share Grid */}
            <div className="grid grid-cols-2 gap-3">
              {shareOptions.map((opt) => {
                const Icon = opt.icon;
                if (opt.action) {
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      id={`share-option-${opt.name.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={opt.action}
                      className={`flex items-center gap-3 rounded-2xl p-3 text-xs font-medium border border-[var(--border-color)]/60 hover:border-[#8B2F4A] transition-all text-left ${opt.color}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{opt.name}</span>
                    </button>
                  );
                }

                return (
                  <a
                    key={opt.name}
                    id={`share-option-${opt.name.toLowerCase().replace(/\s+/g, '-')}`}
                    href={opt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (showToast) showToast('Share opened.', 'info');
                      onClose();
                    }}
                    className={`flex items-center gap-3 rounded-2xl p-3 text-xs font-medium border border-[var(--border-color)]/60 hover:border-[#8B2F4A] transition-all ${opt.color}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{opt.name}</span>
                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                  </a>
                );
              })}
            </div>

            {/* Read-only URL field */}
            <div className="pt-2">
              <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                Shareable Link
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] focus:outline-none select-all"
                />
                <button
                  type="button"
                  id="copy-share-url-inline-button"
                  onClick={handleCopyLink}
                  className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-[#8B2F4A] transition-colors shrink-0"
                  title="Copy link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
