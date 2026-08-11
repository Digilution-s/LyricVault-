import React from 'react';
import { Collection } from '../types';
import { FolderHeart, Lock, Globe, User } from 'lucide-react';

interface CollectionCardProps {
  collection: Collection;
  onClick: (col: Collection) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({ collection, onClick }) => {
  const isPrivate = collection.privacy === 'private';

  return (
    <div
      id={`collection-card-${collection.id}`}
      onClick={() => onClick(collection)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#8B2F4A]/30 hover:shadow-md cursor-pointer"
    >
      {/* Visual Accent Banner */}
      <div
        className={`h-28 w-full rounded-xl bg-gradient-to-r ${
          collection.cover_gradient || 'from-rose-950 via-pink-950 to-slate-950'
        } p-4 flex flex-col justify-between text-white relative overflow-hidden`}
      >
        <div className="flex items-center justify-between z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold backdrop-blur-md">
            {isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            <span>{isPrivate ? 'Private' : 'Public'} Anthology</span>
          </span>
          <span className="text-[11px] font-medium opacity-90">{collection.item_count} items</span>
        </div>

        <div className="z-10">
          <h3 className="font-editorial text-xl font-bold tracking-tight text-white line-clamp-1">
            {collection.title || collection.name}
          </h3>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
      </div>

      {/* Description */}
      <div className="mt-4 flex-1">
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {collection.description || 'No description provided.'}
        </p>
      </div>

      {/* Footer Creator Info */}
      <div className="mt-4 pt-3 border-t border-[var(--border-color)]/60 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2 truncate pr-2">
          {collection.created_by.avatar ? (
            <img
              src={collection.created_by.avatar}
              alt={collection.created_by.name}
              className="h-5 w-5 rounded-full object-cover shrink-0"
            />
          ) : (
            <User className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
          )}
          <span className="font-medium text-[var(--text-primary)] truncate">{collection.created_by.name}</span>
        </div>

        <span className="text-[10px] text-[#8B2F4A] dark:text-[#E06C88] font-semibold shrink-0">View Anthology →</span>
      </div>
    </div>
  );
};
