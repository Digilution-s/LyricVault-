import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sun,
  Moon,
  Coffee,
  Type,
  Plus,
  Minus,
  Bookmark,
  Share2,
  FolderPlus,
  Music,
  Heart,
  ExternalLink,
  Lock,
  Check,
  BookOpen,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  ChevronsDown,
  Copy,
  AlignLeft,
  AlignCenter,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  PenTool
} from 'lucide-react';
import { Lyric, LyricAnnotation, LyricTranslation, TranslationType } from '../types';
import { detectMusicPlatform, parseSongLinks } from '../utils/musicPlatform';
import { ShareModal } from './ShareModal';
import { annotationService } from '../services/annotationService';
import { translationService } from '../services/translationService';
import { LyricTranslationBar } from './LyricTranslationBar';
import { ParallelLyricsView } from './ParallelLyricsView';
import { AnnotatedLyricText } from './AnnotatedLyricText';
import { AnnotationEditorModal } from './AnnotationEditorModal';
import { AnnotationViewModal } from './AnnotationViewModal';
import { AnnotationListSheet } from './AnnotationListSheet';
import { LyricCardStudio } from './LyricCardStudio';

export type ReaderTheme = 'sepia' | 'light' | 'dark' | 'obsidian';
export type ReaderFontFamily = 'serif' | 'sans' | 'mono';
export type ReaderLineSpacing = 'normal' | 'relaxed' | 'loose';
export type ReaderTextAlign = 'left' | 'center';
export type AutoScrollSpeed = 'slow' | 'normal' | 'fast';

interface ReaderPreferences {
  theme: ReaderTheme;
  fontSize: number; // 18 - 38
  fontFamily: ReaderFontFamily;
  lineSpacing: ReaderLineSpacing;
  textAlign: ReaderTextAlign;
  autoScrollSpeed: AutoScrollSpeed;
}

const PREF_STORAGE_KEY = 'lyricvault-reader-preferences';

const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'sepia',
  fontSize: 24,
  fontFamily: 'serif',
  lineSpacing: 'relaxed',
  textAlign: 'center',
  autoScrollSpeed: 'normal',
};

const SPEED_CONFIG: Record<AutoScrollSpeed, { label: string; pxPerSec: number }> = {
  slow: { label: 'Slow', pxPerSec: 45 },
  normal: { label: 'Normal', pxPerSec: 75 },
  fast: { label: 'Fast', pxPerSec: 110 },
};

const SPEED_ORDER: AutoScrollSpeed[] = ['slow', 'normal', 'fast'];

