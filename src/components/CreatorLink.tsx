import React from 'react';

interface CreatorLinkProps {
  handle: string;
  name?: string;
  avatar?: string;
  showAvatar?: boolean;
  className?: string;
  onClickCreator: (username: string) => void;
}

export const CreatorLink: React.FC<CreatorLinkProps> = ({
  handle,
  name,
  avatar,
  showAvatar = false,
  className = '',
  onClickCreator,
}) => {
  const cleanUsername = handle ? handle.replace(/^@/, '').trim() : '';
  const displayHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : '@creator';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cleanUsername) {
      onClickCreator(cleanUsername);
    }
  };

  return (
    <button
      type="button"
      id={`creator-link-${cleanUsername}`}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)] hover:text-[#8B2F4A] dark:hover:text-[#E06C88] transition-colors cursor-pointer text-left ${className}`}
      title={`View @${cleanUsername}'s profile`}
    >
      {showAvatar && avatar && (
        <img
          src={avatar}
          alt={name || cleanUsername}
          className="h-4 w-4 rounded-full object-cover shrink-0 border border-[var(--border-color)]"
        />
      )}
      <span className="truncate">{displayHandle}</span>
    </button>
  );
};
