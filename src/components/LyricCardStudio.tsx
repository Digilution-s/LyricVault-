import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Share2,
  Sparkles,
  Check,
  Type,
  Palette,
  Sliders,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Music,
  RefreshCw,
  ChevronUp
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { Lyric } from '../types';

export type CardFormat = 'story' | 'square';
export type CardTemplate = 'editorial' | 'midnight' | 'album' | 'gradient' | 'minimal';
export type TextSize = 'small' | 'medium' | 'large';
export type TextAlign = 'left' | 'center' | 'right';
export type TextPosition = 'top' | 'center' | 'bottom';
export type LineSpacing = 'normal' | 'relaxed' | 'loose';

const getLineHeightValue = (spacing: LineSpacing): number => {
  if (spacing === 'normal') return 1.28;
  if (spacing === 'loose') return 1.85;
  return 1.55; // relaxed
};

interface LyricCardStudioProps {
  isOpen: boolean;
  onClose: () => void;
  lyric: Lyric;
  initialSelectedText?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LyricCardStudio: React.FC<LyricCardStudioProps> = ({
  isOpen,
  onClose,
  lyric,
  initialSelectedText,
  showToast,
}) => {
  const [format, setFormat] = useState<CardFormat>('story');
  const [template, setTemplate] = useState<CardTemplate>('editorial');
  
  // Text Selection Toggle
  const [useSelectedText, setUseSelectedText] = useState<boolean>(
    Boolean(initialSelectedText && initialSelectedText.trim().length > 0)
  );
  const [passageText, setPassageText] = useState<string>(initialSelectedText || '');

  // Text Styling
  const [fontSizePreference, setFontSizePreference] = useState<TextSize>('medium');
  const [fontFamily, setFontFamily] = useState<'serif' | 'sans'>('serif');
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const [textPosition, setTextPosition] = useState<TextPosition>('center');
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>('relaxed');

  // Metadata Toggles
  const [showArtist, setShowArtist] = useState<boolean>(true);
  const [showSongTitle, setShowSongTitle] = useState<boolean>(true);
  const [showAuthor, setShowAuthor] = useState<boolean>(true);
  const [showBranding, setShowBranding] = useState<boolean>(true);

  // Background Presets
  const [bgPreset, setBgPreset] = useState<string>('#FAFAF8');

  // Export & UI State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);
  const [activeCustomizeTab, setActiveCustomizeTab] = useState<'text' | 'style' | 'details'>('text');

  // Dynamic Auto-Fit Font Size (in 1080px canvas coordinates)
  const [computedFontSize, setComputedFontSize] = useState<number>(52);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textParagraphRef = useRef<HTMLParagraphElement>(null);

  // Canvas Scaling for On-Screen Preview
  const cardRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.3);

  useEffect(() => {
    if (initialSelectedText) {
      setPassageText(initialSelectedText);
      setUseSelectedText(true);
    }
  }, [initialSelectedText]);

  // 1. Calculate On-Screen Preview Scale Factor
  useEffect(() => {
    if (!isOpen) return;

    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const availableW = rect.width - 24;
      const availableH = rect.height - 24;

      const targetW = 1080;
      const targetH = format === 'story' ? 1920 : 1080;

      if (availableW > 0 && availableH > 0) {
        const s = Math.min(availableW / targetW, availableH / targetH);
        setPreviewScale(Math.max(0.08, Math.min(s, 1.0)));
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      observer.observe(previewContainerRef.current);
    }
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isOpen, format]);

  const currentLyricText = useSelectedText && passageText.trim() ? passageText.trim() : lyric?.content || '';

  // 2. Dynamic Auto-Fitting Logic (Runs live when text or layout parameters change)
  useLayoutEffect(() => {
    if (!isOpen || !currentLyricText) return;

    const activeLineHeight = getLineHeightValue(lineSpacing);

    // Iterative Auto-fit check
    const fitTimer = setTimeout(() => {
      if (!textContainerRef.current || !textParagraphRef.current) return;

      const containerH = textContainerRef.current.clientHeight || (format === 'story' ? 1200 : 700);

      // Ensure active line-height is applied during scrollHeight calculation
      textParagraphRef.current.style.lineHeight = String(activeLineHeight);

      // 1. Calculate baseline fit size for medium preference
      let baseFitSize = format === 'story' ? 52 : 42;
      const minBaseSize = format === 'story' ? 18 : 14;

      textParagraphRef.current.style.fontSize = `${baseFitSize}px`;

      while (
        baseFitSize > minBaseSize &&
        textParagraphRef.current.scrollHeight > containerH
      ) {
        const overflowRatio = textParagraphRef.current.scrollHeight / containerH;
        if (overflowRatio > 1.4) {
          baseFitSize = Math.floor(baseFitSize / overflowRatio);
        } else {
          baseFitSize -= 2;
        }
        textParagraphRef.current.style.fontSize = `${baseFitSize}px`;
      }
      baseFitSize = Math.max(baseFitSize, minBaseSize);

      // 2. Apply Text Size Target multiplier relative to baseline fit
      let finalCalculatedSize = baseFitSize;
      if (fontSizePreference === 'small') {
        finalCalculatedSize = Math.max(12, Math.round(baseFitSize * 0.78));
      } else if (fontSizePreference === 'large') {
        finalCalculatedSize = Math.round(baseFitSize * 1.25);
      }

      setComputedFontSize(finalCalculatedSize);
    }, 15);

    return () => clearTimeout(fitTimer);
  }, [
    isOpen,
    currentLyricText,
    format,
    template,
    fontSizePreference,
    fontFamily,
    lineSpacing,
    textPosition,
    showSongTitle,
    showArtist,
    showAuthor,
    showBranding,
  ]);

