import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  Check,
  Sparkles,
  ChevronDown,
  Loader2,
  Columns,
  Languages,
  BookOpen,
  Volume2,
  X,
  Search,
} from 'lucide-react';
import { Lyric, LyricTranslation, TranslationType } from '../types';
import { SUPPORTED_TRANSLATIONS, LanguageOption } from '../services/translationService';

interface LyricTranslationBarProps {
  lyric: Lyric;
  activeTranslation: LyricTranslation | null;
  availableTranslations: LyricTranslation[];
  onSelectTranslation: (translation: LyricTranslation | null) => void;
  onRequestTranslation: (targetLanguage: string, type: TranslationType) => Promise<void>;
  isLoading: boolean;
  themeMode?: 'reader' | 'modal' | 'standard';
  currentThemeStyle?: {
    bg: string;
    text: string;
    surface: string;
    border: string;
    accent: string;
    textMuted: string;
  };
  isParallelView?: boolean;
  onToggleParallelView?: () => void;
}

export const LyricTranslationBar: React.FC<LyricTranslationBarProps> = ({
  lyric,
  activeTranslation,
  availableTranslations,
  onSelectTranslation,
  onRequestTranslation,
  isLoading,
  themeMode = 'standard',
  currentThemeStyle,
  isParallelView,
  onToggleParallelView,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'transliteration' | 'translation'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Determine smart quick pills based on song language
  const songLang = (lyric.language || '').toLowerCase();
  
  // Find top suggested transliteration
  let suggestedTransliteration: LanguageOption | undefined = undefined;
  if (songLang.includes('hindi')) {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Hinglish (Roman Hindi)');
  } else if (songLang.includes('assamese') || songLang.includes('asamiya')) {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Roman Assamese');
  } else if (songLang.includes('bengali') || songLang.includes('bangla')) {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Roman Bengali (Banglish)');
  } else if (songLang.includes('urdu')) {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Roman Urdu');
  } else if (songLang.includes('punjabi')) {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Roman Punjabi');
  } else if (songLang.includes('tamil')) {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Roman Tamil');
  } else if (songLang.includes('telugu')) {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Roman Telugu');
  } else {
    suggestedTransliteration = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'Hinglish (Roman Hindi)');
  }

  const englishTranslation = SUPPORTED_TRANSLATIONS.find((t) => t.id === 'English Translation');

  const handlePickLanguage = async (opt: LanguageOption) => {
    setIsDropdownOpen(false);
    setSearchQuery('');

    // Check if translation already exists in available translations
    const existing = availableTranslations.find(
      (t) =>
        t.target_language.toLowerCase() === opt.id.toLowerCase() &&
        t.translation_type === opt.type
    );

    if (existing) {
      onSelectTranslation(existing);
      return;
    }

    // Otherwise, trigger translation / transliteration
    await onRequestTranslation(opt.id, opt.type);
  };

  const isOriginal = !activeTranslation;

  // Custom colors if provided via reader theme
  const surfaceBg = currentThemeStyle?.surface || 'var(--bg-muted)';
  const borderCol = currentThemeStyle?.border || 'var(--border-color)';
  const textCol = currentThemeStyle?.text || 'var(--text-primary)';
  const mutedTextCol = currentThemeStyle?.textMuted || 'var(--text-secondary)';
  const accentCol = currentThemeStyle?.accent || '#8B2F4A';

  // Filter translations for the modal
  const filteredTranslations = SUPPORTED_TRANSLATIONS.filter((opt) => {
    if (selectedFilter !== 'all' && opt.type !== selectedFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.name.toLowerCase().includes(q) ||
      opt.description.toLowerCase().includes(q) ||
      (opt.nativeName && opt.nativeName.toLowerCase().includes(q)) ||
      (opt.popularFor && opt.popularFor.some((p) => p.toLowerCase().includes(q)))
    );
  });

  return (
    <div
      id={`lyric-translation-bar-${lyric.id}`}
      className="w-full rounded-xl border p-2 sm:p-2.5 transition-all select-none"
      style={{
        backgroundColor: themeMode === 'reader' ? surfaceBg : 'var(--bg-surface)',
        borderColor: borderCol,
      }}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b" style={{ borderColor: borderCol }}>
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: textCol }}>
          <Languages className="h-3.5 w-3.5 shrink-0" style={{ color: accentCol }} />
          <span>Script & Translation</span>
          {availableTranslations.length > 0 && (
            <span
              className="px-1.5 py-0.2 rounded-full text-[9px] font-bold border"
              style={{
                borderColor: borderCol,
                backgroundColor: themeMode === 'reader' ? currentThemeStyle?.bg : 'var(--bg-muted)',
                color: mutedTextCol,
              }}
            >
              {availableTranslations.length} saved
            </span>
          )}
        </div>

        {/* Dual / Parallel Lines Toggle */}
        {activeTranslation && onToggleParallelView && (
          <button
            id="toggle-parallel-view-button"
            onClick={onToggleParallelView}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
              isParallelView ? 'shadow-xs font-bold' : 'opacity-80 hover:opacity-100'
            }`}
            style={{
              borderColor: borderCol,
              backgroundColor: isParallelView ? accentCol : 'transparent',
              color: isParallelView ? '#FFFFFF' : textCol,
            }}
            title="Display original script and translated lyrics side-by-side or line-by-line"
          >
            <Columns className="h-3 w-3 shrink-0" />
            <span>Parallel</span>
          </button>
        )}
      </div>

      {/* Quick Switcher Chips */}
      <div className="flex flex-wrap items-center gap-1 pt-2">
        {/* Original Chip */}
        <button
          id={`script-pill-original-${lyric.id}`}
          onClick={() => onSelectTranslation(null)}
          disabled={isLoading}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
            isOriginal
              ? 'shadow-xs font-bold'
              : 'opacity-75 hover:opacity-100'
          }`}
          style={{
            backgroundColor: isOriginal ? accentCol : (themeMode === 'reader' ? currentThemeStyle?.bg : 'var(--bg-muted)'),
            color: isOriginal ? '#FFFFFF' : textCol,
            borderColor: borderCol,
          }}
        >
          <BookOpen className="h-3 w-3 shrink-0" />
          <span>Original</span>
        </button>

        {/* Suggested Transliteration Pill */}
        {suggestedTransliteration && (
          <button
            id={`script-pill-suggested-${lyric.id}`}
            onClick={() => handlePickLanguage(suggestedTransliteration!)}
            disabled={isLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
              activeTranslation?.target_language === suggestedTransliteration.id
                ? 'shadow-xs font-bold'
                : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              backgroundColor:
                activeTranslation?.target_language === suggestedTransliteration.id
                  ? accentCol
                  : (themeMode === 'reader' ? currentThemeStyle?.bg : 'var(--bg-muted)'),
              color:
                activeTranslation?.target_language === suggestedTransliteration.id
                  ? '#FFFFFF'
                  : textCol,
              borderColor: borderCol,
            }}
            title={suggestedTransliteration.description}
          >
            <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
            <span>{suggestedTransliteration.name}</span>
          </button>
        )}

        {/* English Translation Pill */}
        {englishTranslation && (
          <button
            id={`script-pill-english-${lyric.id}`}
            onClick={() => handlePickLanguage(englishTranslation)}
            disabled={isLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 ${
              activeTranslation?.target_language === englishTranslation.id
                ? 'shadow-xs font-bold'
                : 'opacity-75 hover:opacity-100'
            }`}
            style={{
              backgroundColor:
                activeTranslation?.target_language === englishTranslation.id
                  ? accentCol
                  : (themeMode === 'reader' ? currentThemeStyle?.bg : 'var(--bg-muted)'),
              color:
                activeTranslation?.target_language === englishTranslation.id
                  ? '#FFFFFF'
                  : textCol,
              borderColor: borderCol,
            }}
            title={englishTranslation.description}
          >
            <Globe className="h-3 w-3 shrink-0" />
            <span>English</span>
          </button>
        )}

        {/* More Languages / Scripts Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            id={`translate-dropdown-button-${lyric.id}`}
            onClick={() => setIsDropdownOpen(true)}
            disabled={isLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer shrink-0 ${
              isDropdownOpen ? 'ring-1' : 'hover:opacity-100 opacity-85'
            }`}
            style={{
              backgroundColor: themeMode === 'reader' ? currentThemeStyle?.bg : 'var(--bg-surface)',
              borderColor: borderCol,
              color: textCol,
            }}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" style={{ color: accentCol }} />
            ) : (
              <Globe className="h-3 w-3" style={{ color: accentCol }} />
            )}
            <span className="truncate max-w-[130px]">
              {isLoading
                ? 'Translating...'
                : activeTranslation
                ? activeTranslation.target_language
                : 'More...'}
            </span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Loading Shimmer State */}
      {isLoading && (
        <div
          className="mt-2 p-2 rounded-lg text-xs flex items-center gap-2 border animate-pulse"
          style={{
            backgroundColor: `${accentCol}15`,
            borderColor: `${accentCol}40`,
            color: textCol,
          }}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: accentCol }} />
          <span>
            Generating translation... Preserving poetic line breaks & rhythm.
          </span>
        </div>
      )}

      {/* Active Translation Indicator Bar */}
      {activeTranslation && !isLoading && (
        <div
          className="mt-2 px-2.5 py-1 rounded-lg text-xs flex items-center justify-between border"
          style={{
            backgroundColor: themeMode === 'reader' ? currentThemeStyle?.bg : 'var(--bg-muted)',
            borderColor: borderCol,
            color: textCol,
          }}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" />
              {activeTranslation.translation_type === 'transliteration' ? 'Transliteration:' : 'Translation:'}
            </span>
            <span className="font-semibold truncate">{activeTranslation.target_language}</span>
          </div>

          <button
            onClick={() => onSelectTranslation(null)}
            className="text-[11px] font-bold hover:underline shrink-0 ml-2 cursor-pointer"
            style={{ color: accentCol }}
          >
            Show Original
          </button>
        </div>
      )}

      {/* Responsive, Viewport-Guaranteed Script & Language Selector Portal Modal */}
      {isDropdownOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            {/* Backdrop click dismiss */}
            <div
              className="absolute inset-0"
              onClick={() => {
                setIsDropdownOpen(false);
                setSearchQuery('');
              }}
            />

            {/* Modal / Bottom Sheet Content Container */}
            <div
              id="language-picker-modal"
              className="relative z-10 w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-0 animate-slideUp sm:animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile drag bar handle */}
              <div className="pt-2.5 pb-1 sm:hidden flex justify-center shrink-0">
                <div className="h-1 w-9 rounded-full bg-[var(--border-color)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border-color)]/70 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B2F4A]/10 text-[#8B2F4A] dark:bg-[#E06C88]/20 dark:text-[#E06C88]">
                    <Languages className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-editorial text-base sm:text-lg font-bold text-[var(--text-primary)] leading-tight">
                      Scripts & Translations
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Read in phonetic Roman script or translate meaning
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search & Filter Controls */}
              <div className="p-3 sm:p-4 border-b border-[var(--border-color)]/50 space-y-2.5 bg-[var(--bg-muted)]/20 shrink-0">
                {/* Search input */}
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-3.5 w-3.5 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search languages or scripts (e.g. Hindi, Bangla, Assamese)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] py-2 pl-9 pr-8 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none focus:ring-1 focus:ring-[#8B2F4A] shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 h-4 w-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                      selectedFilter === 'all'
                        ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 shadow-2xs'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    All ({SUPPORTED_TRANSLATIONS.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('transliteration')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                      selectedFilter === 'transliteration'
                        ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 shadow-2xs'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Roman Pronunciation</span>
                  </button>
                  <button
                    onClick={() => setSelectedFilter('translation')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 ${
                      selectedFilter === 'translation'
                        ? 'bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 shadow-2xs'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Globe className="h-3 w-3" />
                    <span>Meaning</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Language List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 divide-y divide-[var(--border-color)]/30">
                {filteredTranslations.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                    No matching language or script found for "{searchQuery}".
                  </div>
                ) : (
                  filteredTranslations.map((opt) => {
                    const isCached = availableTranslations.some(
                      (at) =>
                        at.target_language.toLowerCase() === opt.id.toLowerCase() &&
                        at.translation_type === opt.type
                    );
                    const isSelected =
                      activeTranslation?.target_language === opt.id &&
                      activeTranslation?.translation_type === opt.type;

                    return (
                      <button
                        key={opt.id}
                        id={`language-option-${opt.id.replace(/\s+/g, '-').toLowerCase()}`}
                        onClick={() => handlePickLanguage(opt)}
                        className={`w-full text-left p-2.5 sm:p-3 rounded-xl text-xs flex items-center justify-between gap-3 transition-all cursor-pointer min-h-[46px] group ${
                          isSelected
                            ? 'bg-[#8B2F4A]/15 dark:bg-[#E06C88]/20 border border-[#8B2F4A]/40 dark:border-[#E06C88]/40 shadow-xs'
                            : 'hover:bg-[var(--bg-muted)] border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                              opt.type === 'transliteration'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {opt.type === 'transliteration' ? (
                              <Volume2 className="h-3.5 w-3.5" />
                            ) : (
                              <Globe className="h-3.5 w-3.5" />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-semibold text-xs sm:text-sm ${
                                  isSelected
                                    ? 'text-[#8B2F4A] dark:text-[#E06C88] font-bold'
                                    : 'text-[var(--text-primary)]'
                                }`}
                              >
                                {opt.name}
                              </span>
                              {opt.nativeName && (
                                <span className="text-[11px] text-[var(--text-secondary)] opacity-80">
                                  ({opt.nativeName})
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                              {opt.description}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 shadow-2xs">
                              <Check className="h-3 w-3" />
                            </span>
                          )}

                          {isCached ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <Check className="h-2.5 w-2.5" /> Saved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              <Sparkles className="h-2.5 w-2.5" /> AI
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

