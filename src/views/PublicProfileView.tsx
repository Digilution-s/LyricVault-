import React, { useState, useEffect } from 'react';
import { User, Calendar, Feather, Sparkles, AlertCircle, ArrowLeft, Loader2, Music, Bookmark } from 'lucide-react';
import { LyricCard } from '../components/LyricCard';
import { Lyric, UserProfileData } from '../types';
import { profileService } from '../services/profileService';
import { useAuth } from '../hooks/useAuth';

interface PublicProfileViewProps {
  username: string;
  onSelectLyric: (lyric: Lyric) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
  onNavigateDiscover: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  username,
  onSelectLyric,
  onToggleLike,
  onToggleSave,
  onOpenAddToCollection,
  onOpenReadingMode,
  onNavigateDiscover,
  showToast,
}) => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [publicLyrics, setPublicLyrics] = useState<Lyric[]>([]);
  const [publicLyricsCount, setPublicLyricsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchPublicProfile = async () => {
    setIsLoading(true);
    setNotFound(false);
    setIsError(false);

    try {
      const cleanHandle = username.replace(/^@/, '').trim();
      const profile = await profileService.getProfileByUsername(cleanHandle);

      if (!profile) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setProfileData(profile);

      // Fetch stats & public lyrics in parallel
      const [stats, lyricsList] = await Promise.all([
        profileService.getPublicProfileStats(profile.id),
        profileService.getPublicUserLyrics(profile.id, user?.id),
      ]);

      setPublicLyricsCount(stats.publicLyricsCount);
      setPublicLyrics(lyricsList);
    } catch (err: any) {
      console.error('Failed to load public profile:', err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      fetchPublicProfile();
    }
  }, [username, user?.id]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8 animate-pulse">
        {/* Profile Card Skeleton */}
        <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="h-24 w-24 rounded-full bg-[var(--bg-muted)] shrink-0" />
            <div className="flex-1 space-y-3 text-center sm:text-left w-full">
              <div className="h-7 w-48 bg-[var(--bg-muted)] rounded-lg mx-auto sm:mx-0" />
              <div className="h-4 w-24 bg-[var(--bg-muted)] rounded-full mx-auto sm:mx-0" />
              <div className="h-10 w-full max-w-md bg-[var(--bg-muted)] rounded-lg mx-auto sm:mx-0" />
              <div className="h-4 w-32 bg-[var(--bg-muted)] rounded-lg mx-auto sm:mx-0" />
            </div>
          </div>
          <div className="border-t border-[var(--border-color)]/60 pt-6">
            <div className="h-12 w-32 bg-[var(--bg-muted)] rounded-2xl mx-auto sm:mx-0" />
          </div>
        </div>

        {/* Lyric Grid Skeleton */}
        <div className="space-y-4">
          <div className="h-6 w-36 bg-[var(--bg-muted)] rounded-md" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-[var(--bg-muted)]/60 border border-[var(--border-color)]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto inline-flex items-center justify-center p-4 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
          Creator not found
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          This profile may have been removed or the username may be incorrect.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            id="not-found-back-to-discover"
            onClick={onNavigateDiscover}
            className="inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Discover</span>
          </button>
        </div>
      </div>
    );
  }

  // Error State
  if (isError || !profileData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-6">
        <div className="mx-auto inline-flex items-center justify-center p-4 rounded-3xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
          Unable to load this profile.
        </h1>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          We encountered a problem connecting to the server. Please try again.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            id="retry-load-profile-button"
            onClick={fetchPublicProfile}
            className="inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-6 py-3 text-xs font-semibold text-white shadow-md hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
          >
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // Formatting profile values
  const displayName = profileData.display_name || 'LyricVault Creator';
  const handle = `@${profileData.username}`;
  const bio = profileData.bio || 'No bio yet.';
  const joinedDate = profileData.created_at
    ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';
  const avatar = profileData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=8B2F4A&color=fff&size=150`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8 animate-fadeIn">
      {/* Back Button */}
      <button
        id="public-profile-back-button"
        onClick={onNavigateDiscover}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Discover</span>
      </button>

      {/* Public Profile Header Box */}
      <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative">
            <img
              src={avatar}
              alt={displayName}
              className="h-24 w-24 rounded-full object-cover border-2 border-[#8B2F4A] shadow-md"
              onError={(e) => {
                // Fallback on image load error
                (e.target as HTMLElement).setAttribute(
                  'src',
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=8B2F4A&color=fff&size=150`
                );
              }}
            />
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-[#8B2F4A] text-white flex items-center justify-center border-2 border-white dark:border-zinc-900">
              <Feather className="h-3 w-3" />
            </span>
          </div>

          {/* Creator Details */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="font-editorial text-3xl font-bold text-[var(--text-primary)]">
                {displayName}
              </h1>
              <span className="rounded-full bg-[var(--bg-muted)] px-3 py-0.5 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88]">
                {handle}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed italic">
              {bio}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-[var(--text-secondary)] pt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined {joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Public Stats Row */}
        <div className="mt-8 border-t border-[var(--border-color)]/60 pt-6 flex items-center justify-center sm:justify-start">
          <div className="rounded-2xl bg-[var(--bg-muted)]/50 px-5 py-3 border border-[var(--border-color)]/40 inline-flex items-center gap-3">
            <Feather className="h-5 w-5 text-[#8B2F4A] dark:text-[#E06C88]" />
            <div>
              <span className="font-editorial text-2xl font-bold text-[var(--text-primary)] leading-none block">
                {publicLyricsCount}
              </span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">Public Lyrics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Public Lyrics Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <Feather className="h-5 w-5 text-[#8B2F4A] dark:text-[#E06C88]" />
            <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
              Public Lyrics
            </h2>
            <span className="rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
              {publicLyrics.length}
            </span>
          </div>
        </div>

        {/* Lyrics Grid or Empty State */}
        {publicLyrics.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {publicLyrics.map((lyric) => (
              <LyricCard
                key={lyric.id}
                lyric={lyric}
                onSelectLyric={onSelectLyric}
                onToggleLike={onToggleLike}
                onToggleSave={onToggleSave}
                onOpenAddToCollection={onOpenAddToCollection}
                onOpenReadingMode={onOpenReadingMode}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[var(--border-color)] p-12 text-center space-y-3">
            <Feather className="h-8 w-8 mx-auto text-[var(--text-secondary)] opacity-50" />
            <h3 className="font-editorial text-xl font-bold text-[var(--text-primary)]">
              No public lyrics yet.
            </h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
              This creator hasn't published any public lyrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
