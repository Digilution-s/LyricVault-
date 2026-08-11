import React, { useState } from 'react';
import { PlusCircle, Search, Feather, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenCreateModal: () => void;
  isDarkMode?: boolean;
  setIsDarkMode?: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onOpenLogin?: () => void;
  onOpenSignup?: () => void;
  onOpenAuthPrompt: (context?: 'save' | 'bookmark' | 'note') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenCreateModal,
  searchQuery,
  setSearchQuery,
  onOpenAuthPrompt,
}) => {
  const { isAuthenticated } = useAuth();
  const [showSearchInput, setShowSearchInput] = useState(false);

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      onOpenAuthPrompt('save');
    } else {
      onOpenCreateModal();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          id="brand-logo-button"
          onClick={() => setCurrentTab('home')}
          className="group flex items-center gap-2 text-left transition-opacity hover:opacity-90 shrink-0 cursor-pointer"
        >
          <img
            src="/logo.svg"
            alt="LyricVault Logo"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-cover shadow-xs transition-transform group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <span className={`font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] ${showSearchInput ? 'hidden sm:inline' : 'inline'}`}>
            LyricVault
          </span>
        </button>

        {/* Action Controls: Search & Save ONLY */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Quick Search */}
          <div className="relative flex items-center min-w-0">
            {showSearchInput ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCurrentTab('discover');
                }}
                className="relative flex items-center min-w-0"
              >
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--text-secondary)] pointer-events-none" />
                <input
                  id="navbar-search-input"
                  type="text"
                  placeholder="Search lyrics..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (currentTab !== 'discover') {
                      setCurrentTab('discover');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setCurrentTab('discover');
                    }
                  }}
                  autoFocus
                  className="w-28 xs:w-40 sm:w-64 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] py-1.5 pl-8 pr-7 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none focus:ring-1 focus:ring-[#8B2F4A] shadow-xs truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2 h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center justify-center"
                  title="Close Search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <button
                id="navbar-search-toggle"
                onClick={() => {
                  setShowSearchInput(true);
                  if (currentTab !== 'discover') {
                    setCurrentTab('discover');
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors shadow-xs cursor-pointer"
                title="Search Lyrics"
              >
                <Search className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
                <span className="hidden sm:inline">Search</span>
              </button>
            )}
          </div>

          {/* Save Button */}
          <button
            id="create-lyric-button-header"
            onClick={handleCreateClick}
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-[#8B2F4A] px-3 sm:px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#72253c] active:scale-95 dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d65775] cursor-pointer shrink-0"
          >
            <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </header>
  );
};

