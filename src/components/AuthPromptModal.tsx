import React from 'react';
import { createPortal } from 'react-dom';
import { X, Bookmark, PlusCircle, Edit3, Sparkles } from 'lucide-react';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSignup?: () => void;
  onSelectLogin?: () => void;
  onNavigateSignup?: () => void;
  onNavigateLogin?: () => void;
  actionContext?: 'save' | 'bookmark' | 'note' | 'generic';
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  onSelectSignup,
  onSelectLogin,
  onNavigateSignup,
  onNavigateLogin,
  actionContext = 'save',
}) => {
  if (!isOpen) return null;

  const handleLogin = onSelectLogin || onNavigateLogin || (() => {});
  const handleSignup = onSelectSignup || onNavigateSignup || (() => {});

  const getTitle = () => {
    switch (actionContext) {
      case 'note':
        return 'Log in or create an account to save notes';
      case 'bookmark':
        return 'Save this lyric to your library';
      case 'save':
        return 'Save your first lyric';
      default:
        return 'Log in or create an account';
    }
  };

  const getDescription = () => {
    switch (actionContext) {
      case 'note':
        return 'Create a free account or log in to attach private notes, memories, and annotations to lyrics.';
      case 'bookmark':
        return 'Create a free account or log in to bookmark and organize your favorite lyrics.';
      case 'save':
        return 'Log in or create an account to add lyrics, quotes, and song verses to your vault.';
      default:
        return 'Create a free account or log in to access all personal vault features.';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl space-y-6 text-center animate-scaleUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto inline-flex items-center justify-center p-3.5 rounded-2xl bg-[#8B2F4A]/10 text-[#8B2F4A] dark:text-[#E06C88]">
          {actionContext === 'note' ? (
            <Edit3 className="h-6 w-6" />
          ) : actionContext === 'bookmark' ? (
            <Bookmark className="h-6 w-6" />
          ) : actionContext === 'save' ? (
            <PlusCircle className="h-6 w-6" />
          ) : (
            <img src="/logo.svg" alt="LyricVault" className="h-10 w-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
          )}
        </div>

        {/* Headlines */}
        <div className="space-y-2">
          <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
            {getTitle()}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {getDescription()}
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <button
            id="prompt-create-account-button"
            onClick={() => {
              onClose();
              handleSignup();
            }}
            className="w-full rounded-2xl bg-[#8B2F4A] py-3 text-xs font-semibold text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-colors shadow-sm cursor-pointer"
          >
            Create Account
          </button>

          <button
            id="prompt-login-button"
            onClick={() => {
              onClose();
              handleLogin();
            }}
            className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/50 py-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
          >
            Already have an account? <span className="text-[#8B2F4A] dark:text-[#E06C88] underline">Log In</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

