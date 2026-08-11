import React from 'react';
import { ThemeType } from '../types';
import { THEMES } from '../data/demoData';
import { Hash } from 'lucide-react';

interface ThemeCardProps {
  themeId: ThemeType;
  isSelected?: boolean;
  onClick: (theme: ThemeType) => void;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ themeId, isSelected, onClick }) => {
  const theme = THEMES.find((t) => t.id === themeId) || { id: themeId, label: themeId, count: 12 };

  return (
    <button
      id={`theme-card-${theme.id.toLowerCase()}`}
      onClick={() => onClick(theme.id)}
      className={`group flex items-center justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
        isSelected
          ? 'border-[#8B2F4A] bg-[#8B2F4A]/5 dark:border-[#E06C88] dark:bg-[#E06C88]/10'
          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[#8B2F4A]/40 hover:bg-[var(--bg-muted)]/50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-[#8B2F4A] dark:text-[#E06C88] group-hover:bg-[#8B2F4A]/10">
          <Hash className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#8B2F4A] dark:group-hover:text-[#E06C88]">
            {theme.label}
          </h4>
          <p className="text-[11px] text-[var(--text-secondary)]">{theme.count} lyrics</p>
        </div>
      </div>
    </button>
  );
};
