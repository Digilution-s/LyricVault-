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
  ChevronsDown
} from 'lucide-react';
import { Lyric, LyricAnnotation } from '../types';
import { detectMusicPlatform, parseSongLinks } from '../utils/musicPlatform';
import { ShareModal } from './ShareModal';
import { annotationService } from '../services/annotationService';
import { AnnotatedLyricText } from './AnnotatedLyricText';
import { AnnotationEditorModal } from './AnnotationEditorModal';
import { AnnotationViewModal } from './AnnotationViewModal';
import { AnnotationListSheet } from './AnnotationListSheet';
import { LyricCardStudio } from './LyricCardStudio';

export type ReaderTheme = 'sepia' | 'light' | 'dark';
export type ReaderFontFamily = 'serif' | 'sans';
export type ReaderLineSpacing = 'normal' | 'relaxed' | 'loose';
export type AutoScrollSpeed = 'slow' | 'normal' | 'fast';

interface ReaderPreferences {
  theme: ReaderTheme;
  fontSize: number; // 18 - 36
  fontFamily: ReaderFontFamily;
  lineSpacing: ReaderLineSpacing;
  autoScrollSpeed: AutoScrollSpeed;
}

const PREF_STORAGE_KEY = 'lyricvault-reader-preferences';

const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'sepia',
  fontSize: 24,
  fontFamily: 'serif',
  lineSpacing: 'relaxed',
  autoScrollSpeed: 'normal',
};

const SPEED_CONFIG: Record<AutoScrollSpeed, { label: string; pxPerSec: number }> = {
  slow: { label: 'Slow', pxPerSec: 50 },
  normal: { label: 'Normal', pxPerSec: 75 },
  fast: { label: 'Fast', pxPerSec: 100 },
};

const SPEED_ORDER: AutoScrollSpeed[] = ['slow', 'normal', 'fast'];

interface LyricReaderProps {
  lyric: Lyric | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleLike?: (e: React.MouseEvent, lyricId: string) => void;
  onToggleSave?: (e: React.MouseEvent, lyricId: string) => void;
  onOpenAddToCollection?: (lyric: Lyric) => void;
  currentUserId?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Theme color definitions for Reading Mode
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
    bg: '#FBF0D9',
    text: '#2C221E',
    textMuted: '#786457',
    surface: '#F2E4C9',
    border: '#E4D3B2',
    accent: '#8B2F4A',
    icon: Coffee,
  },
  light: {
    name: 'Light',
    bg: '#FAFAF8',
    text: '#111111',
    textMuted: '#555555',
    surface: '#F0F0EC',
    border: '#E2E2DC',
    accent: '#8B2F4A',
    icon: Sun,
  },
  dark: {
    name: 'Dark',
    bg: '#121212',
    text: '#E0E0E0',
    textMuted: '#9E9E9E',
    surface: '#1E1E1E',
    border: '#2A2A2A',
    accent: '#E06C88',
    icon: Moon,
  },
};

