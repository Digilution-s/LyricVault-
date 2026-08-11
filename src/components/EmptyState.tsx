import React from 'react';
import { Bookmark, Sparkles, FolderHeart, Feather } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: 'bookmark' | 'collection' | 'feather';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon = 'bookmark',
}) => {
  return (
    <div className="mx-auto my-12 flex max-w-md flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-muted)] text-[#8B2F4A] dark:text-[#E06C88] mb-4">
        {icon === 'collection' ? (
          <FolderHeart className="h-7 w-7" />
        ) : icon === 'feather' ? (
          <Feather className="h-7 w-7" />
        ) : (
          <Bookmark className="h-7 w-7" />
        )}
      </div>

      <h3 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
        {title}
      </h3>

      <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
