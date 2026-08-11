export interface GradientOption {
  id: string;
  name: string;
  class: string;
}

export const COLLECTION_GRADIENTS: GradientOption[] = [
  { id: 'rose', name: 'Rose Dusk', class: 'from-rose-950 via-pink-950 to-slate-950' },
  { id: 'purple', name: 'Midnight Amethyst', class: 'from-purple-950 via-indigo-950 to-slate-950' },
  { id: 'blue', name: 'Deep Indigo', class: 'from-blue-950 via-slate-900 to-indigo-950' },
  { id: 'green', name: 'Emerald Velvet', class: 'from-emerald-950 via-teal-950 to-slate-950' },
  { id: 'orange', name: 'Amber Sunset', class: 'from-amber-950 via-orange-950 to-slate-950' },
  { id: 'dark', name: 'Obsidian Shadow', class: 'from-zinc-950 via-neutral-900 to-stone-950' },
  { id: 'neutral', name: 'Warm Charcoal', class: 'from-stone-900 via-neutral-800 to-zinc-900' },
];
