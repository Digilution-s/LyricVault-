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
  onOpenAuthPrompt: (context?: 'save' | 'bookmark') => void;
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
          className="group flex items-center gap-2.5 text-left transition-opacity hover:opacity-90 shrink-0 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B2F4A] text-white shadow-sm shadow-[#8B2F4A]/20 transition-transform group-hover:scale-105">
            <Feather className="h-5 w-5" />
          </div>
          <span className="font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            LyricVault
          </span>
        </button>

        {/* Action Controls: Search & Save ONLY */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Search */}
          <div className="relative flex items-center">
            {showSearchInput ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setCurrentTab('discover');
                }}
                className="relative flex items-center"
              >
                <Search className="absolute left-3 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
                <input
                  id="navbar-search-input"
                  type="text"
                  placeholder="Search lyrics, moods, artists..."
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
                  className="w-44 sm:w-64 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] py-1.5 pl-9 pr-8 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none focus:ring-1 focus:ring-[#8B2F4A] shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchInput(false);
                    setSearchQuery('');
                  }}
                  className="absolute right-2.5 h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors shadow-xs cursor-pointer"
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
            className="inline-flex items-center gap-1.5 rounded-full bg-[#8B2F4A] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#72253c] active:scale-95 dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d65775] cursor-pointer shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </header>
  );
};

