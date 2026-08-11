import React, { useState } from 'react';
import { Sparkles, ArrowDown, Send, Feather, Check, Loader2 } from 'lucide-react';
import { ContentType, MoodType, ThemeType, Lyric } from '../types';
import { MOODS, THEMES } from '../data/demoData';
import { lyricsService } from '../services/lyricsService';

interface HeroProps {
  onLyricCreated: (newLyric: Lyric) => void;
  onExploreClick: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const Hero: React.FC<HeroProps> = ({ onLyricCreated, onExploreClick, showToast }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [authorOrArtist, setAuthorOrArtist] = useState('');
  const [contentType, setContentType] = useState<ContentType>('Lyric');
  const [selectedMood, setSelectedMood] = useState<MoodType>('Melancholic');
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('Night');
  const [showMetadata, setShowMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() && !content.trim()) {
      showToast('Please enter a title.', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('Please enter a title.', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Please add some lyrics.', 'error');
      return;
    }

    setIsSaving(true);

    try {
      const created = await lyricsService.createLyric({
        title: title.trim(),
        content: content.trim(),
        contentType,
        authorName: authorOrArtist.trim() || undefined,
        songTitle: authorOrArtist.trim() || undefined,
        mood: selectedMood,
        selectedThemes: [selectedTheme],
        visibility: 'public',
      });

      onLyricCreated(created);
      setIsSavedSuccess(true);
      showToast('Lyric saved successfully.', 'success');

      setTimeout(() => {
        setContent('');
        setTitle('');
        setAuthorOrArtist('');
        setShowMetadata(false);
        setIsSavedSuccess(false);
      }, 2000);
    } catch (err: any) {
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-12 md:py-16 lg:py-20 border-b border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-muted)]/50 to-[var(--bg-primary)]">
      {/* Decorative ambient blurred dots */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-[#8B2F4A]/10 blur-3xl dark:bg-[#E06C88]/15" />
      <div className="absolute top-10 right-10 -z-10 h-48 w-48 rounded-full bg-[#C98B9E]/10 blur-2xl" />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-2xs">
          <Feather className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
          <span>A Social Library for Lyrics & Words</span>
        </div>

        {/* Hero Headline */}
        <h1 className="mt-6 font-editorial text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1]">
          Save the words that <br className="hidden sm:inline" />
          <span className="italic text-[#8B2F4A] dark:text-[#E06C88]">stay with you.</span>
        </h1>

        {/* Supporting Text */}
        <p className="mx-auto mt-6 max-w-2xl text-base text-[var(--text-secondary)] sm:text-lg leading-relaxed">
          Discover lyrics worth remembering, save your favorites, and build your personal library of words.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#lyric-input-box"
            className="inline-flex items-center gap-2 rounded-full bg-[#8B2F4A] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#72253c] hover:shadow-lg active:scale-95 dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d65775]"
          >
            <Send className="h-4 w-4" />
            <span>Save a Lyric</span>
          </a>

          <button
            id="explore-lyrics-button"
            onClick={onExploreClick}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-2xs transition-all hover:bg-[var(--bg-muted)] active:scale-95"
          >
            <span>Explore Lyrics</span>
            <ArrowDown className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Large Lyric-Saving Input Card */}
        <div
          id="lyric-input-box"
          className="mx-auto mt-12 max-w-2xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 sm:p-6 shadow-md text-left transition-all focus-within:border-[#8B2F4A]/50 focus-within:ring-2 focus-within:ring-[#8B2F4A]/20"
        >
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]/60 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
                Quick Lyric Saver
              </span>
              <button
                type="button"
                onClick={() => setShowMetadata(!showMetadata)}
                className="hover:text-[var(--text-primary)] underline transition-colors"
              >
                {showMetadata ? 'Hide details' : '+ Add song/author details'}
              </button>
            </div>

            {/* Title Input */}
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="homepage-lyric-title-input"
                type="text"
                placeholder="e.g. Midnight Thoughts"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              />
            </div>

            {/* Content Textarea */}
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                Lyric Content <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="homepage-lyric-textarea"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste a lyric you want to save...&#10;&#10;e.g. 'I keep talking to the silence because it never leaves.'"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 p-3 font-editorial text-lg italic text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[#8B2F4A] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Expandable Optional Metadata */}
            {showMetadata && (
              <div className="mt-4 space-y-3 pt-3 border-t border-[var(--border-color)]/50 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                    Artist / Author
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Taylor Swift or Lord Byron"
                    value={authorOrArtist}
                    onChange={(e) => setAuthorOrArtist(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Format
                    </label>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value as ContentType)}
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="Lyric">Lyric</option>
                      <option value="Poetry">Poetry</option>
                      <option value="Quote">Quote</option>
                      <option value="Excerpt">Excerpt</option>
                      <option value="Song Verse">Song Verse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Mood
                    </label>
                    <select
                      value={selectedMood}
                      onChange={(e) => setSelectedMood(e.target.value as MoodType)}
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      {MOODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.icon} {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Theme
                    </label>
                    <select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value as ThemeType)}
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      {THEMES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Form Footer Action */}
            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-color)]/60 pt-3">
              <span className="text-[11px] text-[var(--text-secondary)] italic">
                {content.trim() ? `${content.trim().length} chars` : 'Word-first saving'}
              </span>

              <button
                id="homepage-save-lyric-submit"
                type="submit"
                disabled={isSaving}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all ${
                  isSavedSuccess
                    ? 'bg-emerald-600'
                    : isSaving
                    ? 'bg-[#8B2F4A]/80 cursor-wait'
                    : 'bg-[#8B2F4A] hover:bg-[#72253c] dark:bg-[#E06C88] dark:text-zinc-950 dark:hover:bg-[#d65775]'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isSavedSuccess ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Save Lyric</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