export const LyricReader: React.FC<LyricReaderProps> = ({
  lyric,
  isOpen,
  onClose,
  onToggleLike,
  onToggleSave,
  onOpenAddToCollection,
  currentUserId,
  showToast,
}) => {
  // Saved reader preferences state
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

  // Auto-Scroll State
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
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
    }
  }, [isOpen, lyric?.id, loadAnnotations]);

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

  // Lock body scrolling & handle Keyboard Shortcuts (Esc to close, Space for Play/Pause)
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && isAutoScrolling) {
        const target = e.target as HTMLElement;
        const isInput =
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable);
        if (!isInput) {
          e.preventDefault();
          handleTogglePause();
        }
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
      // Pause auto-scroll when user manually swipes or scrolls with wheel
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
        return 1.5;
      case 'relaxed':
        return 1.8;
      case 'loose':
        return 2.15;
      default:
        return 1.8;
    }
  };

  const allMusicLinks = parseSongLinks(lyric.song_link, lyric.song_links);

  const updateFontSize = (delta: number) => {
    setPrefs((prev) => ({
      ...prev,
      fontSize: Math.min(36, Math.max(18, prev.fontSize + delta)),
    }));
  };

  const currentSpeedObj = SPEED_CONFIG[prefs.autoScrollSpeed] || SPEED_CONFIG.normal;

  return createPortal(
    <div
      id="lyric-reader-portal"
      className="fixed inset-0 z-50 flex flex-col transition-colors duration-300 overflow-hidden font-sans-ui"
      style={{
        backgroundColor: currentTheme.bg,
        color: currentTheme.text,
      }}
    >
      {/* 1. Minimal Sticky Top Toolbar */}
      <header
        className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b px-4 sm:px-6 backdrop-blur-md transition-colors duration-300 shrink-0"
        style={{
          borderColor: currentTheme.border,
          backgroundColor: `${currentTheme.bg}E6`, // 90% opacity
        }}
      >
        {/* Left: Close & Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="reader-close-button"
            onClick={onClose}
            aria-label="Close Reading Mode (Escape)"
            title="Close Reading Mode (Esc)"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 min-h-[36px] min-w-[36px]"
            style={{
              backgroundColor: currentTheme.surface,
              color: currentTheme.text,
            }}
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase opacity-80"
            style={{ color: currentTheme.textMuted }}
          >
            <BookOpen className="h-4 w-4 shrink-0" style={{ color: currentTheme.accent }} />
            <span className="hidden sm:inline">Reading Mode</span>
          </div>
        </div>

        {/* Center: Title on Mobile/Tablet preview */}
        <div className="sm:hidden text-xs font-serif italic truncate max-w-[120px] opacity-75">
          {lyric.title}
        </div>

        {/* Right: Controls & Auto-Scroll Entry */}
        <div className="flex items-center gap-2">
          {/* Quick Auto-Scroll Launcher Button */}
          {!isUnauthorized && (
            <button
              onClick={() => {
                if (isAutoScrolling) {
                  handleTogglePause();
                } else {
                  handleStartAutoScroll();
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs min-h-[36px] ${
                isAutoScrolling && !isAutoScrollPaused
                  ? 'animate-pulse'
                  : 'hover:scale-105 active:scale-95'
              }`}
              style={{
                backgroundColor: `${currentTheme.accent}`,
                color: '#FFFFFF',
              }}
              title="Read hands-free with adjustable scrolling speed"
            >
              <ChevronsDown className="h-4 w-4" />
              <span>{isAutoScrolling ? (isAutoScrollPaused ? 'Resume' : 'Pause') : 'Auto-Scroll'}</span>
            </button>
          )}

          {/* Desktop Controls Bar */}
          <div className="hidden md:flex items-center gap-4 text-xs">
            {/* Theme Switcher */}
            <div
              className="flex items-center p-1 rounded-full border"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              {(['sepia', 'light', 'dark'] as ReaderTheme[]).map((t) => {
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
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isActive ? 'shadow-xs font-bold' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: isActive ? currentTheme.bg : 'transparent',
                      color: currentTheme.text,
                    }}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{themeObj.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Font Family Toggle */}
            <div
              className="flex items-center p-1 rounded-full border"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              <button
                id="reader-font-serif"
                onClick={() => setPrefs((p) => ({ ...p, fontFamily: 'serif' }))}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
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
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  prefs.fontFamily === 'sans' ? 'font-sans font-bold shadow-xs' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: prefs.fontFamily === 'sans' ? currentTheme.bg : 'transparent',
                  color: currentTheme.text,
                }}
              >
                Sans
              </button>
            </div>

            {/* Font Size (+/-) */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full border text-xs"
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
                className="p-1 rounded-full hover:opacity-80 disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center font-mono text-[11px] font-semibold">
                {prefs.fontSize}px
              </span>
              <button
                id="reader-font-increase"
                onClick={() => updateFontSize(2)}
                disabled={prefs.fontSize >= 36}
                aria-label="Increase Font Size"
                className="p-1 rounded-full hover:opacity-80 disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Line Spacing */}
            <div
              className="flex items-center p-1 rounded-full border"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
              }}
            >
              {(['normal', 'relaxed', 'loose'] as ReaderLineSpacing[]).map((ls) => (
                <button
                  key={ls}
                  id={`reader-spacing-${ls}`}
                  onClick={() => setPrefs((p) => ({ ...p, lineSpacing: ls }))}
                  className={`px-2.5 py-1 rounded-full text-[11px] capitalize transition-all ${
                    prefs.lineSpacing === ls ? 'font-bold shadow-xs' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: prefs.lineSpacing === ls ? currentTheme.bg : 'transparent',
                    color: currentTheme.text,
                  }}
                >
                  {ls}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Settings Button ("Aa") */}
          <div className="flex md:hidden items-center">
            <button
              id="reader-mobile-settings-button"
              onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)}
              aria-label="Typography & Theme Preferences"
              className="flex items-center justify-center h-9 w-9 rounded-full border text-xs font-semibold shadow-xs transition-transform active:scale-95 min-h-[36px] min-w-[36px]"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
                color: currentTheme.text,
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
          className="md:hidden fixed inset-x-0 top-14 sm:top-16 z-40 p-4 border-b shadow-xl backdrop-blur-xl animate-fadeIn transition-colors duration-300"
          style={{
            backgroundColor: currentTheme.bg,
            borderColor: currentTheme.border,
            color: currentTheme.text,
          }}
        >
          <div className="max-w-md mx-auto space-y-4">
            {/* Header / Dismiss */}
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: currentTheme.border }}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">Reading Preferences</span>
              <button
                onClick={() => setIsMobileSettingsOpen(false)}
                className="text-xs font-semibold opacity-70 hover:opacity-100"
              >
                Done
              </button>
            </div>

            {/* Themes */}
            <div>
              <span className="block text-[11px] font-medium mb-1.5 opacity-70">Theme</span>
              <div className="grid grid-cols-3 gap-2">
                {(['sepia', 'light', 'dark'] as ReaderTheme[]).map((t) => {
                  const themeObj = THEMES[t];
                  const IconComp = themeObj.icon;
                  const isActive = prefs.theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setPrefs((p) => ({ ...p, theme: t }))}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all min-h-[40px] ${
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

            {/* Font Family & Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[11px] font-medium mb-1.5 opacity-70">Font Style</span>
                <div className="flex rounded-xl border overflow-hidden p-0.5" style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}>
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
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-medium mb-1.5 opacity-70">Font Size</span>
                <div className="flex items-center justify-between rounded-xl border p-1" style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}>
                  <button
                    onClick={() => updateFontSize(-2)}
                    disabled={prefs.fontSize <= 18}
                    className="p-1 rounded-lg hover:opacity-80 disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-xs font-bold">{prefs.fontSize}px</span>
                  <button
                    onClick={() => updateFontSize(2)}
                    disabled={prefs.fontSize >= 36}
                    className="p-1 rounded-lg hover:opacity-80 disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Line Spacing */}
            <div>
              <span className="block text-[11px] font-medium mb-1.5 opacity-70">Line Spacing</span>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'relaxed', 'loose'] as ReaderLineSpacing[]).map((ls) => (
                  <button
                    key={ls}
                    onClick={() => setPrefs((p) => ({ ...p, lineSpacing: ls }))}
                    className={`py-1.5 rounded-xl border text-xs capitalize transition-all min-h-[40px] ${
                      prefs.lineSpacing === ls ? 'font-bold shadow-xs' : 'opacity-70'
                    }`}
                    style={{
                      backgroundColor: prefs.lineSpacing === ls ? currentTheme.surface : 'transparent',
                      borderColor: currentTheme.border,
                    }}
                  >
                    {ls}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Scrollable Reading Area */}
      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 scroll-smooth">
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
                className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: currentTheme.accent }}
              >
                Return to App
              </button>
            </div>
          ) : (
            <>
              {/* Content Type Header */}
              <div className="text-center mb-4">
                <span
                  className="inline-block text-[11px] font-bold tracking-[0.2em] uppercase opacity-60"
                  style={{ color: currentTheme.textMuted }}
                >
                  {lyric.content_type === 'Lyric' || lyric.content_type === 'Song Verse'
                    ? 'SONG LYRICS'
                    : lyric.content_type?.toUpperCase() || 'LYRICS'}
                </span>
              </div>

              {/* Title */}
              <h1
                className={`text-center font-bold tracking-tight mb-3 transition-all ${
                  prefs.fontFamily === 'serif' ? 'font-editorial' : 'font-sans'
                }`}
                style={{
                  fontSize: `${Math.min(prefs.fontSize + 12, 44)}px`,
                  lineHeight: 1.2,
                }}
              >
                {lyric.title}
              </h1>

              {/* Author / Artist Metadata */}
              <div
                className="text-center text-sm font-medium mb-6 opacity-80 space-y-1"
                style={{ color: currentTheme.textMuted }}
              >
                {lyric.song_title && lyric.artist_name ? (
                  <p className="text-base font-semibold" style={{ color: currentTheme.text }}>
                    {lyric.song_title} — <span className="opacity-80 font-normal">{lyric.artist_name}</span>
                  </p>
                ) : lyric.artist_name ? (
                  <p className="text-base font-semibold">{lyric.artist_name}</p>
                ) : lyric.author_name ? (
                  <p className="text-base font-semibold">By {lyric.author_name}</p>
                ) : null}

                {lyric.album_name && (
                  <p className="text-xs italic opacity-70">Album: {lyric.album_name}</p>
                )}

                {lyric.created_by?.name && (
                  <p className="text-xs pt-1 opacity-70">
                    Shared by <strong style={{ color: currentTheme.text }}>{lyric.created_by.name}</strong>
                  </p>
                )}
              </div>

              {/* Subtle Cover Image (if present) */}
              {lyric.cover_url && (
                <div className="my-6 flex justify-center">
                  <img
                    src={lyric.cover_url}
                    alt={lyric.title}
                    className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover shadow-sm border"
                    style={{ borderColor: currentTheme.border }}
                  />
                </div>
              )}

              {/* Divider */}
              <div
                className="w-16 h-0.5 mx-auto my-8 opacity-40 rounded-full"
                style={{ backgroundColor: currentTheme.border }}
              />

              {/* Core Lyric Content */}
              <div id={`reader-lyric-content-${lyric.id}`} className="my-4">
                <AnnotatedLyricText
                  content={lyric.content}
                  annotations={annotations}
                  fontFamily={prefs.fontFamily}
                  showDoubleQuotes={false}
                  style={{
                    fontSize: `${prefs.fontSize}px`,
                    lineHeight: getLineHeight(prefs.lineSpacing),
                    color: currentTheme.text,
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
                      showToast?.('Please sign in to add personal notes to lyrics.', 'info');
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white shadow-xs"
                      style={{ backgroundColor: currentTheme.accent }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restart Auto-Scroll</span>
                    </button>
                    <button
                      onClick={handleExitAutoScroll}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border"
                      style={{ borderColor: currentTheme.border, color: currentTheme.text }}
                    >
                      <span>Exit Auto-Scroll</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Optional Description / Commentary */}
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
                  <p className="leading-relaxed opacity-80">{lyric.description}</p>
                </div>
              )}

              {/* Music Platform Actions (if links exist) */}
              {allMusicLinks.length > 0 && (
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  {allMusicLinks.map((linkUrl, idx) => {
                    const platform = detectMusicPlatform(linkUrl);
                    return (
                      <a
                        key={idx}
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold shadow-xs transition-transform active:scale-95 hover:opacity-90"
                        style={{
                          backgroundColor: currentTheme.surface,
                          color: currentTheme.text,
                          border: `1px solid ${currentTheme.border}`,
                        }}
                      >
                        <Music className="h-4 w-4" style={{ color: currentTheme.accent }} />
                        <span>{platform.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                      </a>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 3. Auto-Scroll Floating Control Bar OR Standard Action Bar */}
      {!isUnauthorized && (
        <footer
          className="sticky bottom-0 z-30 w-full border-t px-3 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:py-4 backdrop-blur-md transition-all duration-300 shrink-0"
          style={{
            borderColor: currentTheme.border,
            backgroundColor: `${currentTheme.bg}F5`, // 96% opacity
          }}
        >
          {isAutoScrolling ? (
            /* AUTO-SCROLL ACTIVE CONTROL BAR */
            <div className="max-w-lg mx-auto w-full flex flex-col gap-2.5 animate-fadeIn">
              {/* Mobile/Desktop Floating Controls */}
              <div
                className="flex items-center justify-between gap-2 p-2 rounded-2xl border shadow-lg backdrop-blur-xl"
                style={{
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.border,
                }}
              >
                {/* Play / Pause Button */}
                <button
                  onClick={handleTogglePause}
                  aria-label={isAutoScrollPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 shrink-0 min-h-[44px]"
                  style={{
                    backgroundColor: currentTheme.accent,
                    color: '#FFFFFF',
                  }}
                >
                  {isAutoScrollPaused ? (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 fill-current" />
                      <span>Pause</span>
                    </>
                  )}
                </button>

                {/* Speed Controls (- / Normal / +) */}
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-xl border text-xs"
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
                    className="p-2 rounded-lg hover:opacity-80 disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center font-bold text-sm"
                  >
                    −
                  </button>

                  <div className="flex flex-col items-center px-1 text-center min-w-[70px]">
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Speed</span>
                    <span className="text-xs font-bold truncate">{currentSpeedObj.label}</span>
                  </div>

                  <button
                    onClick={increaseSpeed}
                    disabled={SPEED_ORDER.indexOf(prefs.autoScrollSpeed || 'normal') === SPEED_ORDER.length - 1}
                    aria-label="Increase scroll speed"
                    title="Faster speed"
                    className="p-2 rounded-lg hover:opacity-80 disabled:opacity-30 min-h-[36px] min-w-[36px] flex items-center justify-center font-bold text-sm"
                  >
                    +
                  </button>
                </div>

                {/* Restart Button */}
                <button
                  onClick={handleRestartAutoScroll}
                  aria-label="Restart lyric"
                  title="Return to top"
                  className="flex items-center justify-center p-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 min-h-[44px] min-w-[44px]"
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
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 active:scale-95 min-h-[44px]"
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
                    Paused — Tap Resume or swipe to scroll manually
                  </span>
                ) : (
                  <span>Auto-scrolling at {currentSpeedObj.pxPerSec} px/sec • Touch to pause</span>
                )}
              </div>
            </div>
          ) : (
            /* STANDARD ACTION BAR */
            <div className="max-w-md sm:max-w-2xl mx-auto w-full flex items-center justify-evenly sm:justify-center gap-1 sm:gap-3 py-0.5">
              {/* Bookmark / Save */}
              <button
                id="reader-action-bookmark"
                onClick={(e) => {
                  if (onToggleSave) onToggleSave(e, lyric.id);
                }}
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-semibold transition-all active:scale-95 shrink-0 text-[11px] sm:text-xs min-h-[36px]"
                style={{
                  backgroundColor: lyric.is_saved ? `${currentTheme.accent}20` : currentTheme.surface,
                  color: lyric.is_saved ? currentTheme.accent : currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                }}
                title={lyric.is_saved ? 'Saved in Vault' : 'Save to Vault'}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${lyric.is_saved ? 'fill-current' : ''}`}
                  style={{ color: lyric.is_saved ? currentTheme.accent : currentTheme.text }}
                />
                <span className="hidden min-[360px]:inline">{lyric.is_saved ? 'Saved' : 'Save'}</span>
              </button>

              {/* Add to Collection */}
              {onOpenAddToCollection && (
                <button
                  id="reader-action-collection"
                  onClick={() => onOpenAddToCollection(lyric)}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-medium transition-all active:scale-95 shrink-0 text-[11px] sm:text-xs min-h-[36px]"
                  style={{
                    backgroundColor: currentTheme.surface,
                    color: currentTheme.text,
                    border: `1px solid ${currentTheme.border}`,
                  }}
                  title="Add to Collection"
                >
                  <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: currentTheme.accent }} />
                  <span className="hidden min-[420px]:inline">Collection</span>
                </button>
              )}

              {/* Auto-Scroll Launcher Button in Footer */}
              <button
                id="reader-action-autoscroll"
                onClick={handleStartAutoScroll}
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-bold transition-all active:scale-95 shrink-0 text-[11px] sm:text-xs min-h-[36px]"
                style={{
                  backgroundColor: `${currentTheme.accent}`,
                  color: '#FFFFFF',
                  border: `1px solid ${currentTheme.accent}`,
                }}
                title="Read hands-free with Auto-Scroll"
              >
                <ChevronsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Auto-Scroll</span>
              </button>

              {/* Card Studio Button */}
              <button
                id="reader-action-card-studio"
                onClick={() => {
                  setCardStudioSelectedText('');
                  setIsCardStudioOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-semibold transition-all active:scale-95 shrink-0 text-[11px] sm:text-xs min-h-[36px]"
                style={{
                  backgroundColor: `${currentTheme.accent}15`,
                  color: currentTheme.accent,
                  border: `1px solid ${currentTheme.accent}40`,
                }}
                title="Create Lyric Card"
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: currentTheme.accent }} />
                <span className="hidden min-[380px]:inline">Card</span>
              </button>

              {/* Notes List Drawer Button */}
              <button
                id="reader-action-notes"
                onClick={() => setIsNotesSheetOpen(true)}
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-semibold transition-all active:scale-95 shrink-0 text-[11px] sm:text-xs min-h-[36px]"
                style={{
                  backgroundColor: annotations.length > 0 ? `${currentTheme.accent}20` : currentTheme.surface,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                }}
                title="Your Personal Notes"
              >
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: currentTheme.accent }} />
                <span className="hidden min-[360px]:inline">Notes</span>
                {annotations.length > 0 && (
                  <span
                    className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: currentTheme.accent,
                      color: currentTheme.bg,
                    }}
                  >
                    {annotations.length}
                  </span>
                )}
              </button>

              {/* Share */}
              <button
                id="reader-action-share"
                onClick={() => {
                  if (isPrivate) {
                    if (showToast) showToast("Private lyrics can't be shared.", 'error');
                  } else {
                    setIsShareModalOpen(true);
                  }
                }}
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-medium transition-all active:scale-95 shrink-0 text-[11px] sm:text-xs min-h-[36px]"
                style={{
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                }}
                title="Share Lyric"
              >
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden min-[360px]:inline">Share</span>
              </button>

              {/* Like button (if available) */}
              {onToggleLike && (
                <button
                  id="reader-action-like"
                  onClick={(e) => onToggleLike(e, lyric.id)}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full font-medium transition-all active:scale-95 shrink-0 text-[11px] sm:text-xs min-h-[36px]"
                  style={{
                    backgroundColor: lyric.is_liked ? 'rgba(225, 29, 72, 0.15)' : currentTheme.surface,
                    color: lyric.is_liked ? '#E11D48' : currentTheme.text,
                    border: `1px solid ${currentTheme.border}`,
                  }}
                  title="Like"
                >
                  <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${lyric.is_liked ? 'fill-rose-600 text-rose-600' : ''}`} />
                  <span>{lyric.likes_count}</span>
                </button>
              )}
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
        initialSelectedText={cardStudioSelectedText}
        showToast={showToast}
      />

    </div>,
    document.body
  );
};
