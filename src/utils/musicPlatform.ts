export type MusicPlatformType =
  | 'spotify'
  | 'youtube'
  | 'youtube_music'
  | 'apple_music'
  | 'soundcloud'
  | 'amazon_music'
  | 'tidal'
  | 'deezer'
  | 'bandcamp'
  | 'other';

export interface MusicPlatformConfig {
  id: MusicPlatformType;
  name: string;
  label: string;
  color: string;
  brandBg: string;
  brandText: string;
}

export function detectMusicPlatform(url?: string | null): MusicPlatformConfig {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      id: 'other',
      name: 'Music Link',
      label: 'Open Song Link',
      color: 'bg-[var(--bg-muted)] text-[var(--text-primary)] border-[var(--border-color)]',
      brandBg: 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900',
      brandText: 'text-zinc-800 dark:text-zinc-200',
    };
  }

  const cleanUrl = url.trim().toLowerCase();

  if (cleanUrl.includes('music.youtube.com')) {
    return {
      id: 'youtube_music',
      name: 'YouTube Music',
      label: 'Open in YouTube Music',
      color: 'bg-red-600/10 text-red-600 dark:text-red-400 border-red-500/30',
      brandBg: 'bg-red-600 text-white hover:bg-red-700',
      brandText: 'text-red-600 dark:text-red-400',
    };
  }

  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    return {
      id: 'youtube',
      name: 'YouTube',
      label: 'Watch on YouTube',
      color: 'bg-red-600/10 text-red-600 dark:text-red-400 border-red-500/30',
      brandBg: 'bg-red-600 text-white hover:bg-red-700',
      brandText: 'text-red-600 dark:text-red-400',
    };
  }

  if (cleanUrl.includes('spotify.com')) {
    return {
      id: 'spotify',
      name: 'Spotify',
      label: 'Open in Spotify',
      color: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      brandBg: 'bg-[#1DB954] text-black font-semibold hover:bg-[#1aa34a]',
      brandText: 'text-[#1DB954]',
    };
  }

  if (cleanUrl.includes('music.apple.com') || cleanUrl.includes('apple.com')) {
    return {
      id: 'apple_music',
      name: 'Apple Music',
      label: 'Open in Apple Music',
      color: 'bg-pink-600/10 text-pink-600 dark:text-pink-400 border-pink-500/30',
      brandBg: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white hover:from-pink-600 hover:to-rose-700',
      brandText: 'text-pink-500',
    };
  }

  if (cleanUrl.includes('soundcloud.com')) {
    return {
      id: 'soundcloud',
      name: 'SoundCloud',
      label: 'Open in SoundCloud',
      color: 'bg-orange-600/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
      brandBg: 'bg-[#FF5500] text-white hover:bg-[#e04b00]',
      brandText: 'text-[#FF5500]',
    };
  }

  if (cleanUrl.includes('music.amazon.com') || cleanUrl.includes('amazon.com')) {
    return {
      id: 'amazon_music',
      name: 'Amazon Music',
      label: 'Open in Amazon Music',
      color: 'bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
      brandBg: 'bg-[#00A8E1] text-white hover:bg-[#0092c4]',
      brandText: 'text-[#00A8E1]',
    };
  }

  if (cleanUrl.includes('tidal.com')) {
    return {
      id: 'tidal',
      name: 'Tidal',
      label: 'Open on Tidal',
      color: 'bg-sky-600/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
      brandBg: 'bg-black text-white hover:bg-zinc-800 border border-zinc-700',
      brandText: 'text-sky-400',
    };
  }

  if (cleanUrl.includes('deezer.com')) {
    return {
      id: 'deezer',
      name: 'Deezer',
      label: 'Open in Deezer',
      color: 'bg-purple-600/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
      brandBg: 'bg-purple-600 text-white hover:bg-purple-700',
      brandText: 'text-purple-500',
    };
  }

  if (cleanUrl.includes('bandcamp.com')) {
    return {
      id: 'bandcamp',
      name: 'Bandcamp',
      label: 'Listen on Bandcamp',
      color: 'bg-teal-600/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      brandBg: 'bg-[#629aa9] text-white hover:bg-[#528391]',
      brandText: 'text-[#629aa9]',
    };
  }

  return {
    id: 'other',
    name: 'Music Link',
    label: 'Open Song Link',
    color: 'bg-[var(--bg-muted)] text-[var(--text-primary)] border-[var(--border-color)]',
    brandBg: 'bg-[#8B2F4A] text-white hover:bg-[#72253c]',
    brandText: 'text-[#8B2F4A]',
  };
}

export function parseSongLinks(song_link?: string | null, song_links?: string[] | null): string[] {
  const result: string[] = [];

  if (Array.isArray(song_links)) {
    for (const link of song_links) {
      if (typeof link === 'string' && link.trim() && !result.includes(link.trim())) {
        result.push(link.trim());
      }
    }
  }

  if (song_link && typeof song_link === 'string' && song_link.trim()) {
    const split = song_link.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    for (const item of split) {
      if (item.length > 0 && !result.includes(item)) {
        result.push(item);
      }
    }
  }

  return result;
}
