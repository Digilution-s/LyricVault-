import React from 'react';
import { LyricTranslation } from '../types';

interface ParallelLyricsViewProps {
  originalContent: string;
  translation: LyricTranslation;
  fontFamily?: 'serif' | 'sans';
  fontSize?: number;
  lineHeight?: number;
  textColor?: string;
  mutedColor?: string;
  accentColor?: string;
}

export const ParallelLyricsView: React.FC<ParallelLyricsViewProps> = ({
  originalContent,
  translation,
  fontFamily = 'serif',
  fontSize = 20,
  lineHeight = 1.6,
  textColor = 'var(--text-primary)',
  mutedColor = 'var(--text-secondary)',
  accentColor = '#8B2F4A',
}) => {
  const origLines = originalContent.split('\n');
  const transLines = translation.translated_content.split('\n');

  // Pair lines by index
  const maxLines = Math.max(origLines.length, transLines.length);
  const paired: { orig: string; trans: string; isBlank: boolean }[] = [];

  for (let i = 0; i < maxLines; i++) {
    const orig = origLines[i] || '';
    const trans = transLines[i] || '';
    const isBlank = !orig.trim() && !trans.trim();
    paired.push({ orig, trans, isBlank });
  }

  return (
    <div
      className={`space-y-4 transition-all duration-200 ${
        fontFamily === 'serif' ? 'font-editorial' : 'font-sans'
      }`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight,
      }}
    >
      {paired.map((item, idx) => {
        if (item.isBlank) {
          return <div key={idx} className="h-6" />;
        }

        return (
          <div
            key={idx}
            className="group/pair p-2.5 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 border-l-2 pl-3"
            style={{ borderColor: `${accentColor}40` }}
          >
            {/* Original Line */}
            {item.orig && (
              <div
                className="font-medium tracking-wide"
                style={{ color: textColor }}
              >
                {item.orig}
              </div>
            )}

            {/* Transliterated or Translated Line */}
            {item.trans && (
              <div
                className="text-[0.9em] italic font-normal tracking-wide mt-0.5 opacity-90 transition-opacity"
                style={{ color: mutedColor }}
              >
                {item.trans}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
