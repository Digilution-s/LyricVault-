import React from 'react';
import { MoodType } from '../types';
import { MOODS } from '../data/demoData';

interface MoodChipProps {
  moodId: MoodType;
  isSelected?: boolean;
  onClick: (mood: MoodType) => void;
}

export const MoodChip: React.FC<MoodChipProps> = ({ moodId, isSelected, onClick }) => {
  const mood = MOODS.find((m) => m.id === moodId) || {
    id: moodId,
    label: moodId,
    icon: '✨',
    color: 'bg-zinc-100 text-zinc-800 border-zinc-200',
  };

  return (
    <button
      id={`mood-chip-${mood.id.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={() => onClick(mood.id)}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
        isSelected
          ? 'bg-[#8B2F4A] text-white border-[#8B2F4A] shadow-xs dark:bg-[#E06C88] dark:text-zinc-950 dark:border-[#E06C88]'
          : `${mood.color} hover:scale-105 active:scale-95 cursor-pointer`
      }`}
    >
      <span className="text-sm">{mood.icon}</span>
      <span>{mood.label}</span>
    </button>
  );
};