  if (!isOpen || !lyric) return null;

  const getPositionJustify = () => {
    if (textPosition === 'top') return 'justify-start pt-12';
    if (textPosition === 'bottom') return 'justify-end pb-12';
    return 'justify-center';
  };

  const getAlignmentClass = () => {
    if (textAlign === 'left') return 'text-left';
    if (textAlign === 'right') return 'text-right';
    return 'text-center';
  };

  // Export PNG
  const handleExportPng = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 1, // Native 1080 canvas size
        width: 1080,
        height: format === 'story' ? 1920 : 1080,
        fontEmbedCSS: '',
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
      });

      const filename = `lyricvault-${lyric.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${format}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      showToast?.('Lyric card downloaded!', 'success');
    } catch (err) {
      console.error('Failed to export card image:', err);
      showToast?.('Failed to generate image. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Native Web Share or Fallback
  const handleShareCard = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        width: 1080,
        height: format === 'story' ? 1920 : 1080,
        fontEmbedCSS: '',
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `lyric-card-${format}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${lyric.title} — LyricVault`,
          text: `"${currentLyricText.substring(0, 100)}..."`,
          files: [file],
        });
        showToast?.('Shared successfully!', 'success');
      } else if (navigator.share) {
        await navigator.share({
          title: `${lyric.title} — LyricVault`,
          text: `"${currentLyricText.substring(0, 120)}..."`,
          url: window.location.href,
        });
        showToast?.('Shared link successfully!', 'success');
      } else {
        const filename = `lyricvault-${lyric.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(window.location.href);
          showToast?.('Downloaded image & copied link to clipboard!', 'success');
        } else {
          showToast?.('Lyric card downloaded!', 'success');
        }
      }
    } catch (err) {
      console.error('Error sharing card:', err);
      showToast?.('Image downloaded!', 'info');
    } finally {
      setIsExporting(false);
    }
  };

  // Render Template Card Content on 1080px Canvas
  const renderCardContent = () => {
    const isSerif = fontFamily === 'serif';
    const fontClass = isSerif ? 'font-editorial' : 'font-sans';
    const displayArtist = lyric.artist_name || lyric.author_name;
    const displayTitle = lyric.song_title || lyric.title;
    const displayAuthor = lyric.created_by?.name;

    const currentLineHeight = getLineHeightValue(lineSpacing);

    // 1. Editorial
    if (template === 'editorial') {
      return (
        <div
          className="w-full h-full p-16 flex flex-col justify-between relative overflow-hidden text-[#111111] select-none"
          style={{ backgroundColor: bgPreset || '#FAFAF8' }}
        >
          <div className="absolute inset-8 border-2 border-[#8B2F4A]/20 pointer-events-none rounded-3xl" />

          {/* Header */}
          <div className="flex items-center justify-between z-10 shrink-0">
            {showBranding ? (
              <span className="text-[22px] font-bold tracking-[0.25em] uppercase text-[#8B2F4A]">
                LYRICVAULT
              </span>
            ) : <div />}
            <Quote className="h-10 w-10 text-[#8B2F4A]/30" />
          </div>

          {/* Safe Lyric Area */}
          <div
            ref={textContainerRef}
            className={`z-10 flex flex-col ${getPositionJustify()} px-4 overflow-hidden my-auto flex-1 min-h-0`}
          >
            <p
              ref={textParagraphRef}
              className={`${fontClass} ${getAlignmentClass()} italic font-medium text-[#111111] tracking-wide break-words whitespace-pre-wrap`}
              style={{
                fontSize: `${computedFontSize}px`,
                lineHeight: currentLineHeight,
              }}
            >
              "{currentLyricText}"
            </p>
          </div>

          {/* Footer Metadata */}
          <div className="z-10 border-t-2 border-[#111111]/10 pt-6 flex flex-col gap-1 text-center shrink-0">
            {showSongTitle && displayTitle && (
              <p className="font-editorial text-[36px] font-bold text-[#111111] truncate">
                {displayTitle}
              </p>
            )}
            {showArtist && displayArtist && (
              <p className="text-[24px] font-semibold tracking-wider text-[#8B2F4A] uppercase truncate">
                {displayArtist}
              </p>
            )}
            {showAuthor && displayAuthor && (
              <p className="text-[20px] text-[#666666] italic truncate">
                Shared by {displayAuthor}
              </p>
            )}
          </div>
        </div>
      );
    }

    // 2. Midnight
    if (template === 'midnight') {
      return (
        <div
          className="w-full h-full p-16 flex flex-col justify-between relative overflow-hidden text-zinc-100 select-none"
          style={{
            background: bgPreset.startsWith('#')
              ? `radial-gradient(circle at 50% 30%, #222228 0%, ${bgPreset} 100%)`
              : bgPreset || '#111111',
          }}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#E06C88]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between z-10 shrink-0">
            {showBranding ? (
              <span className="text-[22px] font-bold tracking-[0.25em] uppercase text-[#E06C88]">
                LYRICVAULT
              </span>
            ) : <div />}
            <span className="h-4 w-4 rounded-full bg-[#E06C88]" />
          </div>

          {/* Text */}
          <div
            ref={textContainerRef}
            className={`z-10 flex flex-col ${getPositionJustify()} px-4 overflow-hidden my-auto flex-1 min-h-0`}
          >
            <p
              ref={textParagraphRef}
              className={`${fontClass} ${getAlignmentClass()} italic font-normal text-zinc-100 tracking-wide break-words whitespace-pre-wrap drop-shadow-sm`}
              style={{
                fontSize: `${computedFontSize}px`,
                lineHeight: currentLineHeight,
              }}
            >
              "{currentLyricText}"
            </p>
          </div>

          {/* Footer */}
          <div className="z-10 border-t-2 border-zinc-800/80 pt-6 flex flex-col gap-1 shrink-0">
            {showSongTitle && displayTitle && (
              <p className="font-editorial text-[36px] font-semibold text-zinc-100 truncate">
                {displayTitle}
              </p>
            )}
            {showArtist && displayArtist && (
              <p className="text-[24px] font-bold tracking-wider text-[#E06C88] uppercase truncate">
                {displayArtist}
              </p>
            )}
            {showAuthor && displayAuthor && (
              <p className="text-[20px] text-zinc-400 italic truncate">
                Shared by {displayAuthor}
              </p>
            )}
          </div>
        </div>
      );
    }

    // 3. Album Artwork
    if (template === 'album') {
      const hasCover = Boolean(lyric.cover_url);
      return (
        <div className="w-full h-full relative overflow-hidden text-white flex flex-col justify-between p-16 select-none bg-zinc-950">
          {hasCover ? (
            <>
              <img
                src={lyric.cover_url}
                alt={lyric.title}
                className="absolute inset-0 w-full h-full object-cover scale-105 filter blur-xs"
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/75 to-black/90" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-[#120816] via-[#2D162B] to-[#120816]">
              <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full border-[16px] border-white/5 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full border-[12px] border-white/5" />
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between z-10 shrink-0">
            {showBranding ? (
              <span className="text-[22px] font-bold tracking-[0.25em] uppercase text-rose-300">
                LYRICVAULT
              </span>
            ) : <div />}
            <Music className="h-8 w-8 text-rose-300/60" />
          </div>

          {/* Text Container */}
          <div
            ref={textContainerRef}
            className={`z-10 flex flex-col ${getPositionJustify()} px-2 overflow-hidden my-auto flex-1 min-h-0`}
          >
            <div className="p-8 sm:p-12 rounded-3xl bg-black/50 backdrop-blur-md border border-white/15 shadow-2xl w-full">
              <p
                ref={textParagraphRef}
                className={`${fontClass} ${getAlignmentClass()} italic text-white tracking-wide break-words whitespace-pre-wrap`}
                style={{
                  fontSize: `${computedFontSize}px`,
                  lineHeight: currentLineHeight,
                }}
              >
                "{currentLyricText}"
              </p>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="z-10 flex items-center gap-6 border-t-2 border-white/15 pt-6 shrink-0">
            {hasCover && (
              <img
                src={lyric.cover_url}
                alt="Album Cover"
                className="h-20 w-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg shrink-0"
                crossOrigin="anonymous"
              />
            )}
            <div className="flex flex-col min-w-0">
              {showSongTitle && displayTitle && (
                <p className="font-editorial text-[32px] font-bold text-white truncate">
                  {displayTitle}
                </p>
              )}
              {showArtist && displayArtist && (
                <p className="text-[22px] font-semibold tracking-wider text-rose-300 uppercase truncate">
                  {displayArtist}
                </p>
              )}
              {showAuthor && displayAuthor && (
                <p className="text-[18px] text-zinc-300 italic truncate">
                  Shared by {displayAuthor}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 4. Gradient
    if (template === 'gradient') {
      return (
        <div
          className="w-full h-full p-16 flex flex-col justify-between relative overflow-hidden text-white select-none"
          style={{
            background: bgPreset.includes('gradient')
              ? bgPreset
              : 'linear-gradient(135deg, #8B2F4A 0%, #3B1323 50%, #1A0812 100%)',
          }}
        >
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-rose-400/20 blur-3xl" />

          {/* Header */}
          <div className="flex items-center justify-between z-10 shrink-0">
            {showBranding ? (
              <span className="text-[22px] font-bold tracking-[0.25em] uppercase text-rose-200">
                LYRICVAULT
              </span>
            ) : <div />}
            <Sparkles className="h-8 w-8 text-rose-200/50" />
          </div>

          {/* Text */}
          <div
            ref={textContainerRef}
            className={`z-10 flex flex-col ${getPositionJustify()} px-4 overflow-hidden my-auto flex-1 min-h-0`}
          >
            <p
              ref={textParagraphRef}
              className={`${fontClass} ${getAlignmentClass()} italic font-medium text-white tracking-wide break-words whitespace-pre-wrap drop-shadow-md`}
              style={{
                fontSize: `${computedFontSize}px`,
                lineHeight: currentLineHeight,
              }}
            >
              "{currentLyricText}"
            </p>
          </div>

          {/* Footer */}
          <div className="z-10 border-t-2 border-white/20 pt-6 flex flex-col gap-1 shrink-0">
            {showSongTitle && displayTitle && (
              <p className="font-editorial text-[36px] font-bold text-white truncate">
                {displayTitle}
              </p>
            )}
            {showArtist && displayArtist && (
              <p className="text-[24px] font-bold tracking-wider text-rose-200 uppercase truncate">
                {displayArtist}
              </p>
            )}
            {showAuthor && displayAuthor && (
              <p className="text-[20px] text-rose-100/70 italic truncate">
                Shared by {displayAuthor}
              </p>
            )}
          </div>
        </div>
      );
    }

    // 5. Minimal
    return (
      <div
        className="w-full h-full p-16 flex flex-col justify-between relative overflow-hidden text-zinc-900 select-none"
        style={{ backgroundColor: bgPreset || '#FFFFFF' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between z-10 shrink-0">
          {showBranding ? (
            <span className="text-[20px] font-semibold tracking-[0.3em] uppercase text-zinc-400">
              LYRICVAULT
            </span>
          ) : <div />}
        </div>

        {/* Text */}
        <div
          ref={textContainerRef}
          className={`z-10 flex flex-col ${getPositionJustify()} px-4 overflow-hidden my-auto flex-1 min-h-0`}
        >
          <p
            ref={textParagraphRef}
            className={`${fontClass} ${getAlignmentClass()} italic font-normal text-zinc-900 tracking-wide break-words whitespace-pre-wrap`}
            style={{
              fontSize: `${computedFontSize}px`,
              lineHeight: currentLineHeight,
            }}
          >
            "{currentLyricText}"
          </p>
        </div>

        {/* Footer */}
        <div className="z-10 flex items-center justify-between pt-6 border-t-2 border-zinc-100 shrink-0">
          <div className="flex flex-col min-w-0 pr-4">
            {showSongTitle && displayTitle && (
              <span className="font-editorial text-[32px] font-semibold text-zinc-900 truncate">
                {displayTitle}
              </span>
            )}
            {showArtist && displayArtist && (
              <span className="text-[22px] text-zinc-500 truncate">
                {displayArtist}
              </span>
            )}
          </div>
          {showAuthor && displayAuthor && (
            <span className="text-[18px] text-zinc-400 shrink-0">
              {displayAuthor}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Visual Template Thumbnails Component
  const renderTemplateThumbnails = () => {
    const templatesList: { id: CardTemplate; label: string; bg: string; textClass: string; borderClass: string }[] = [
      { id: 'editorial', label: 'Editorial', bg: '#FAFAF8', textClass: 'text-[#111111] font-editorial italic', borderClass: 'border-[#8B2F4A]/30' },
      { id: 'midnight', label: 'Midnight', bg: '#111111', textClass: 'text-zinc-100 font-editorial italic', borderClass: 'border-zinc-800' },
      { id: 'album', label: 'Album', bg: '#1a0d18', textClass: 'text-rose-200 font-editorial italic', borderClass: 'border-rose-900/50' },
      { id: 'gradient', label: 'Gradient', bg: 'linear-gradient(135deg, #8B2F4A 0%, #1A0812 100%)', textClass: 'text-white font-editorial italic', borderClass: 'border-rose-500/30' },
      { id: 'minimal', label: 'Minimal', bg: '#FFFFFF', textClass: 'text-zinc-900 font-sans', borderClass: 'border-zinc-200' },
    ];

    return (
      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 px-1">
        {templatesList.map((t) => {
          const isSelected = template === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTemplate(t.id);
                if (t.id === 'editorial') setBgPreset('#FAFAF8');
                if (t.id === 'midnight') setBgPreset('#111111');
                if (t.id === 'gradient') setBgPreset('linear-gradient(135deg, #8B2F4A 0%, #3B1323 50%, #1A0812 100%)');
                if (t.id === 'minimal') setBgPreset('#FFFFFF');
              }}
              className="group flex flex-col items-center shrink-0 transition-all active:scale-95 touch-target"
            >
              <div
                className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl flex items-center justify-center relative overflow-hidden border shadow-xs transition-all ${
                  isSelected
                    ? 'border-[#8B2F4A] dark:border-[#E06C88] ring-2 ring-[#8B2F4A]/40 scale-105'
                    : 'border-[var(--border-color)] opacity-75 hover:opacity-100'
                }`}
                style={{ background: t.bg }}
              >
                <span className={`text-xs sm:text-sm font-bold ${t.textClass}`}>Aa</span>
                {isSelected && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#8B2F4A] dark:bg-[#E06C88]" />
                )}
              </div>
              <span className={`text-[11px] font-medium mt-1.5 transition-colors ${
                isSelected ? 'text-[#8B2F4A] dark:text-[#E06C88] font-bold' : 'text-[var(--text-secondary)]'
              }`}>
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Render Customization Controls Content
  const renderCustomizeControls = () => {
    return (
      <div className="space-y-5">
        {/* Sub-tabs for Text / Style / Details */}
        <div className="flex rounded-xl bg-[var(--bg-muted)] p-1 border border-[var(--border-color)] text-xs font-semibold">
          <button
            onClick={() => setActiveCustomizeTab('text')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeCustomizeTab === 'text'
                ? 'bg-[#8B2F4A] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            <span>Text</span>
          </button>
          <button
            onClick={() => setActiveCustomizeTab('style')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeCustomizeTab === 'style'
                ? 'bg-[#8B2F4A] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Style</span>
          </button>
          <button
            onClick={() => setActiveCustomizeTab('details')}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeCustomizeTab === 'details'
                ? 'bg-[#8B2F4A] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Details</span>
          </button>
        </div>

        {/* 1. TEXT TAB */}
        {activeCustomizeTab === 'text' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Passage Source Switcher */}
            {initialSelectedText && (
              <div className="p-3 rounded-xl bg-[var(--bg-muted)] border border-[var(--border-color)] space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Lyric Source
                </label>
                <div className="flex rounded-lg overflow-hidden border border-[var(--border-color)] text-xs font-medium">
                  <button
                    onClick={() => setUseSelectedText(true)}
                    className={`flex-1 py-1.5 px-2 transition-colors ${
                      useSelectedText
                        ? 'bg-[#8B2F4A] text-white font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Selected Note
                  </button>
                  <button
                    onClick={() => setUseSelectedText(false)}
                    className={`flex-1 py-1.5 px-2 transition-colors ${
                      !useSelectedText
                        ? 'bg-[#8B2F4A] text-white font-bold'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Full Lyric
                  </button>
                </div>
              </div>
            )}

            {/* Typography Family */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Typography
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFontFamily('serif')}
                  className={`p-2.5 rounded-xl border text-center transition-all min-h-[44px] ${
                    fontFamily === 'serif'
                      ? 'border-[#8B2F4A] bg-[#8B2F4A]/10 text-[#8B2F4A] font-bold'
                      : 'border-[var(--border-color)] text-[var(--text-primary)]'
                  }`}
                >
                  <span className="font-editorial text-sm italic block">Serif</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Editorial</span>
                </button>
                <button
                  onClick={() => setFontFamily('sans')}
                  className={`p-2.5 rounded-xl border text-center transition-all min-h-[44px] ${
                    fontFamily === 'sans'
                      ? 'border-[#8B2F4A] bg-[#8B2F4A]/10 text-[#8B2F4A] font-bold'
                      : 'border-[var(--border-color)] text-[var(--text-primary)]'
                  }`}
                >
                  <span className="font-sans text-xs font-semibold block">Sans-Serif</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Modern</span>
                </button>
              </div>
            </div>

            {/* Text Size */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Text Size Target
              </label>
              <div className="flex items-center justify-between rounded-xl bg-[var(--bg-muted)] p-1 border border-[var(--border-color)] text-xs font-semibold">
                <button
                  onClick={() => setFontSizePreference('small')}
                  className={`flex-1 py-2 rounded-lg transition-all min-h-[38px] ${
                    fontSizePreference === 'small' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Small
                </button>
                <button
                  onClick={() => setFontSizePreference('medium')}
                  className={`flex-1 py-2 rounded-lg transition-all min-h-[38px] ${
                    fontSizePreference === 'medium' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setFontSizePreference('large')}
                  className={`flex-1 py-2 rounded-lg transition-all min-h-[38px] ${
                    fontSizePreference === 'large' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Large
                </button>
              </div>
            </div>

            {/* Alignment & Position */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Alignment
                </label>
                <div className="flex items-center rounded-xl bg-[var(--bg-muted)] p-1 border border-[var(--border-color)]">
                  <button
                    onClick={() => setTextAlign('left')}
                    className={`flex-1 py-2 flex justify-center rounded-lg min-h-[38px] items-center ${
                      textAlign === 'left' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTextAlign('center')}
                    className={`flex-1 py-2 flex justify-center rounded-lg min-h-[38px] items-center ${
                      textAlign === 'center' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTextAlign('right')}
                    className={`flex-1 py-2 flex justify-center rounded-lg min-h-[38px] items-center ${
                      textAlign === 'right' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Position
                </label>
                <div className="flex items-center rounded-xl bg-[var(--bg-muted)] p-1 border border-[var(--border-color)] text-[11px] font-semibold">
                  <button
                    onClick={() => setTextPosition('top')}
                    className={`flex-1 py-2 rounded-lg min-h-[38px] ${
                      textPosition === 'top' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Top
                  </button>
                  <button
                    onClick={() => setTextPosition('center')}
                    className={`flex-1 py-2 rounded-lg min-h-[38px] ${
                      textPosition === 'center' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Mid
                  </button>
                  <button
                    onClick={() => setTextPosition('bottom')}
                    className={`flex-1 py-2 rounded-lg min-h-[38px] ${
                      textPosition === 'bottom' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    Bot
                  </button>
                </div>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Line Spacing
              </label>
              <div className="flex items-center rounded-xl bg-[var(--bg-muted)] p-1 border border-[var(--border-color)] text-xs font-semibold">
                <button
                  onClick={() => setLineSpacing('normal')}
                  className={`flex-1 py-2 rounded-lg min-h-[38px] ${
                    lineSpacing === 'normal' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setLineSpacing('relaxed')}
                  className={`flex-1 py-2 rounded-lg min-h-[38px] ${
                    lineSpacing === 'relaxed' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Relaxed
                </button>
                <button
                  onClick={() => setLineSpacing('loose')}
                  className={`flex-1 py-2 rounded-lg min-h-[38px] ${
                    lineSpacing === 'loose' ? 'bg-[#8B2F4A] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Loose
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. STYLE TAB */}
        {activeCustomizeTab === 'style' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Background Color Swatches
            </label>

            <div className="grid grid-cols-4 gap-2.5">
              {/* Off-White */}
              <button
                onClick={() => setBgPreset('#FAFAF8')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset === '#FAFAF8' ? 'ring-2 ring-[#8B2F4A] border-transparent scale-105' : 'border-zinc-300'
                }`}
                style={{ backgroundColor: '#FAFAF8' }}
                title="Warm Off-White"
              >
                {bgPreset === '#FAFAF8' && <Check className="h-4 w-4 text-[#8B2F4A]" />}
              </button>

              {/* Pure White */}
              <button
                onClick={() => setBgPreset('#FFFFFF')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset === '#FFFFFF' ? 'ring-2 ring-[#8B2F4A] border-transparent scale-105' : 'border-zinc-300'
                }`}
                style={{ backgroundColor: '#FFFFFF' }}
                title="Pure White"
              >
                {bgPreset === '#FFFFFF' && <Check className="h-4 w-4 text-[#8B2F4A]" />}
              </button>

              {/* Midnight */}
              <button
                onClick={() => setBgPreset('#111111')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset === '#111111' ? 'ring-2 ring-[#8B2F4A] border-transparent scale-105' : 'border-zinc-800'
                }`}
                style={{ backgroundColor: '#111111' }}
                title="Midnight"
              >
                {bgPreset === '#111111' && <Check className="h-4 w-4 text-white" />}
              </button>

              {/* Burgundy */}
              <button
                onClick={() => setBgPreset('#8B2F4A')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset === '#8B2F4A' ? 'ring-2 ring-white border-transparent scale-105' : 'border-transparent'
                }`}
                style={{ backgroundColor: '#8B2F4A' }}
                title="Burgundy"
              >
                {bgPreset === '#8B2F4A' && <Check className="h-4 w-4 text-white" />}
              </button>

              {/* Wine Gradient */}
              <button
                onClick={() => setBgPreset('linear-gradient(135deg, #8B2F4A 0%, #3B1323 50%, #1A0812 100%)')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset.includes('#8B2F4A') && bgPreset.includes('gradient')
                    ? 'ring-2 ring-white border-transparent scale-105'
                    : 'border-transparent'
                }`}
                style={{ background: 'linear-gradient(135deg, #8B2F4A 0%, #3B1323 100%)' }}
                title="Wine Gradient"
              >
                {bgPreset.includes('gradient') && bgPreset.includes('#8B2F4A') && <Check className="h-4 w-4 text-white" />}
              </button>

              {/* Dusk Gradient */}
              <button
                onClick={() => setBgPreset('linear-gradient(135deg, #1E1020 0%, #3B132B 100%)')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset.includes('#1E1020') ? 'ring-2 ring-white border-transparent scale-105' : 'border-transparent'
                }`}
                style={{ background: 'linear-gradient(135deg, #1E1020 0%, #3B132B 100%)' }}
                title="Dusk Gradient"
              >
                {bgPreset.includes('#1E1020') && <Check className="h-4 w-4 text-white" />}
              </button>

              {/* Soft Rose */}
              <button
                onClick={() => setBgPreset('#F4E8EC')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset === '#F4E8EC' ? 'ring-2 ring-[#8B2F4A] border-transparent scale-105' : 'border-zinc-300'
                }`}
                style={{ backgroundColor: '#F4E8EC' }}
                title="Soft Rose"
              >
                {bgPreset === '#F4E8EC' && <Check className="h-4 w-4 text-[#8B2F4A]" />}
              </button>

              {/* Dark Slate */}
              <button
                onClick={() => setBgPreset('#2A2D34')}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all ${
                  bgPreset === '#2A2D34' ? 'ring-2 ring-white border-transparent scale-105' : 'border-transparent'
                }`}
                style={{ backgroundColor: '#2A2D34' }}
                title="Dark Slate"
              >
                {bgPreset === '#2A2D34' && <Check className="h-4 w-4 text-white" />}
              </button>
            </div>
          </div>
        )}

        {/* 3. DETAILS TAB */}
        {activeCustomizeTab === 'details' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Card Metadata Toggles
            </label>

            <div className="space-y-2">
              {(lyric.song_title || lyric.title) && (
                <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-muted)] transition-colors min-h-[44px]">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Show Song Title</span>
                  <input
                    type="checkbox"
                    checked={showSongTitle}
                    onChange={(e) => setShowSongTitle(e.target.checked)}
                    className="h-4 w-4 rounded-md accent-[#8B2F4A]"
                  />
                </label>
              )}

              {(lyric.artist_name || lyric.author_name) && (
                <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-muted)] transition-colors min-h-[44px]">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Show Artist</span>
                  <input
                    type="checkbox"
                    checked={showArtist}
                    onChange={(e) => setShowArtist(e.target.checked)}
                    className="h-4 w-4 rounded-md accent-[#8B2F4A]"
                  />
                </label>
              )}

              {lyric.created_by?.name && (
                <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-muted)] transition-colors min-h-[44px]">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">Show Author</span>
                  <input
                    type="checkbox"
                    checked={showAuthor}
                    onChange={(e) => setShowAuthor(e.target.checked)}
                    className="h-4 w-4 rounded-md accent-[#8B2F4A]"
                  />
                </label>
              )}

              <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-muted)] transition-colors min-h-[44px]">
                <span className="text-xs font-semibold text-[var(--text-primary)]">LyricVault Branding</span>
                <input
                  type="checkbox"
                  checked={showBranding}
                  onChange={(e) => setShowBranding(e.target.checked)}
                  className="h-4 w-4 rounded-md accent-[#8B2F4A]"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-[var(--text-primary)] overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. Header Bar */}
      <header className="h-14 px-3 sm:px-6 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors touch-target flex items-center justify-center min-h-[44px] min-w-[44px]"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-editorial font-bold text-sm sm:text-base text-zinc-100 leading-none">
              Lyric Card Studio
            </h2>
          </div>
        </div>

        {/* Compact Format Switcher */}
        <div className="flex items-center bg-zinc-900 p-0.5 rounded-full border border-zinc-800">
          <button
            onClick={() => setFormat('story')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              format === 'story'
                ? 'bg-[#8B2F4A] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Story 9:16
          </button>
          <button
            onClick={() => setFormat('square')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              format === 'square'
                ? 'bg-[#8B2F4A] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Square 1:1
          </button>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handleShareCard}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 text-xs font-bold transition-all disabled:opacity-50 min-h-[38px]"
          >
            <Share2 className="h-3.5 w-3.5 text-[#E06C88]" />
            <span>Share</span>
          </button>
          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#8B2F4A] hover:bg-[#72253c] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 min-h-[38px]"
          >
            {isExporting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>Export PNG</span>
          </button>
        </div>
      </header>

      {/* 2. Workspace Body (Responsive Layout) */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
        
        {/* DESKTOP LEFT PANEL: Templates */}
        <div className="hidden md:flex w-64 border-r border-zinc-800/80 bg-zinc-950 p-5 flex-col gap-4 overflow-y-auto shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Templates
          </h3>
          <div className="flex flex-col gap-3">
            {[
              { id: 'editorial', title: 'Editorial', desc: 'Warm off-white, classic quotes' },
              { id: 'midnight', title: 'Midnight', desc: 'Luxury dark, rose accents' },
              { id: 'album', title: 'Album', desc: 'Cover artwork backdrop' },
              { id: 'gradient', title: 'Gradient', desc: 'Vibrant wine gradients' },
              { id: 'minimal', title: 'Minimal', desc: 'Ultra clean white canvas' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTemplate(t.id as CardTemplate);
                  if (t.id === 'editorial') setBgPreset('#FAFAF8');
                  if (t.id === 'midnight') setBgPreset('#111111');
                  if (t.id === 'gradient') setBgPreset('linear-gradient(135deg, #8B2F4A 0%, #3B1323 50%, #1A0812 100%)');
                  if (t.id === 'minimal') setBgPreset('#FFFFFF');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  template === t.id
                    ? 'border-[#8B2F4A] bg-[#8B2F4A]/10 text-white'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <div className="font-editorial font-bold text-sm text-zinc-100">{t.title}</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CENTER PREVIEW AREA: Scaled Normalized 1080px Canvas */}
        <div
          ref={previewContainerRef}
          className="flex-1 bg-zinc-900/90 p-2 sm:p-6 flex items-center justify-center overflow-hidden relative min-h-0"
        >
          <div
            style={{
              width: `${1080 * previewScale}px`,
              height: `${(format === 'story' ? 1920 : 1080) * previewScale}px`,
              position: 'relative',
              borderRadius: `${16 * previewScale}px`,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            }}
          >
            {/* DOM Element for PNG Export */}
            <div
              ref={cardRef}
              style={{
                width: '1080px',
                height: format === 'story' ? '1920px' : '1080px',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              {renderCardContent()}
            </div>
          </div>
        </div>

        {/* DESKTOP RIGHT PANEL: Customization */}
        <div className="hidden md:flex w-80 border-l border-zinc-800/80 bg-zinc-950 p-5 flex-col overflow-y-auto shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
            Customize
          </h3>
          {renderCustomizeControls()}
        </div>

      </div>

      {/* 3. MOBILE CONTROLS & BOTTOM STRIP (Mobile Only) */}
      <div className="md:hidden border-t border-zinc-800/80 bg-zinc-950 p-3 flex flex-col gap-3 shrink-0">
        
        {/* Templates Visual Thumbnails Strip */}
        <div className="w-full">
          {renderTemplateThumbnails()}
        </div>

        {/* Customize Trigger Button */}
        <button
          id="mobile-customize-trigger"
          onClick={() => setIsCustomizeOpen(true)}
          className="w-full py-2.5 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 min-h-[44px]"
        >
          <Sliders className="h-4 w-4 text-[#E06C88]" />
          <span>Customize Typography, Colors & Details</span>
          <ChevronUp className="h-4 w-4 ml-auto text-zinc-500" />
        </button>

        {/* Primary Bottom Actions: [ Share ] and [ Export PNG ] */}
        <div className="flex items-center gap-2.5">
          <button
            id="mobile-share-card-button"
            onClick={handleShareCard}
            disabled={isExporting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all active:scale-98 disabled:opacity-50 min-h-[44px]"
          >
            <Share2 className="h-4 w-4 text-[#E06C88]" />
            <span>Share</span>
          </button>

          <button
            id="mobile-export-card-button"
            onClick={handleExportPng}
            disabled={isExporting}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#8B2F4A] hover:bg-[#72253c] text-white font-bold text-xs transition-all shadow-md active:scale-98 disabled:opacity-50 min-h-[44px]"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Export PNG</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* MOBILE CUSTOMIZE BOTTOM SHEET */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200">
          <div className="bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 space-y-4 max-h-[82vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-100">Customize Card</h3>
              <button
                onClick={() => setIsCustomizeOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {renderCustomizeControls()}

            <button
              onClick={() => setIsCustomizeOpen(false)}
              className="w-full py-3 rounded-xl bg-[#8B2F4A] text-white font-bold text-xs mt-4 shadow-sm min-h-[44px]"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
};
