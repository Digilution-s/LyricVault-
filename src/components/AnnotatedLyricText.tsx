import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Plus, BookOpen } from 'lucide-react';
import { LyricAnnotation } from '../types';

interface SelectionInfo {
  selectedText: string;
  startPosition: number;
  endPosition: number;
}

interface AnnotatedLyricTextProps {
  content: string;
  annotations: LyricAnnotation[];
  onSelectAnnotation: (annotation: LyricAnnotation) => void;
  onRequestAddAnnotation: (selection: SelectionInfo) => void;
  onRequestCreateCard?: (selection: SelectionInfo) => void;
  className?: string;
  fontFamily?: 'serif' | 'sans';
  style?: React.CSSProperties;
  customTextClassName?: string;
  centerText?: boolean;
  showDoubleQuotes?: boolean;
}

export const AnnotatedLyricText: React.FC<AnnotatedLyricTextProps> = ({
  content,
  annotations,
  onSelectAnnotation,
  onRequestAddAnnotation,
  onRequestCreateCard,
  className = '',
  fontFamily = 'serif',
  style = {},
  customTextClassName = '',
  centerText = false,
  showDoubleQuotes = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeSelection, setActiveSelection] = useState<SelectionInfo | null>(null);

  // Clear selection bar when clicking outside or scrolling
  const clearSelection = useCallback(() => {
    setActiveSelection(null);
  }, []);

  const handleSelectionCheck = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 2) {
      return;
    }

    // Ensure selection is inside our container
    if (containerRef.current && selection.anchorNode && containerRef.current.contains(selection.anchorNode)) {
      // Find start position in original content
      let startPos = content.indexOf(text);
      if (startPos === -1) {
        // Fallback case-insensitive match
        const lowerContent = content.toLowerCase();
        const lowerText = text.toLowerCase();
        startPos = lowerContent.indexOf(lowerText);
      }

      if (startPos !== -1) {
        const endPos = startPos + text.length;
        setActiveSelection({
          selectedText: text,
          startPosition: startPos,
          endPosition: endPos,
        });
        return;
      }
    }
  }, [content]);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleSelectionCheck, 50);
    };

    const handleTouchEnd = () => {
      setTimeout(handleSelectionCheck, 150);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSelectionCheck]);

  // Helper to render text with annotated highlights
  const renderAnnotatedContent = () => {
    const fontClass = fontFamily === 'sans' ? 'font-sans' : 'font-editorial';
    const alignClass = centerText ? 'text-center' : 'text-left';
    const textClasses = `whitespace-pre-line tracking-wide transition-all duration-150 ${fontClass} ${alignClass} ${customTextClassName}`;

    if (!annotations || annotations.length === 0) {
      return (
        <p className={textClasses} style={style}>
          {showDoubleQuotes ? '"' : null}
          {content}
          {showDoubleQuotes ? '"' : null}
        </p>
      );
    }

    // Sort valid annotations by start_position
    const sorted = [...annotations]
      .filter((a) => a.start_position >= 0 && a.start_position < content.length)
      .sort((a, b) => a.start_position - b.start_position);

    // Build chunks
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    sorted.forEach((anno, index) => {
      // Add unannotated text before this annotation
      if (anno.start_position > currentIndex) {
        const plainText = content.substring(currentIndex, anno.start_position);
        elements.push(
          <span key={`plain-${currentIndex}`}>
            {plainText}
          </span>
        );
      }

      // Add annotated text segment
      const endPos = Math.min(anno.end_position, content.length);
      const annoText = content.substring(anno.start_position, endPos) || anno.selected_text;

      elements.push(
        <mark
          key={`anno-${anno.id}-${index}`}
          id={`annotated-span-${anno.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectAnnotation(anno);
          }}
          className="group/mark cursor-pointer rounded-sm bg-[#8B2F4A]/20 dark:bg-[#E06C88]/30 border-b-2 border-[#8B2F4A] dark:border-[#E06C88] px-1 py-0.5 mx-0.5 inline-flex items-center gap-1 hover:bg-[#8B2F4A]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#8B2F4A]"
          style={{ color: 'inherit' }}
          title={`Your note: "${anno.note.substring(0, 40)}..."`}
        >
          <span>{annoText}</span>
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#8B2F4A] text-white dark:bg-[#E06C88] dark:text-zinc-950 text-[9px] font-bold shrink-0 align-middle shadow-xs">
            ✍
          </span>
        </mark>
      );

      currentIndex = Math.max(currentIndex, endPos);
    });

    // Add trailing text after last annotation
    if (currentIndex < content.length) {
      elements.push(
        <span key={`plain-end-${currentIndex}`}>
          {content.substring(currentIndex)}
        </span>
      );
    }

    return (
      <p className={textClasses} style={style}>
        {showDoubleQuotes ? '"' : null}
        {elements}
        {showDoubleQuotes ? '"' : null}
      </p>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {renderAnnotatedContent()}

      {/* Mobile-First Floating Contextual Action Bar on Text Selection */}
      {activeSelection && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)]/95 px-4 py-2 shadow-2xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] max-w-[180px] sm:max-w-xs truncate">
            <Sparkles className="h-4 w-4 text-[#8B2F4A] dark:text-[#E06C88] shrink-0" />
            <span className="italic truncate">"{activeSelection.selectedText}"</span>
          </div>

          <button
            id="selection-add-note-button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const sel = activeSelection;
              setActiveSelection(null);
              // Clear browser selection
              if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
              }
              onRequestAddAnnotation(sel);
            }}
            className="touch-target flex h-10 items-center gap-1 rounded-full bg-[#8B2F4A] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#72243b] dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d45876] transition-all shadow-md active:scale-95 shrink-0 min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Note</span>
          </button>

          <button
            id="selection-create-card-button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const sel = activeSelection;
              setActiveSelection(null);
              if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
              }
              if (onRequestCreateCard) {
                onRequestCreateCard(sel);
              }
            }}
            className="touch-target flex h-10 items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all shadow-xs active:scale-95 shrink-0 min-h-[44px]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
            <span>Card</span>
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 text-xs"
            aria-label="Dismiss selection bar"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
