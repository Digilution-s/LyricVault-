import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LyricCard } from '../components/LyricCard';
import { EmptyState } from '../components/EmptyState';
import { Lyric, MoodType, ThemeType, ContentType } from '../types';
import { MOODS, THEMES, GENRES } from '../data/demoData';
import { lyricsService, SearchLyricsParams } from '../services/lyricsService';
import { useAuth } from '../hooks/useAuth';
import {
  Search,
  SlidersHorizontal,
  X,
  Compass,
  ArrowUpDown,
  Loader2,
  Filter,
  Sparkles,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';

interface DiscoverViewProps {
  lyrics?: Lyric[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  initialMoodFilter?: MoodType;
  initialThemeFilter?: ThemeType;
  initialGenreFilter?: string;
  initialContentTypeFilter?: string;
  onSelectLyric: (lyric: Lyric) => void;
  onSelectCreator?: (username: string) => void;
  onToggleLike: (e: React.MouseEvent, id: string) => void;
  onToggleSave: (e: React.MouseEvent, id: string) => void;
  onOpenCreateModal: () => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  onOpenReadingMode?: (lyric: Lyric) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  searchQuery,
  setSearchQuery,
  initialMoodFilter,
  initialThemeFilter,
  initialGenreFilter,
  initialContentTypeFilter,
  onSelectLyric,
  onSelectCreator,
  onToggleLike,
  onToggleSave,
  onOpenCreateModal,
  onOpenAddToCollection,
  onOpenReadingMode,
}) => {
  const { user } = useAuth();

  // Filters State
  const [selectedMood, setSelectedMood] = useState<string>(initialMoodFilter || 'All');
  const [selectedTheme, setSelectedTheme] = useState<string>(initialThemeFilter || 'All');
  const [selectedType, setSelectedType] = useState<string>(initialContentTypeFilter || 'All');
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenreFilter || 'All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_bookmarked' | 'trending'>('newest');

  // Debounced input query
  const [debouncedQuery, setDebouncedQuery] = useState<string>(searchQuery);

  // Pagination & Loading
  const [lyricsList, setLyricsList] = useState<Lyric[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const LIMIT = 20;

  // Mobile Filter Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Parse URL search parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    const mood = urlParams.get('mood');
    const theme = urlParams.get('theme');
    const type = urlParams.get('type');
    const genre = urlParams.get('genre');
    const sort = urlParams.get('sort');

    if (q) {
      setSearchQuery(q);
      setDebouncedQuery(q);
    }
    if (mood) setSelectedMood(mood);
    if (theme) setSelectedTheme(theme);
    if (type) setSelectedType(type);
    if (genre) setSelectedGenre(genre);
    if (sort === 'oldest' || sort === 'most_bookmarked' || sort === 'newest') {
      setSortBy(sort);
    }
  }, []);

  // Update URL search parameters whenever filters change
  const updateUrlParams = useCallback(
    (q: string, mood: string, theme: string, type: string, genre: string, sort: string) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (mood !== 'All') params.set('mood', mood);
      if (theme !== 'All') params.set('theme', theme);
      if (type !== 'All') params.set('type', type);
      if (genre !== 'All') params.set('genre', genre);
      if (sort !== 'newest') params.set('sort', sort);

      const queryString = params.toString();
      const newUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    },
    []
  );

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch initial or filtered lyrics from Supabase
  const executeSearch = async (resetOffset = true) => {
    const targetOffset = resetOffset ? 0 : offset;
    if (resetOffset) {
      setIsLoading(true);
      setOffset(0);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const searchParams: SearchLyricsParams = {
        query: debouncedQuery,
        mood: selectedMood,
        theme: selectedTheme,
        contentType: selectedType,
        genre: selectedGenre,
        sortBy,
        limit: LIMIT,
        offset: targetOffset,
        currentUserId: user?.id,
      };

      const result = await lyricsService.searchLyrics(searchParams);

      if (resetOffset) {
        setLyricsList(result.lyrics);
      } else {
        setLyricsList((prev) => [...prev, ...result.lyrics]);
      }
      setTotalCount(result.totalCount);

      // Sync URL
      updateUrlParams(debouncedQuery, selectedMood, selectedTheme, selectedType, selectedGenre, sortBy);
    } catch (err) {
      console.error('Error executing search in DiscoverView:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Re-run search whenever any filter or debounced query changes
  useEffect(() => {
    executeSearch(true);
  }, [debouncedQuery, selectedMood, selectedTheme, selectedType, selectedGenre, sortBy, user?.id]);

  // Load More Handler
  const handleLoadMore = () => {
    const nextOffset = offset + LIMIT;
    setOffset(nextOffset);

    // Call service with nextOffset
    const fetchNextBatch = async () => {
      setIsLoadingMore(true);
      try {
        const searchParams: SearchLyricsParams = {
          query: debouncedQuery,
          mood: selectedMood,
          theme: selectedTheme,
          contentType: selectedType,
          genre: selectedGenre,
          sortBy,
          limit: LIMIT,
          offset: nextOffset,
          currentUserId: user?.id,
        };
        const result = await lyricsService.searchLyrics(searchParams);
        setLyricsList((prev) => [...prev, ...result.lyrics]);
        setTotalCount(result.totalCount);
      } catch (err) {
        console.error('Error loading more lyrics:', err);
      } finally {
        setIsLoadingMore(false);
      }
    };

    fetchNextBatch();
  };

  // Clear all active filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedMood('All');
    setSelectedTheme('All');
    setSelectedType('All');
    setSelectedGenre('All');
    setSortBy('newest');
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedMood !== 'All' ||
    selectedTheme !== 'All' ||
    selectedType !== 'All' ||
    selectedGenre !== 'All' ||
    sortBy !== 'newest';

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedMood !== 'All' ? 1 : 0) +
    (selectedTheme !== 'All' ? 1 : 0) +
    (selectedType !== 'All' ? 1 : 0) +
    (selectedGenre !== 'All' ? 1 : 0) +
    (sortBy !== 'newest' ? 1 : 0);

  const contentTypes = ['All', 'Lyric', 'Poetry', 'Quote', 'Excerpt', 'Song Verse'];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 pb-32 sm:pb-24 space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] uppercase tracking-wider">
          <Compass className="h-4 w-4" />
          <span>Lyric Vault Explorer</span>
        </div>
        <h1 className="mt-1 font-editorial text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
          Discover Lyrics
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
          Find words that resonate with you.
        </p>
      </div>

      {/* Search & Filter Control Station */}
      <div className="space-y-5 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-xs">
        {/* Prominent Search Bar */}
        <div className="relative flex items-center gap-3">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="relative flex-1"
          >
            <button
              type="submit"
              id="discover-search-submit-button"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[#8B2F4A] transition-colors cursor-pointer"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <input
              id="discover-search-input"
              type="text"
              placeholder="Search lyrics, songs, artists, or words..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] py-3 pl-11 pr-10 text-xs sm:text-sm text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none focus:ring-1 focus:ring-[#8B2F4A]"
            />
            {searchQuery && (
              <button
                type="button"
                id="clear-search-query-button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-full"
                title="Clear Search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Mobile Filter Trigger Button */}
          <button
            id="mobile-filter-drawer-button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-3 text-xs font-semibold text-[var(--text-primary)] md:hidden hover:bg-[var(--bg-surface)] transition-colors relative shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88]" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B2F4A] text-[10px] font-bold text-white dark:bg-[#E06C88] dark:text-zinc-950">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Desktop Filter Bar */}
        <div className="hidden md:space-y-4">
          {/* Format / Content Type */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-medium text-[var(--text-secondary)] w-16 shrink-0">Format:</span>
            {contentTypes.map((type) => (
              <button
                key={type}
                id={`filter-type-${type.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedType(type)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all shrink-0 ${
                  selectedType === type
                    ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 font-semibold shadow-xs'
                    : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Mood Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-medium text-[var(--text-secondary)] w-16 shrink-0">Mood:</span>
            <button
              id="filter-mood-all"
              onClick={() => setSelectedMood('All')}
              className={`rounded-full px-3 py-1 text-xs font-medium shrink-0 transition-all ${
                selectedMood === 'All'
                  ? 'bg-[#8B2F4A]/10 text-[#8B2F4A] font-semibold dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All Moods
            </button>
            {MOODS.map((m) => (
              <button
                key={m.id}
                id={`filter-mood-${m.id.toLowerCase()}`}
                onClick={() => setSelectedMood(m.id)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium shrink-0 transition-all ${
                  selectedMood === m.id
                    ? 'bg-[#8B2F4A] text-white border-[#8B2F4A] dark:bg-[#E06C88] dark:text-zinc-950 font-semibold shadow-xs'
                    : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border-color)]'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Theme & Genre Selectors + Sort */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[var(--border-color)]/60">
            <div className="flex flex-wrap items-center gap-3">
              {/* Theme Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--text-secondary)]">Theme:</span>
                <select
                  id="filter-theme-select"
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                >
                  <option value="All">All Themes</option>
                  {THEMES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Genre Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--text-secondary)]">Genre:</span>
                <select
                  id="filter-genre-select"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                >
                  <option value="All">All Genres</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
              <span className="text-[var(--text-secondary)]">Sort by:</span>
              <select
                id="filter-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="trending">🔥 Trending</option>
                <option value="most_bookmarked">Most Bookmarked</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-color)]/60">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] mr-1">Active filters:</span>

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#8B2F4A]/10 text-[#8B2F4A] dark:bg-[#E06C88]/20 dark:text-[#E06C88] px-2.5 py-1 text-[11px] font-semibold">
                Search: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 hover:opacity-75"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedType !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]">
                Format: {selectedType}
                <button onClick={() => setSelectedType('All')} className="p-0.5 hover:text-rose-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedMood !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]">
                Mood: {selectedMood}
                <button onClick={() => setSelectedMood('All')} className="p-0.5 hover:text-rose-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedTheme !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]">
                Theme: {selectedTheme}
                <button onClick={() => setSelectedTheme('All')} className="p-0.5 hover:text-rose-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {selectedGenre !== 'All' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]">
                Genre: {selectedGenre}
                <button onClick={() => setSelectedGenre('All')} className="p-0.5 hover:text-rose-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {sortBy !== 'newest' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]">
                Sort: {sortBy === 'oldest' ? 'Oldest' : 'Most Bookmarked'}
                <button onClick={() => setSortBy('newest')} className="p-0.5 hover:text-rose-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button
              id="clear-all-filters-button"
              onClick={clearAllFilters}
              className="ml-auto text-xs font-semibold text-[#8B2F4A] dark:text-[#E06C88] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear all filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] px-1">
        <span>
          {isLoading ? (
            'Searching Database...'
          ) : (
            <>
              Showing <strong className="text-[var(--text-primary)]">{lyricsList.length}</strong> of{' '}
              <strong className="text-[var(--text-primary)]">{totalCount}</strong> {totalCount === 1 ? 'lyric' : 'lyrics'}
            </>
          )}
        </span>
      </div>

      {/* Results Content Grid */}
      {isLoading ? (
        /* Skeleton Grid Loading State */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 animate-pulse space-y-4"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-[var(--bg-muted)] rounded-full" />
                <div className="h-4 w-12 bg-[var(--bg-muted)] rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-[var(--bg-muted)] rounded-lg" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-[var(--bg-muted)] rounded" />
                <div className="h-3 w-5/6 bg-[var(--bg-muted)] rounded" />
                <div className="h-3 w-4/6 bg-[var(--bg-muted)] rounded" />
              </div>
              <div className="pt-4 flex justify-between items-center border-t border-[var(--border-color)]/50">
                <div className="h-8 w-8 bg-[var(--bg-muted)] rounded-full" />
                <div className="h-4 w-16 bg-[var(--bg-muted)] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : lyricsList.length > 0 ? (
        /* Real Lyric Cards Grid */
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {lyricsList.map((lyric) => (
              <LyricCard
                key={lyric.id}
                lyric={lyric}
                onSelectLyric={onSelectLyric}
                onSelectCreator={onSelectCreator}
                onToggleLike={(e, id) => {
                  onToggleLike(e, id);
                  setLyricsList((prev) =>
                    prev.map((l) => {
                      if (l.id === id) {
                        const newLiked = !l.is_liked;
                        return {
                          ...l,
                          is_liked: newLiked,
                          likes_count: newLiked ? (l.likes_count ?? 0) + 1 : Math.max(0, (l.likes_count ?? 1) - 1),
                        };
                      }
                      return l;
                    })
                  );
                }}
                onToggleSave={(e, id) => {
                  onToggleSave(e, id);
                  // Optimistically update bookmark state in local list
                  setLyricsList((prev) =>
                    prev.map((l) => {
                      if (l.id === id) {
                        const newSaved = !l.is_saved;
                        return {
                          ...l,
                          is_saved: newSaved,
                          saves_count: newSaved ? (l.saves_count ?? 0) + 1 : Math.max(0, (l.saves_count ?? 1) - 1),
                        };
                      }
                      return l;
                    })
                  );
                }}
                onOpenAddToCollection={onOpenAddToCollection}
                onOpenReadingMode={onOpenReadingMode}
              />
            ))}
          </div>

          {/* Pagination / Load More */}
          {lyricsList.length < totalCount && (
            <div className="flex justify-center pt-4">
              <button
                id="load-more-lyrics-button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-3 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-muted)] transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#8B2F4A] dark:text-[#E06C88]" />
                    <span>Loading more lyrics...</span>
                  </>
                ) : (
                  <span>Load More Lyrics ({totalCount - lyricsList.length} remaining)</span>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        hasActiveFilters ? (
          <EmptyState
            title="No lyrics found"
            description="Try another search or remove some filters."
            actionText="Clear Filters"
            onAction={clearAllFilters}
            icon="feather"
          />
        ) : (
          <EmptyState
            title="No lyrics to discover yet."
            description="Be the first to save something meaningful."
            actionText="Save a Lyric"
            onAction={onOpenCreateModal}
            icon="feather"
          />
        )
      )}

      {/* Mobile Filters Drawer / Bottom Sheet */}
      {isMobileDrawerOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setIsMobileDrawerOpen(false)} />

          <div
            className="relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-2 font-editorial text-xl font-bold text-[var(--text-primary)]">
                <SlidersHorizontal className="h-5 w-5 text-[#8B2F4A] dark:text-[#E06C88]" />
                <span>Filter & Sort</span>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Type Format */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Format</label>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
                      selectedType === type
                        ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 font-semibold'
                        : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Moods */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Mood</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedMood('All')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium ${
                    selectedMood === 'All'
                      ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 font-semibold'
                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                  }`}
                >
                  All Moods
                </button>
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMood(m.id)}
                    className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium ${
                      selectedMood === m.id
                        ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 font-semibold'
                        : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Theme</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3 text-xs text-[var(--text-primary)]"
              >
                <option value="All">All Themes</option>
                {THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Genre Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3 text-xs text-[var(--text-primary)]"
              >
                <option value="All">All Genres</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)] p-3 text-xs text-[var(--text-primary)]"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="most_bookmarked">Most Bookmarked</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => {
                  clearAllFilters();
                  setIsMobileDrawerOpen(false);
                }}
                className="w-1/2 rounded-full border border-[var(--border-color)] py-3 text-xs font-semibold text-[var(--text-secondary)]"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-1/2 rounded-full bg-[#8B2F4A] py-3 text-xs font-semibold text-white dark:bg-[#E06C88] dark:text-zinc-950"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
