import React, { useState } from 'react';
import { LyricCard } from '../components/LyricCard';
import { EditProfileModal } from '../components/EditProfileModal';
import { Lyric } from '../types';
import { User, Bookmark, Calendar, Feather, Edit3, LogOut, Lock, PlusCircle, LogIn, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ProfileViewProps {
  lyrics: Lyric[];
  onSelectLyric: (lyric: Lyric) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onOpenCreateModal: () => void;
  onOpenLogin: () => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  lyrics,
  onSelectLyric,
  onToggleLike,
  onToggleSave,
  onOpenCreateModal,
  onOpenLogin,
  onOpenReadingMode,
  showToast,
  isDarkMode,
  setIsDarkMode,
}) => {
  const { isAuthenticated, user, profile, signOut } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'created' | 'saved'>('created');

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto inline-flex items-center justify-center p-4 rounded-3xl bg-[#8B2F4A]/10 text-[#8B2F4A] dark:text-[#E06C88]">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
          Your Profile & Account
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          Sign up or log in to manage your personal profile, view your additions, and sync saved lyrics.
        </p>

        {/* Theme Switcher for Guests */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="profile-login-cta"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#8B2F4A] px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all cursor-pointer"
          >
            <LogIn className="h-4 w-4" />
            <span>Log In to Your Profile</span>
          </button>

          <button
            id="profile-theme-toggle-guest"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-5 py-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Switch to Light Theme</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-700" />
                <span>Switch to Dark Theme</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const avatar = profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const name = profile?.display_name || 'LyricVault Creator';
  const handle = profile?.username ? `@${profile.username}` : user?.email ? `@${user.email.split('@')[0]}` : '@user';
  const bio = profile?.bio || 'Collector of meaningful verses and original lyrics.';
  const joinedDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

  const userSavedLyrics = lyrics.filter((l) => l.is_saved);
  const userCreatedLyrics = lyrics.filter(
    (l) =>
      l.created_by.handle === handle ||
      (user && l.created_by.handle.toLowerCase().includes(user.id.substring(0, 8))) ||
      l.created_by.name === name
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8">
      {/* Profile Header Box */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="h-24 w-24 rounded-full object-cover border-2 border-[#8B2F4A] shadow-md"
            />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-[#8B2F4A] text-white flex items-center justify-center border-2 border-white dark:border-zinc-900">
              <Feather className="h-3 w-3" />
            </span>
          </div>

          {/* User Bio Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
                {name}
              </h1>
              <span className="rounded-full bg-[var(--bg-muted)] px-3 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                {handle}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed">
              {bio}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-[var(--text-secondary)] pt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined {joinedDate}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              id="profile-theme-toggle-button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors shadow-xs cursor-pointer"
              title={isDarkMode ? 'Switch to Light Editorial Theme' : 'Switch to High-Contrast Dark Mode'}
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span>Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-700" />
                  <span>Dark Theme</span>
                </>
              )}
            </button>

            <button
              id="edit-profile-button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/50 px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              id="profile-logout-button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* User Stats Row */}
        <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[var(--border-color)]/60 pt-6 text-center">
          <div className="rounded-2xl bg-[var(--bg-muted)]/50 p-3 border border-[var(--border-color)]/40">
            <span className="font-editorial text-2xl font-bold text-[var(--text-primary)] block">
              {userCreatedLyrics.length}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">My Additions</span>
          </div>

          <div className="rounded-2xl bg-[var(--bg-muted)]/50 p-3 border border-[var(--border-color)]/40">
            <span className="font-editorial text-2xl font-bold text-[var(--text-primary)] block">
              {userSavedLyrics.length}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Saved Words</span>
          </div>

          <div className="rounded-2xl bg-[var(--bg-muted)]/50 p-3 border border-[var(--border-color)]/40">
            <span className="font-editorial text-2xl font-bold text-[var(--text-primary)] block">
              1
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Collections</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              id="profile-tab-created"
              onClick={() => setActiveTab('created')}
              className={`flex items-center gap-1.5 font-editorial text-base sm:text-lg font-bold transition-colors ${
                activeTab === 'created'
                  ? 'text-[#8B2F4A] dark:text-[#E06C88]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Feather className="h-4 w-4" />
              <span>My Additions ({userCreatedLyrics.length})</span>
            </button>

            <span className="text-[var(--text-secondary)] opacity-40">|</span>

            <button
              id="profile-tab-saved"
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 font-editorial text-base sm:text-lg font-bold transition-colors ${
                activeTab === 'saved'
                  ? 'text-[#8B2F4A] dark:text-[#E06C88]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              <span>Saved Lyrics ({userSavedLyrics.length})</span>
            </button>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#8B2F4A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="whitespace-nowrap">Save Lyric</span>
          </button>
        </div>

        {/* List */}
        {activeTab === 'created' ? (
          userCreatedLyrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {userCreatedLyrics.map((lyric) => (
                <LyricCard
                  key={lyric.id}
                  lyric={lyric}
                  onSelectLyric={onSelectLyric}
                  onToggleLike={onToggleLike}
                  onToggleSave={onToggleSave}
                  onOpenReadingMode={onOpenReadingMode}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--border-color)] p-12 text-center space-y-4">
              <Feather className="h-8 w-8 mx-auto text-[var(--text-secondary)] opacity-50" />
              <h3 className="font-editorial text-xl font-bold text-[var(--text-primary)]">No additions yet</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Save your favorite song stanzas, excerpts, or original lyrics to build your personal library.
              </p>
              <button
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#8B2F4A] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Save Your First Lyric</span>
              </button>
            </div>
          )
        ) : (
          userSavedLyrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {userSavedLyrics.map((lyric) => (
                <LyricCard
                  key={lyric.id}
                  lyric={lyric}
                  onSelectLyric={onSelectLyric}
                  onToggleLike={onToggleLike}
                  onToggleSave={onToggleSave}
                  onOpenReadingMode={onOpenReadingMode}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--border-color)] p-12 text-center space-y-4">
              <Bookmark className="h-8 w-8 mx-auto text-[var(--text-secondary)] opacity-50" />
              <h3 className="font-editorial text-xl font-bold text-[var(--text-primary)]">No saved lyrics</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                Bookmark public lyrics as you discover them across LyricVault.
              </p>
            </div>
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};
