import React from 'react';
import { ThemeType } from '../types';
import { THEMES } from '../data/demoData';
import { Hash } from 'lucide-react';

interface ThemeCardProps {
  themeId: ThemeType | string;
  label?: string;
  count: number;
  isSelected?: boolean;
  onClick: (theme: ThemeType) => void;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ themeId, label, count, isSelected, onClick }) => {
  const themeObj = THEMES.find((t) => t.id === themeId);
  const displayLabel = label || themeObj?.label || themeId;

  return (
    <button
      id={`theme-card-${String(themeId).toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      onClick={() => onClick(themeId as ThemeType)}
      className={`group flex items-center justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
        isSelected
          ? 'border-[#8B2F4A] bg-[#8B2F4A]/5 dark:border-[#E06C88] dark:bg-[#E06C88]/10'
          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[#8B2F4A]/40 hover:bg-[var(--bg-muted)]/50'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[#8B2F4A] dark:text-[#E06C88] group-hover:bg-[#8B2F4A]/10 shrink-0">
          <Hash className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#8B2F4A] dark:group-hover:text-[#E06C88] truncate">
            {displayLabel}
          </h4>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {count} {count === 1 ? 'lyric' : 'lyrics'}
          </p>
        </div>
      </div>
    </button>
  );
};
