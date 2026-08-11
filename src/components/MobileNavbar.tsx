import React from 'react';
import { Compass, Library, Plus, FolderHeart, User, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface MobileNavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  onOpenLogin: () => void;
  onOpenAuthPrompt: (context?: 'save' | 'bookmark' | 'note') => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenCreateModal,
  onOpenLogin,
  onOpenAuthPrompt,
}) => {
  const { isAuthenticated } = useAuth();

  const handleAction = (tab: string, requireAuth: boolean = false) => {
    if (requireAuth && !isAuthenticated) {
      onOpenAuthPrompt('save');
    } else {
      setCurrentTab(tab);
    }
  };

  const handleSaveClick = () => {
    if (!isAuthenticated) {
      onOpenAuthPrompt('save');
    } else {
      onOpenCreateModal();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t md:border border-[var(--border-color)] bg-[var(--bg-surface)]/95 px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] md:py-2 backdrop-blur-md shadow-lg md:shadow-2xl md:bottom-5 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-full transition-all">
      <div className="grid grid-cols-5 items-center justify-items-center w-full max-w-md mx-auto">
        {/* Discover */}
        <button
          id="mobile-nav-home"
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 min-w-[48px] min-h-[48px] text-[11px] font-semibold transition-all active:scale-95 ${
            currentTab === 'home'
              ? 'text-[#8B2F4A] dark:text-[#E06C88]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Compass className={`h-5 w-5 transition-transform ${currentTab === 'home' ? 'scale-110 stroke-[2.2]' : ''}`} />
          <span>Discover</span>
        </button>

        {/* Collections */}
        <button
          id="mobile-nav-collections"
          onClick={() => setCurrentTab('collections')}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 min-w-[48px] min-h-[48px] text-[11px] font-semibold transition-all active:scale-95 ${
            currentTab === 'collections'
              ? 'text-[#8B2F4A] dark:text-[#E06C88]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FolderHeart className={`h-5 w-5 transition-transform ${currentTab === 'collections' ? 'scale-110 stroke-[2.2]' : ''}`} />
          <span>Collections</span>
        </button>

        {/* Prominent Save Button (Dead Center in Middle Column) */}
        <button
          id="mobile-nav-save-cta"
          onClick={handleSaveClick}
          className="-mt-5 flex h-13 w-13 items-center justify-center rounded-full bg-[#8B2F4A] text-white shadow-lg shadow-[#8B2F4A]/35 transition-transform active:scale-90 dark:bg-[#E06C88] dark:text-zinc-950 ring-4 ring-[var(--bg-primary)]"
          title="Save Lyric"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* Library */}
        <button
          id="mobile-nav-library"
          onClick={() => handleAction('library', true)}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 min-w-[48px] min-h-[48px] text-[11px] font-semibold transition-all active:scale-95 ${
            currentTab === 'library'
              ? 'text-[#8B2F4A] dark:text-[#E06C88]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Library className={`h-5 w-5 transition-transform ${currentTab === 'library' ? 'scale-110 stroke-[2.2]' : ''}`} />
          <span>Library</span>
        </button>

        {/* Profile / Login */}
        {isAuthenticated ? (
          <button
            id="mobile-nav-profile"
            onClick={() => setCurrentTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 min-w-[48px] min-h-[48px] text-[11px] font-semibold transition-all active:scale-95 ${
              currentTab === 'profile'
                ? 'text-[#8B2F4A] dark:text-[#E06C88]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <User className={`h-5 w-5 transition-transform ${currentTab === 'profile' ? 'scale-110 stroke-[2.2]' : ''}`} />
            <span>Profile</span>
          </button>
        ) : (
          <button
            id="mobile-nav-login"
            onClick={onOpenLogin}
            className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 min-w-[48px] min-h-[48px] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
          >
            <LogIn className="h-5 w-5" />
            <span>Log In</span>
          </button>
        )}
      </div>
    </div>
  );
};