interface LyricReaderProps {
  lyric: Lyric | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleLike?: (e: React.MouseEvent, lyricId: string) => void;
  onToggleSave?: (e: React.MouseEvent, lyricId: string) => void;
  onSelectCreator?: (username: string) => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  currentUserId?: string;
  onOpenAuthPrompt?: (context?: 'save' | 'bookmark' | 'note') => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Refined Theme Color Palettes tailored for long-form, distraction-free reading
const THEMES: Record<
  ReaderTheme,
  {
    name: string;
    bg: string;
    text: string;
    textMuted: string;
    surface: string;
    border: string;
    accent: string;
    icon: React.FC<{ className?: string }>;
  }
> = {
  sepia: {
    name: 'Sepia',
    bg: '#F8F3E8',
    text: '#2D231E',
    textMuted: '#7D6C5F',
    surface: '#EFE5D2',
    border: '#DFD2BA',
    accent: '#8B2F4A',
    icon: Coffee,
  },
  light: {
    name: 'Light',
    bg: '#FAFAF8',
    text: '#18181B',
    textMuted: '#71717A',
    surface: '#F1F1ED',
    border: '#E4E4E7',
    accent: '#8B2F4A',
    icon: Sun,
  },
  dark: {
    name: 'Dark',
    bg: '#131316',
    text: '#EDEDF0',
    textMuted: '#9D9DA8',
    surface: '#1C1C22',
    border: '#2A2A34',
    accent: '#E06C88',
    icon: Moon,
  },
  obsidian: {
    name: 'OLED',
    bg: '#000000',
    text: '#E4E4E7',
    textMuted: '#82828C',
    surface: '#121214',
    border: '#222226',
    accent: '#E06C88',
    icon: Sparkles,
  },
};

export const LyricReader: React.FC<LyricReaderProps> = ({
  lyric,
  isOpen,
  onClose,
  onToggleLike,
  onToggleSave,
  onSelectCreator,
  onOpenAddToCollection,
  currentUserId,
  onOpenAuthPrompt,
  showToast,
}) => {
  // Reader preferences state
  const [prefs, setPrefs] = useState<ReaderPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREF_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to parse reader preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  });

  // Mobile settings drawer/popover state
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  // Copied full text feedback
  const [copied, setCopied] = useState(false);
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-Scroll State
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Personal Annotations State
  const [annotations, setAnnotations] = useState<LyricAnnotation[]>([]);
  const [activeEditorSelection, setActiveEditorSelection] = useState<{
    selectedText: string;
    startPosition: number;
    endPosition: number;
  } | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<LyricAnnotation | null>(null);
  const [viewingAnnotation, setViewingAnnotation] = useState<LyricAnnotation | null>(null);
  const [isNotesSheetOpen, setIsNotesSheetOpen] = useState(false);

  // Lyric Card Studio State
  const [isCardStudioOpen, setIsCardStudioOpen] = useState(false);
  const [cardStudioSelectedText, setCardStudioSelectedText] = useState<string>('');

  // Translations & Transliterations State (Community Cache-First)
  const [availableTranslations, setAvailableTranslations] = useState<LyricTranslation[]>([]);
  const [activeTranslation, setActiveTranslation] = useState<LyricTranslation | null>(null);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState<boolean>(false);
  const [isParallelView, setIsParallelView] = useState<boolean>(false);

  const loadTranslations = useCallback(async () => {
    if (!lyric?.id) return;
    try {
      const list = await translationService.getTranslationsForLyric(lyric.id);
      setAvailableTranslations(list);
    } catch (err) {
      console.error('Failed to load translations:', err);
    }
  }, [lyric?.id]);

  const handleRequestTranslation = async (targetLanguage: string, type: TranslationType) => {
    if (!lyric) return;
    setIsLoadingTranslation(true);
    try {
      const result = await translationService.translateLyric({
        lyricId: lyric.id,
        content: lyric.content,
        title: lyric.title,
        artist: lyric.artist_name,
        sourceLanguage: lyric.language,
        targetLanguage,
        translationType: type,
        userId: currentUserId || 'community_user',
      });

      setActiveTranslation(result.translation);
      const updatedList = await translationService.getTranslationsForLyric(lyric.id);
      setAvailableTranslations(updatedList);

      if (result.isCached) {
        showToast?.(`Loaded ${targetLanguage} from community cache!`, 'info');
      } else {
        showToast?.(`Generated & saved ${targetLanguage} to LyricVault translations!`, 'success');
      }
    } catch (err: any) {
      console.error('Translation failed:', err);
      showToast?.(err?.message || 'Failed to translate lyric. Please try again.', 'error');
    } finally {
      setIsLoadingTranslation(false);
    }
  };

  const loadAnnotations = useCallback(async () => {
    if (!lyric?.id) return;
    try {
      const list = await annotationService.getAnnotationsForLyric(lyric.id, currentUserId);
      setAnnotations(list);
    } catch (err) {
      console.error('Failed to load annotations in reader:', err);
    }
  }, [lyric?.id, currentUserId]);

  useEffect(() => {
    if (isOpen && lyric?.id) {
      loadAnnotations();
      loadTranslations();
      setActiveTranslation(null);
      setIsParallelView(false);
    }
  }, [isOpen, lyric?.id, loadAnnotations, loadTranslations]);

  const handleDeleteAnnotation = async (annotationId: string) => {
    try {
      await annotationService.deleteAnnotation(annotationId);
      showToast?.('Annotation deleted.', 'success');
      loadAnnotations();
    } catch (err: any) {
      showToast?.(err?.message || 'Failed to delete annotation.', 'error');
    }
  };

  // Save preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Failed to save reader preferences:', e);
    }
  }, [prefs]);

  // Lock body scrolling & handle Keyboard Shortcuts (Esc to close, Space for Play/Pause, +/- font size)
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isInput) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && isAutoScrolling) {
        e.preventDefault();
        handleTogglePause();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        updateFontSize(2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        updateFontSize(-2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isAutoScrolling, isAtEnd]);

  // Reset Auto-Scroll state when reader opens/closes or lyric changes
  useEffect(() => {
    if (!isOpen) {
      setIsAutoScrolling(false);
      setIsAutoScrollPaused(false);
      setIsAtEnd(false);
    }
  }, [isOpen, lyric?.id]);

  // Auto-Scroll Animation Loop using requestAnimationFrame & Delta Time
  useEffect(() => {
    if (!isAutoScrolling || isAutoScrollPaused || isAtEnd) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastFrameTimeRef.current = null;
      return;
    }

    const currentSpeed = (prefs.autoScrollSpeed in SPEED_CONFIG) ? prefs.autoScrollSpeed : 'normal';
    const speedPx = SPEED_CONFIG[currentSpeed].pxPerSec;

    const animate = (timestamp: number) => {
      if (lastFrameTimeRef.current !== null && mainRef.current) {
        const delta = (timestamp - lastFrameTimeRef.current) / 1000;
        const maxScroll = mainRef.current.scrollHeight - mainRef.current.clientHeight;

        if (mainRef.current.scrollTop >= maxScroll - 3) {
          setIsAtEnd(true);
          setIsAutoScrollPaused(true);
          lastFrameTimeRef.current = null;
          return;
        }

        mainRef.current.scrollTop += speedPx * delta;
      }
      lastFrameTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isAutoScrolling, isAutoScrollPaused, isAtEnd, prefs.autoScrollSpeed]);

  // Manual User Touch / Wheel Scroll Interruption Handling
  useEffect(() => {
    if (!isAutoScrolling || isAutoScrollPaused) return;

    const mainEl = mainRef.current;
    if (!mainEl) return;

    const handleUserInteraction = () => {
      setIsAutoScrollPaused(true);
    };

    mainEl.addEventListener('touchstart', handleUserInteraction, { passive: true });
    mainEl.addEventListener('wheel', handleUserInteraction, { passive: true });

    return () => {
      mainEl.removeEventListener('touchstart', handleUserInteraction);
      mainEl.removeEventListener('wheel', handleUserInteraction);
    };
  }, [isAutoScrolling, isAutoScrollPaused]);

  // Auto-scroll control actions
  const handleStartAutoScroll = () => {
    if (isAtEnd && mainRef.current) {
      mainRef.current.scrollTop = 0;
      setIsAtEnd(false);
    }
    setIsAutoScrolling(true);
    setIsAutoScrollPaused(false);
    lastFrameTimeRef.current = null;
  };

  const handleTogglePause = () => {
    if (isAtEnd && mainRef.current) {
      mainRef.current.scrollTop = 0;
      setIsAtEnd(false);
      setIsAutoScrollPaused(false);
      return;
    }
    setIsAutoScrollPaused((prev) => !prev);
    lastFrameTimeRef.current = null;
  };

  const handleRestartAutoScroll = () => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    setIsAtEnd(false);
    setIsAutoScrollPaused(false);
    lastFrameTimeRef.current = null;
  };

  const handleExitAutoScroll = () => {
    setIsAutoScrolling(false);
    setIsAutoScrollPaused(false);
    setIsAtEnd(false);
  };

  const decreaseSpeed = () => {
    const currentIndex = SPEED_ORDER.indexOf(prefs.autoScrollSpeed || 'normal');
    if (currentIndex > 0) {
      setPrefs((p) => ({ ...p, autoScrollSpeed: SPEED_ORDER[currentIndex - 1] }));
    }
  };

  const increaseSpeed = () => {
    const currentIndex = SPEED_ORDER.indexOf(prefs.autoScrollSpeed || 'normal');
    if (currentIndex < SPEED_ORDER.length - 1) {
      setPrefs((p) => ({ ...p, autoScrollSpeed: SPEED_ORDER[currentIndex + 1] }));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      portalRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleCopyLyrics = async () => {
    if (!lyric) return;
    const currentContent = activeTranslation
      ? activeTranslation.translated_content
      : lyric.content;
    const currentTitle = activeTranslation?.translated_title || lyric.title;
    const authorLine = lyric.artist_name || lyric.author_name || '';

    const textToCopy = `${currentTitle}${authorLine ? `\n${authorLine}` : ''}\n\n${currentContent}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      const msg = activeTranslation
        ? `${activeTranslation.target_language} lyrics copied to clipboard!`
        : 'Lyrics copied to clipboard!';
      showToast?.(msg, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast?.('Failed to copy lyrics', 'error');
    }
  };

  if (!isOpen || !lyric) return null;

  // Authorization check for private lyrics
  const isPrivate = lyric.visibility === 'private';
  const isCreator =
    currentUserId &&
    (lyric.created_by?.userId === currentUserId || (lyric as any).user_id === currentUserId);
  const isUnauthorized = isPrivate && !isCreator;

  const currentTheme = THEMES[prefs.theme] || THEMES.sepia;

  // Calculate line-height CSS string
  const getLineHeight = (spacing: ReaderLineSpacing) => {
    switch (spacing) {
      case 'normal':
        return 1.6;
      case 'relaxed':
        return 1.9;
      case 'loose':
        return 2.25;
      default:
        return 1.9;
    }
  };

  const getFontFamilyClass = (family: ReaderFontFamily) => {
    switch (family) {
      case 'serif':
        return 'font-editorial font-serif';
      case 'sans':
        return 'font-sans';
      case 'mono':
        return 'font-mono';
      default:
        return 'font-editorial font-serif';
    }
  };

  const allMusicLinks = parseSongLinks(lyric.song_link, lyric.song_links);

  const updateFontSize = (delta: number) => {
    setPrefs((prev) => ({
      ...prev,
      fontSize: Math.min(38, Math.max(18, prev.fontSize + delta)),
    }));
  };

  const currentSpeedObj = SPEED_CONFIG[prefs.autoScrollSpeed] || SPEED_CONFIG.normal;

  return createPortal(
    <div
      ref={portalRef}
      id="lyric-reader-portal"
      className="fixed inset-0 z-50 flex flex-col transition-colors duration-300 overflow-hidden font-sans-ui selection:bg-[#8B2F4A]/25 dark:selection:bg-[#E06C88]/30"
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
    >
      {/* 1. Minimal Distraction-Free Top Toolbar */}
      <header
        className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b px-3 sm:px-6 backdrop-blur-md transition-colors duration-300 shrink-0"
        style={{
          borderColor: currentTheme.border,
          backgroundColor: `${currentTheme.bg}EB`, // 92% opacity
        }}
      >
        {/* Left: Close Button & Editorial Header */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            id="reader-close-button"
            onClick={onClose}
            aria-label="Exit Reading Mode (Escape)"
            title="Exit Reading Mode (Esc)"
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer shadow-2xs"
            style={{
              backgroundColor: currentTheme.surface,
              color: currentTheme.text,
              border: `1px solid ${currentTheme.border}`,
            }}
          >
            <X className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>

          <div className="min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase opacity-75"
                style={{ color: currentTheme.accent }}
              >
                <BookOpen className="h-3 w-3" />
                Reading Mode
              </span>
            </div>
            <div
              className="text-xs sm:text-sm font-semibold truncate max-w-[140px] sm:max-w-[280px]"
              style={{ color: currentTheme.text }}
            >
              {lyric.title}
              {lyric.artist_name && (
                <span className="opacity-60 font-normal"> — {lyric.artist_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Reading Controls & Top Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Like Button on Top Right */}
          {onToggleLike && (
            <button
              id="reader-top-like-button"
              onClick={(e) => onToggleLike(e, lyric.id)}
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border text-xs font-semibold shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              style={{
                backgroundColor: lyric.is_liked ? 'rgba(225, 29, 72, 0.15)' : currentTheme.surface,
                borderColor: lyric.is_liked ? 'rgba(225, 29, 72, 0.35)' : currentTheme.border,
                color: lyric.is_liked ? '#E11D48' : currentTheme.text,
              }}
              title={`Like (${lyric.likes_count ?? 0})`}
              aria-label={`Like (${lyric.likes_count ?? 0})`}
            >
              <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${lyric.is_liked ? 'fill-rose-600 text-rose-600 scale-110' : ''}`} />
              <span className="text-[11px] sm:text-xs font-bold">{lyric.likes_count ?? 0}</span>
            </button>
          )}

          {/* Bookmark / Save Count Button on Top Right */}
          {onToggleSave && (
            <button
              id="reader-top-save-button"
              onClick={(e) => {
                if (!currentUserId) {
                  onOpenAuthPrompt?.('bookmark');
                  return;
                }
                onToggleSave(e, lyric.id);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-full border text-xs font-semibold shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              style={{
                backgroundColor: lyric.is_saved ? `${currentTheme.accent}20` : currentTheme.surface,
                borderColor: lyric.is_saved ? currentTheme.accent : currentTheme.border,
                color: lyric.is_saved ? currentTheme.accent : currentTheme.text,
              }}
              title={`Save (${lyric.saves_count ?? 0})`}
              aria-label={`Save (${lyric.saves_count ?? 0})`}
            >
              <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${lyric.is_saved ? 'fill-current scale-110' : ''}`} />
              <span className="text-[11px] sm:text-xs font-bold">{lyric.saves_count ?? 0}</span>
            </button>
          )}

          {/* Desktop Controls Bar */}
          <div className="hidden lg:flex items-center gap-2.5 text-xs">
            {/* Theme Selector */}
            <div
              className="flex items-center p-0.5 rounded-full border shadow-2xs"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              {(['sepia', 'light', 'dark', 'obsidian'] as ReaderTheme[]).map((t) => {
                const themeObj = THEMES[t];
                const IconComp = themeObj.icon;
                const isActive = prefs.theme === t;
                return (
                  <button
                    key={t}
                    id={`reader-theme-${t}`}
                    onClick={() => setPrefs((p) => ({ ...p, theme: t }))}
                    aria-label={`Switch to ${themeObj.name} Theme`}
                    title={`${themeObj.name} Theme`}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isActive ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: isActive ? currentTheme.bg : 'transparent',
                      color: currentTheme.text,
                    }}
                  >
                    <IconComp className="h-3 w-3" />
                    <span>{themeObj.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Font Family Toggle */}
            <div
              className="flex items-center p-0.5 rounded-full border shadow-2xs"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              <button
                id="reader-font-serif"
                onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'serif' }))}
                className={`px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                  prefs.fontFamily === 'serif' ? 'font-serif font-bold shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: prefs.fontFamily === 'serif' ? currentTheme.bg : 'transparent',
                  color: currentTheme.text,
                }}
              >
                Serif
              </button>
              <button
                id="reader-font-sans"
                onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'sans' }))}
                className={`px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                  prefs.fontFamily === 'sans' ? 'font-sans font-bold shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: prefs.fontFamily === 'sans' ? currentTheme.bg : 'transparent',
                  color: currentTheme.text,
                }}
              >
                Sans
              </button>
              <button
                id="reader-font-mono"
                onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'mono' }))}
                className={`px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                  prefs.fontFamily === 'mono' ? 'font-mono font-bold shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: prefs.fontFamily === 'mono' ? currentTheme.bg : 'transparent',
                  color: currentTheme.text,
                }}
              >
                Mono
              </button>
            </div>

            {/* Font Size (+/-) */}
            <div
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-xs shadow-2xs"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              <button
                id="reader-font-decrease"
                onClick={() => updateFontSize(-2)}
                disabled={prefs.fontSize <= 18}
                aria-label="Decrease Font Size"
                title="Decrease Font Size"
                className="p-1 rounded-full hover:opacity-80 disabled:opacity-30 cursor-pointer"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center font-mono text-[11px] font-semibold">
                {prefs.fontSize}px
              </span>
              <button
                id="reader-font-increase"
                onClick={() => updateFontSize(2)}
                disabled={prefs.fontSize >= 38}
                aria-label="Increase Font Size"
                title="Increase Font Size"
                className="p-1 rounded-full hover:opacity-80 disabled:opacity-30 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            {/* Text Alignment */}
            <div
              className="flex items-center p-0.5 rounded-full border shadow-2xs"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              <button
                onClick={() => setPrefs((p) => ({ ...p, textAlign: 'center' }))}
                title="Center align"
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  prefs.textAlign === 'center' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: prefs.textAlign === 'center' ? currentTheme.bg : 'transparent',
                  color: currentTheme.text,
                }}
              >
                <AlignCenter className="h-3 w-3" />
              </button>
              <button
                onClick={() => setPrefs((p) => ({ ...p, textAlign: 'left' }))}
                title="Left align"
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  prefs.textAlign === 'left' ? 'shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: prefs.textAlign === 'left' ? currentTheme.bg : 'transparent',
                  color: currentTheme.text,
                }}
              >
                <AlignLeft className="h-3 w-3" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="flex h-8 w-8 items-center justify-center rounded-full border shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
                color: currentTheme.text,
              }}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Mobile / Tablet Settings Button ("Aa" typography drawer) */}
          <div className="flex lg:hidden items-center">
            <button
              id="reader-mobile-settings-button"
              onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)}
              aria-label="Typography & Theme Preferences"
              className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full border text-xs font-semibold shadow-2xs transition-transform active:scale-95 cursor-pointer"
              style={{
                backgroundColor: isMobileSettingsOpen ? currentTheme.accent : currentTheme.surface,
                borderColor: currentTheme.border,
                color: isMobileSettingsOpen ? '#FFFFFF' : currentTheme.text,
              }}
            >
              <Type className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Settings Sheet / Drawer */}
      {isMobileSettingsOpen && (
        <div
          className="lg:hidden fixed inset-x-0 top-14 sm:top-16 z-40 p-4 border-b shadow-2xl backdrop-blur-xl animate-fadeIn transition-colors duration-300"
          style={{
            backgroundColor: `${currentTheme.bg}FB`,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
        >
          <div className="max-w-md mx-auto space-y-3.5">
            {/* Header / Dismiss */}
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: currentTheme.border }}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">Reading Preferences</span>
              <button
                onClick={() => setIsMobileSettingsOpen(false)}
                className="text-xs font-bold px-2 py-0.5 rounded-full cursor-pointer"
                style={{ color: currentTheme.accent }}
              >
                Done
              </button>
            </div>

            {/* Themes Grid */}
            <div>
              <span className="block text-[11px] font-medium mb-1.5 opacity-70">Theme</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['sepia', 'light', 'dark', 'obsidian'] as ReaderTheme[]).map((t) => {
                  const themeObj = THEMES[t];
                  const IconComp = themeObj.icon;
                  const isActive = prefs.theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setPrefs((p) => ({ ...p, theme: t }))}
                      className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        isActive ? 'ring-2 ring-offset-1' : 'opacity-80'
                      }`}
                      style={{
                        backgroundColor: themeObj.bg,
                        color: themeObj.text,
                        borderColor: themeObj.border,
                      }}
                    >
                      <IconComp className="h-3.5 w-3.5" />
                      <span>{themeObj.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Style & Size */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="block text-[11px] font-medium mb-1 opacity-70">Font Style</span>
                <div
                  className="flex rounded-xl border p-0.5"
                  style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
                >
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'serif' }))}
                    className={`flex-1 py-1.5 text-xs font-serif ${prefs.fontFamily === 'serif' ? 'font-bold rounded-lg shadow-xs' : 'opacity-70'}`}
                    style={{ backgroundColor: prefs.fontFamily === 'serif' ? currentTheme.bg : 'transparent' }}
                  >
                    Serif
                  </button>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'sans' }))}
                    className={`flex-1 py-1.5 text-xs font-sans ${prefs.fontFamily === 'sans' ? 'font-bold rounded-lg shadow-xs' : 'opacity-70'}`}
                    style={{ backgroundColor: prefs.fontFamily === 'sans' ? currentTheme.bg : 'transparent' }}
                  >
                    Sans
                  </button>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'mono' }))}
                    className={`flex-1 py-1.5 text-xs font-mono ${prefs.fontFamily === 'mono' ? 'font-bold rounded-lg shadow-xs' : 'opacity-70'}`}
                    style={{ backgroundColor: prefs.fontFamily === 'mono' ? currentTheme.bg : 'transparent' }}
                  >
                    Mono
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium mb-1 opacity-70">Font Size</span>
                <div
                  className="flex items-center justify-between rounded-xl border p-1"
                  style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
                >
                  <button
                    onClick={() => updateFontSize(-2)}
                    disabled={prefs.fontSize <= 18}
                    className="p-1 rounded-lg hover:opacity-80 disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono text-xs font-bold">{prefs.fontSize}px</span>
                  <button
                    onClick={() => updateFontSize(2)}
                    disabled={prefs.fontSize >= 38}
                    className="p-1 rounded-lg hover:opacity-80 disabled:opacity-30 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Line Spacing & Alignment */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="block text-[11px] font-medium mb-1 opacity-70">Line Spacing</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['normal', 'relaxed', 'loose'] as ReaderLineSpacing[]).map((ls) => (
                    <button
                      key={ls}
                      onClick={() => setPrefs((p) => ({ ...p, lineSpacing: ls }))}
                      className={`py-1.5 rounded-lg border text-[11px] capitalize transition-all cursor-pointer ${
                        prefs.lineSpacing === ls ? 'font-bold shadow-xs' : 'opacity-70'
                      }`}
                      style={{
                        backgroundColor: prefs.lineSpacing === ls ? currentTheme.bg : currentTheme.surface,
                        borderColor: currentTheme.border,
                      }}
                    >
                      {ls}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium mb-1 opacity-70">Alignment</span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, textAlign: 'center' }))}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                      prefs.textAlign === 'center' ? 'font-bold shadow-xs' : 'opacity-70'
                    }`}
                    style={{
                      backgroundColor: prefs.textAlign === 'center' ? currentTheme.bg : currentTheme.surface,
                      borderColor: currentTheme.border,
                    }}
                  >
                    <AlignCenter className="h-3 w-3" />
                    <span>Center</span>
                  </button>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, textAlign: 'left' }))}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                      prefs.textAlign === 'left' ? 'font-bold shadow-xs' : 'opacity-70'
                    }`}
                    style={{
                      backgroundColor: prefs.textAlign === 'left' ? currentTheme.bg : currentTheme.surface,
                      borderColor: currentTheme.border,
                    }}
                  >
                    <AlignLeft className="h-3 w-3" />
                    <span>Left</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Scrollable Immersive Reading Area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-14 scroll-smooth">
        <div className="max-w-2xl mx-auto w-full pb-44 sm:pb-52">
          {/* Unauthorized state for private lyrics */}
          {isUnauthorized ? (
            <div
              className="p-8 rounded-3xl border text-center my-12 space-y-4"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-600">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold font-editorial">Private Lyric</h2>
              <p className="text-sm opacity-80 max-w-sm mx-auto">
                This lyric is set to private and can only be viewed by its author.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-md transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: currentTheme.accent }}
              >
                Return to App
              </button>
            </div>
          ) : (
            <>
              {/* Content Type Header Badge */}
              <div className={`mb-3 ${prefs.textAlign === 'center' ? 'text-center' : 'text-left'}`}>
                <span
                  className="inline-block text-[11px] font-bold tracking-[0.25em] uppercase opacity-60 font-sans-ui"
                  style={{ color: currentTheme.textMuted }}
                >
                  {lyric.content_type === 'Lyric' || lyric.content_type === 'Song Verse'
                    ? 'SONG LYRICS'
                    : lyric.content_type?.toUpperCase() || 'LYRICS'}
                  {lyric.language ? ` • ${lyric.language.toUpperCase()}` : ''}
                </span>
              </div>

              {/* Title */}
              <h1
                className={`font-bold tracking-tight mb-2 transition-all ${getFontFamilyClass(prefs.fontFamily)} ${
                  prefs.textAlign === 'center' ? 'text-center' : 'text-left'
                }`}
                style={{
                  fontSize: `${Math.min(prefs.fontSize + 12, 44)}px`,
                  lineHeight: 1.2,
                }}
              >
                {activeTranslation?.translated_title || lyric.title}
              </h1>

              {/* Author / Artist Metadata */}
              <div
                className={`text-sm font-medium mb-5 opacity-85 space-y-1 ${
                  prefs.textAlign === 'center' ? 'text-center' : 'text-left'
                }`}
                style={{ color: currentTheme.textMuted }}
              >
                {lyric.song_title && lyric.artist_name ? (
                  <p className="text-base font-semibold" style={{ color: currentTheme.text }}>
                    {lyric.song_title} — <span className="opacity-80 font-normal">{lyric.artist_name}</span>
                  </p>
                ) : lyric.artist_name ? (
                  <p className="text-base font-semibold" style={{ color: currentTheme.text }}>{lyric.artist_name}</p>
                ) : lyric.author_name ? (
                  <p className="text-base font-semibold" style={{ color: currentTheme.text }}>By {lyric.author_name}</p>
                ) : null}

                {lyric.album_name && (
                  <p className="text-xs italic opacity-70">Album: {lyric.album_name}</p>
                )}

                {(lyric.created_by?.handle || lyric.created_by?.name) && (() => {
                  const rawHandle = lyric.created_by?.handle || lyric.created_by?.name || 'creator';
                  const cleanUsername = rawHandle.replace(/^@/, '').trim();
                  const displayUsername = `@${cleanUsername}`;

                  return (
                    <p
                      className={`text-xs pt-1 opacity-85 flex items-center gap-1.5 flex-wrap ${
                        prefs.textAlign === 'center' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      <span className="opacity-75">Vaulted by</span>
                      {onSelectCreator ? (
                        <button
                          type="button"
                          id={`reader-creator-link-${cleanUsername}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onSelectCreator(cleanUsername);
                          }}
                          className="font-bold hover:underline transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1"
                          style={{ color: currentTheme.accent }}
                          title={`View @${cleanUsername}'s profile`}
                        >
                          {displayUsername}
                        </button>
                      ) : (
                        <strong style={{ color: currentTheme.accent }}>
                          {displayUsername}
                        </strong>
                      )}
                    </p>
                  );
                })()}
              </div>

              {/* Translation & Transliteration Bar */}
              <div className="mb-6">
                <LyricTranslationBar
                  lyric={lyric}
                  activeTranslation={activeTranslation}
                  availableTranslations={availableTranslations}
                  onSelectTranslation={setActiveTranslation}
                  onRequestTranslation={handleRequestTranslation}
                  isLoading={isLoadingTranslation}
                  themeMode="reader"
                  currentThemeStyle={currentTheme}
                  isParallelView={isParallelView}
                  onToggleParallelView={() => setIsParallelView(!isParallelView)}
                />
              </div>

              {/* Subtle Cover Image (if present) */}
              {lyric.cover_url && (
                <div className={`my-6 flex ${prefs.textAlign === 'center' ? 'justify-center' : 'justify-start'}`}>
                  <img
                    src={lyric.cover_url}
                    alt={lyric.title}
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover shadow-sm border"
                    style={{ borderColor: currentTheme.border }}
                  />
                </div>
              )}

              {/* Minimal Divider */}
              <div
                className={`w-16 h-0.5 my-6 opacity-40 rounded-full ${
                  prefs.textAlign === 'center' ? 'mx-auto' : 'mr-auto'
                }`}
                style={{ backgroundColor: currentTheme.border }}
              />

              {/* Core Lyric Content */}
              <div
                id={`reader-lyric-content-${lyric.id}`}
                className={`my-6 ${prefs.textAlign === 'center' ? 'text-center' : 'text-left'}`}
              >
                {isParallelView && activeTranslation ? (
                  <ParallelLyricsView
                    originalContent={lyric.content}
                    translation={activeTranslation}
                    fontFamily={prefs.fontFamily}
                    fontSize={prefs.fontSize}
                    lineHeight={getLineHeight(prefs.lineSpacing)}
                    textColor={currentTheme.text}
                    mutedColor={currentTheme.textMuted}
                    accentColor={currentTheme.accent}
                  />
                ) : (
                  <AnnotatedLyricText
                    content={activeTranslation ? activeTranslation.translated_content : lyric.content}
                    annotations={activeTranslation ? [] : annotations}
                    fontFamily={prefs.fontFamily}
                    showDoubleQuotes={false}
                    style={{
                      fontSize: `${prefs.fontSize}px`,
                      lineHeight: getLineHeight(prefs.lineSpacing),
                      color: currentTheme.text,
                      textAlign: prefs.textAlign,
                    }}
                    customTextClassName="italic transition-all duration-200"
                    onSelectAnnotation={(anno) => {
                      if (isAutoScrolling && !isAutoScrollPaused) {
                        setIsAutoScrollPaused(true);
                      }
                      setViewingAnnotation(anno);
                    }}
                    onRequestAddAnnotation={(sel) => {
                      if (isAutoScrolling && !isAutoScrollPaused) {
                        setIsAutoScrollPaused(true);
                      }
                      if (!currentUserId) {
                        onOpenAuthPrompt?.('note');
                        return;
                      }
                      setActiveEditorSelection(sel);
                      setEditingAnnotation(null);
                    }}
                    onRequestCreateCard={(sel) => {
                      setCardStudioSelectedText(sel.selectedText);
                      setIsCardStudioOpen(true);
                    }}
                  />
                )}
              </div>

              {/* End of Lyric Banner when Auto-Scroll finishes */}
              {isAtEnd && (
                <div
                  className="mt-12 p-6 rounded-2xl border text-center space-y-3 animate-fadeIn"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.border,
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-wider opacity-60">End of Lyric</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={handleRestartAutoScroll}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-xs cursor-pointer active:scale-95"
                      style={{ backgroundColor: currentTheme.accent }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restart Auto-Scroll</span>
                    </button>
                    <button
                      onClick={handleExitAutoScroll}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border cursor-pointer active:scale-95"
                      style={{ borderColor: currentTheme.border, color: currentTheme.text }}
                    >
                      <span>Exit Auto-Scroll</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Description / Editorial Liner Notes */}
              {lyric.description && (
                <div
                  className="mt-12 p-6 rounded-2xl border text-sm space-y-2 opacity-90 transition-colors"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.border,
                  }}
                >
                  <span
                    className="block text-xs font-bold uppercase tracking-wider"
                    style={{ color: currentTheme.accent }}
                  >
                    Author Notes / Commentary
                  </span>
                  <p className="leading-relaxed opacity-85">{lyric.description}</p>
                </div>
              )}

              {/* Music Platform External Actions */}
              {allMusicLinks.length > 0 && (
                <div className={`mt-10 flex flex-wrap gap-2.5 ${prefs.textAlign === 'center' ? 'justify-center' : 'justify-start'}`}>
                  {allMusicLinks.map((linkUrl, idx) => {
                    const platform = detectMusicPlatform(linkUrl);
                    return (
                      <a
                        key={idx}
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold shadow-2xs transition-transform active:scale-95 hover:opacity-90"
                        style={{
                          backgroundColor: currentTheme.surface,
                          color: currentTheme.text,
                          border: `1px solid ${currentTheme.border}`,
                        }}
                      >
                        <Music className="h-3.5 w-3.5" style={{ color: currentTheme.accent }} />
                        <span>{platform.label}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 3. Sleek Floating Auto-Scroll Control Bar OR Clean Action Footer */}
      {!isUnauthorized && (
        <footer
          className="sticky bottom-0 z-30 w-full border-t px-3 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:py-3.5 backdrop-blur-md transition-all duration-300 shrink-0"
          style={{
            borderColor: currentTheme.border,
            backgroundColor: `${currentTheme.bg}F5`, // 96% opacity
          }}
        >
          {isAutoScrolling ? (
            /* AUTO-SCROLL ACTIVE CONTROL BAR */
            <div className="max-w-lg mx-auto w-full flex flex-col gap-2 animate-fadeIn">
              <div
                className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-2xl border shadow-xl backdrop-blur-xl"
                style={{
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.border,
                }}
              >
                {/* Play / Pause */}
                <button
                  onClick={handleTogglePause}
                  aria-label={isAutoScrollPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 shrink-0 min-h-[40px] cursor-pointer"
                  style={{
                    backgroundColor: currentTheme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  {isAutoScrollPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  )}
                </button>

                {/* Speed Controls (- / Normal / +) */}
                <div
                  className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl border text-xs"
                  style={{
                    backgroundColor: currentTheme.bg,
                    borderColor: currentTheme.border,
                  }}
                >
                  <button
                    onClick={decreaseSpeed}
                    disabled={SPEED_ORDER.indexOf(prefs.autoScrollSpeed || 'normal') === 0}
                    aria-label="Decrease scroll speed"
                    title="Slower speed"
                    className="p-1.5 rounded-lg hover:opacity-80 disabled:opacity-30 min-h-[32px] min-w-[32px] flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    −
                  </button>

                  <div className="flex flex-col items-center px-1 text-center min-w-[64px]">
                    <span className="text-[9px] uppercase tracking-wider font-semibold opacity-60">Speed</span>
                    <span className="text-xs font-bold truncate">{currentSpeedObj.label}</span>
                  </div>

                  <button
                    onClick={increaseSpeed}
                    disabled={SPEED_ORDER.indexOf(prefs.autoScrollSpeed || 'normal') === SPEED_ORDER.length - 1}
                    aria-label="Increase scroll speed"
                    title="Faster speed"
                    className="p-1.5 rounded-lg hover:opacity-80 disabled:opacity-30 min-h-[32px] min-w-[32px] flex items-center justify-center font-bold text-sm cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Restart Button */}
                <button
                  onClick={handleRestartAutoScroll}
                  aria-label="Restart lyric"
                  title="Return to top"
                  className="flex items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 min-h-[40px] min-w-[40px] cursor-pointer"
                  style={{
                    backgroundColor: currentTheme.bg,
                    borderColor: currentTheme.border,
                    color: currentTheme.text,
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* Exit Auto-Scroll */}
                <button
                  onClick={handleExitAutoScroll}
                  aria-label="Exit auto-scroll"
                  title="Exit Auto-Scroll"
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95 min-h-[40px] cursor-pointer"
                  style={{
                    color: currentTheme.textMuted,
                  }}
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Exit</span>
                </button>
              </div>

              {/* Status Hint */}
              <div className="text-center text-[11px] font-medium opacity-70">
                {isAutoScrollPaused ? (
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    Paused — Tap Resume or scroll manually
                  </span>
                ) : (
                  <span>Auto-scrolling at {currentSpeedObj.pxPerSec} px/sec • Touch to pause</span>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD EDITORIAL ACTION BAR - ICON SYMBOLS WITH AUTO-SCROLL IN THE MIDDLE */
            <div className="max-w-lg sm:max-w-2xl mx-auto w-full flex items-center justify-between sm:justify-center gap-1 sm:gap-2 py-0.5 px-0.5">
              {/* 1. Bookmark / Save to Vault */}
              <button
                id="reader-action-bookmark"
                onClick={(e) => {
                  if (!currentUserId) {
                    onOpenAuthPrompt?.('bookmark');
                    return;
                  }
                  if (onToggleSave) onToggleSave(e, lyric.id);
                }}
                className="flex h-8.5 sm:h-9.5 items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-full transition-all active:scale-90 shrink-0 cursor-pointer shadow-2xs text-xs font-semibold"
                style={{
                  backgroundColor: lyric.is_saved ? `${currentTheme.accent}20` : currentTheme.surface,
                  color: lyric.is_saved ? currentTheme.accent : currentTheme.text,
                  border: `1px solid ${lyric.is_saved ? currentTheme.accent : currentTheme.border}`,
                }}
                title={lyric.is_saved ? `Saved in Vault (${lyric.saves_count ?? 0})` : `Save to Vault (${lyric.saves_count ?? 0})`}
                aria-label="Save to Vault"
              >
                <Bookmark
                  className={`h-4 w-4 transition-transform ${lyric.is_saved ? 'fill-current' : ''}`}
                  style={{ color: lyric.is_saved ? currentTheme.accent : currentTheme.text }}
                />
                <span className="text-[11px] font-bold">{lyric.saves_count ?? 0}</span>
              </button>

              {/* 2. Add to Collection */}
              {onOpenAddToCollection && (
                <button
                  id="reader-action-collection"
                  onClick={() => {
                    if (!currentUserId) {
                      onOpenAuthPrompt?.('save');
                      return;
                    }
                    onOpenAddToCollection(lyric);
                  }}
                  className="flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full transition-all active:scale-90 shrink-0 cursor-pointer shadow-2xs"
                  style={{
                    backgroundColor: currentTheme.surface,
                    color: currentTheme.text,
                    border: `1px solid ${currentTheme.border}`,
                  }}
                  title="Add to Collection"
                  aria-label="Add to Collection"
                >
                  <FolderPlus className="h-4 w-4" style={{ color: currentTheme.accent }} />
                </button>
              )}

              {/* 3. Copy Full Lyrics */}
              <button
                id="reader-action-copy"
                onClick={handleCopyLyrics}
                className="flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full transition-all active:scale-90 shrink-0 cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: copied ? `${currentTheme.accent}25` : currentTheme.surface,
                  color: copied ? currentTheme.accent : currentTheme.text,
                  border: `1px solid ${copied ? currentTheme.accent : currentTheme.border}`,
                }}
                title={copied ? 'Copied to Clipboard!' : 'Copy Lyrics'}
                aria-label="Copy Lyrics"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>

              {/* 4. AUTO-SCROLL BUTTON IN THE MIDDLE */}
              <button
                id="reader-action-autoscroll-mid"
                onClick={handleStartAutoScroll}
                className="inline-flex items-center justify-center gap-1 px-3 sm:px-3.5 h-8.5 sm:h-9.5 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 shrink-0 cursor-pointer hover:opacity-90"
                style={{
                  backgroundColor: currentTheme.accent,
                  color: '#FFFFFF',
                }}
                title="Start hands-free Auto-Scroll"
                aria-label="Start Auto-Scroll"
              >
                <ChevronsDown className="h-4 w-4 animate-bounce" />
                <span className="font-sans-ui text-[11px] sm:text-xs tracking-wide">Auto-Scroll</span>
              </button>

              {/* 5. Card Studio Button */}
              <button
                id="reader-action-card-studio"
                onClick={() => {
                  setCardStudioSelectedText('');
                  setIsCardStudioOpen(true);
                }}
                className="flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full transition-all active:scale-90 shrink-0 cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: `${currentTheme.accent}15`,
                  color: currentTheme.accent,
                  border: `1px solid ${currentTheme.accent}40`,
                }}
                title="Create Lyric Card"
                aria-label="Create Lyric Card"
              >
                <Sparkles className="h-4 w-4" style={{ color: currentTheme.accent }} />
              </button>

              {/* 6. Notes List Drawer Button */}
              <button
                id="reader-action-notes"
                onClick={() => {
                  if (!currentUserId) {
                    onOpenAuthPrompt?.('note');
                    return;
                  }
                  setIsNotesSheetOpen(true);
                }}
                className="relative flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full transition-all active:scale-90 shrink-0 cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: annotations.length > 0 ? `${currentTheme.accent}20` : currentTheme.surface,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                }}
                title="Your Personal Notes"
                aria-label="Personal Notes"
              >
                <PenTool className="h-4 w-4" style={{ color: currentTheme.accent }} />
                {annotations.length > 0 && (
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full text-[9px] font-bold shadow-xs"
                    style={{
                      backgroundColor: currentTheme.accent,
                      color: '#FFFFFF',
                    }}
                  >
                    {annotations.length}
                  </span>
                )}
              </button>

              {/* 6. Share */}
              <button
                id="reader-action-share"
                onClick={() => {
                  if (isPrivate) {
                    if (showToast) showToast("Private lyrics can't be shared.", 'error');
                  } else {
                    setIsShareModalOpen(true);
                  }
                }}
                className="flex h-8.5 w-8.5 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full transition-all active:scale-90 shrink-0 cursor-pointer shadow-2xs"
                style={{
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                }}
                title="Share Lyric"
                aria-label="Share Lyric"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </footer>
      )}

      {/* Share Modal Integration inside Reader */}
      {isShareModalOpen && (
        <ShareModal
          lyric={lyric}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          showToast={showToast}
        />
      )}

      {/* Personal Annotation Modals */}
      <AnnotationEditorModal
        isOpen={Boolean(activeEditorSelection || editingAnnotation)}
        onClose={() => {
          setActiveEditorSelection(null);
          setEditingAnnotation(null);
        }}
        lyricId={lyric.id}
        selectedText={editingAnnotation ? editingAnnotation.selected_text : activeEditorSelection?.selectedText || ''}
        startPosition={editingAnnotation ? editingAnnotation.start_position : activeEditorSelection?.startPosition || 0}
        endPosition={editingAnnotation ? editingAnnotation.end_position : activeEditorSelection?.endPosition || 0}
        existingAnnotation={editingAnnotation}
        onSaveSuccess={() => {
          loadAnnotations();
          setActiveEditorSelection(null);
          setEditingAnnotation(null);
        }}
        showToast={showToast}
      />

      <AnnotationViewModal
        isOpen={Boolean(viewingAnnotation)}
        annotation={viewingAnnotation}
        onClose={() => setViewingAnnotation(null)}
        onEdit={(anno) => {
          setViewingAnnotation(null);
          setEditingAnnotation(anno);
        }}
        onDelete={(id) => {
          setViewingAnnotation(null);
          handleDeleteAnnotation(id);
        }}
      />

      <AnnotationListSheet
        isOpen={isNotesSheetOpen}
        onClose={() => setIsNotesSheetOpen(false)}
        annotations={annotations}
        onSelectAnnotation={(anno) => {
          setIsNotesSheetOpen(false);
          setViewingAnnotation(anno);
        }}
      />

      <LyricCardStudio
        isOpen={isCardStudioOpen}
        onClose={() => setIsCardStudioOpen(false)}
        lyric={lyric}
        activeTranslation={activeTranslation}
        initialSelectedText={cardStudioSelectedText}
        showToast={showToast}
      />
    </div>,
    document.body
  );
};
