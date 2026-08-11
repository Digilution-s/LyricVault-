import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Feather, Lock, Globe, Loader2, Link2, Music2, Music, Image as ImageIcon, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { ContentType, MoodType, ThemeType, Lyric } from '../types';
import { MOODS, THEMES, LANGUAGES, GENRES } from '../data/demoData';
import { lyricsService } from '../services/lyricsService';
import { useAuth } from '../hooks/useAuth';

import { detectMusicPlatform, parseSongLinks } from '../utils/musicPlatform';

interface CreateLyricModalProps {
  isOpen: boolean;
  editingLyric?: Lyric | null;
  onClose: () => void;
  onSaveLyric: (newLyric: Lyric) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CreateLyricModal: React.FC<CreateLyricModalProps> = ({
  isOpen,
  editingLyric,
  onClose,
  onSaveLyric,
  showToast,
}) => {
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('Lyric');
  const [authorName, setAuthorName] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [language, setLanguage] = useState<string>('English');
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [genre, setGenre] = useState<string>('');
  const [customGenre, setCustomGenre] = useState<string>('');
  const [songLinks, setSongLinks] = useState<string[]>(['']);
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [mood, setMood] = useState<MoodType | ''>('');
  const [selectedThemes, setSelectedThemes] = useState<ThemeType[]>([]);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Populate state on edit vs create
  useEffect(() => {
    if (editingLyric) {
      setTitle(editingLyric.title || '');
      setContent(editingLyric.content || '');
      setContentType(editingLyric.content_type || 'Lyric');
      setAuthorName(editingLyric.author_name || '');
      setSongTitle(editingLyric.song_title || '');
      setArtistName(editingLyric.artist_name || '');
      setAlbumName(editingLyric.album_name || '');
      
      const isKnownLang = LANGUAGES.includes(editingLyric.language || 'English');
      if (isKnownLang) {
        setLanguage(editingLyric.language || 'English');
        setCustomLanguage('');
      } else {
        setLanguage('Other');
        setCustomLanguage(editingLyric.language || '');
      }

      const isKnownGenre = GENRES.includes(editingLyric.genre || '');
      if (isKnownGenre || !editingLyric.genre) {
        setGenre(editingLyric.genre || '');
        setCustomGenre('');
      } else {
        setGenre('Other');
        setCustomGenre(editingLyric.genre || '');
      }

      const parsedLinks = parseSongLinks(editingLyric.song_link, editingLyric.song_links);
      setSongLinks(parsedLinks.length > 0 ? parsedLinks : ['']);
      setCoverUrl(editingLyric.cover_url || '');
      setMood((editingLyric.mood as MoodType) || '');
      setSelectedThemes(editingLyric.themes || []);
      setDescription(editingLyric.description || '');
      setVisibility(editingLyric.visibility === 'private' ? 'private' : 'public');
    } else {
      resetForm();
    }
    setInlineError(null);
    setShowDiscardConfirm(false);
  }, [editingLyric, isOpen]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setContentType('Lyric');
    setAuthorName('');
    setSongTitle('');
    setArtistName('');
    setAlbumName('');
    setLanguage('English');
    setCustomLanguage('');
    setGenre('');
    setCustomGenre('');
    setSongLinks(['']);
    setCoverUrl('');
    setMood('');
    setSelectedThemes([]);
    setDescription('');
    setVisibility('public');
    setInlineError(null);
  };

  const handleLinkChange = (index: number, value: string) => {
    if (value.includes('\n') || value.includes(',')) {
      const parts = value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        const next = [...songLinks];
        next.splice(index, 1, ...parts);
        setSongLinks(next);
        return;
      }
    }
    const next = [...songLinks];
    next[index] = value;
    setSongLinks(next);
  };

  const handleAddLink = (initialValue: string = '') => {
    setSongLinks((prev) => [...prev, initialValue]);
  };

  const handleRemoveLink = (index: number) => {
    setSongLinks((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [''];
    });
  };

  if (!isOpen) return null;

  // Check if dirty
  const isDirty = editingLyric
    ? title !== editingLyric.title || content !== editingLyric.content
    : title.trim().length > 0 || content.trim().length > 0;

  const handleAttemptClose = () => {
    if (isDirty && !isSavedSuccess) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    resetForm();
    onClose();
  };

  const toggleTheme = (theme: ThemeType) => {
    if (selectedThemes.includes(theme)) {
      setSelectedThemes(selectedThemes.filter((t) => t !== theme));
    } else {
      if (selectedThemes.length < 3) {
        setSelectedThemes([...selectedThemes, theme]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle) {
      setInlineError('Please add a title.');
      showToast('Please add a title.', 'error');
      return;
    }

    if (!cleanContent) {
      setInlineError('Please add some lyrics.');
      showToast('Please add some lyrics.', 'error');
      return;
    }

    if (!user) {
      showToast('You must be logged in to save a lyric.', 'error');
      return;
    }

    setIsSaving(true);

    const finalLanguage = language === 'Other' ? (customLanguage.trim() || 'English') : language;
    const finalGenre = genre === 'Other' ? (customGenre.trim() || undefined) : (genre.trim() || undefined);

    const cleanLinks = songLinks.map((l) => l.trim()).filter(Boolean);
    const finalSongLink = cleanLinks.length > 0 ? cleanLinks.join('\n') : undefined;

    const creatorInfo = {
      name: profile?.display_name || user.email?.split('@')[0] || 'LyricVault Creator',
      handle: profile?.username ? `@${profile.username}` : `@${user.email?.split('@')[0] || 'creator'}`,
      avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      userId: user.id,
    };

    try {
      if (editingLyric) {
        // Update
        const updatedLyric = await lyricsService.updateLyric(editingLyric.id, user.id, {
          title: cleanTitle,
          content: cleanContent,
          contentType,
          authorName: authorName.trim() || undefined,
          songTitle: songTitle.trim() || undefined,
          artistName: artistName.trim() || undefined,
          albumName: albumName.trim() || undefined,
          language: finalLanguage,
          genre: finalGenre,
          songLink: finalSongLink,
          coverUrl: coverUrl.trim() || undefined,
          mood,
          description: description.trim() || undefined,
          visibility,
          selectedThemes,
          creatorInfo,
          existingLyric: editingLyric,
        });

        onSaveLyric(updatedLyric);
        setIsSavedSuccess(true);
        showToast('Lyric updated successfully.', 'success');

        setTimeout(() => {
          setIsSavedSuccess(false);
          onClose();
        }, 800);
      } else {
        // Create
        const createdLyric = await lyricsService.createLyric({
          title: cleanTitle,
          content: cleanContent,
          contentType,
          authorName: authorName.trim() || undefined,
          songTitle: songTitle.trim() || undefined,
          artistName: artistName.trim() || undefined,
          albumName: albumName.trim() || undefined,
          language: finalLanguage,
          genre: finalGenre,
          songLink: finalSongLink,
          coverUrl: coverUrl.trim() || undefined,
          mood,
          description: description.trim() || undefined,
          visibility,
          selectedThemes,
          creatorInfo,
        });

        onSaveLyric(createdLyric);
        setIsSavedSuccess(true);
        showToast('Lyric saved successfully.', 'success');

        setTimeout(() => {
          setIsSavedSuccess(false);
          onClose();
          resetForm();
        }, 800);
      }
    } catch (err: any) {
      showToast(err.message || 'Unable to save lyric. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-0" onClick={handleAttemptClose} />

      <div
        className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 sm:p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="mx-auto h-1.5 w-12 rounded-full bg-[var(--border-color)] sm:hidden mb-3" />
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8B2F4A] text-white">
              <Feather className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
                {editingLyric ? 'Edit Lyric' : 'Save a Lyric'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {editingLyric
                  ? 'Update words, metadata, or visibility settings'
                  : 'Tell us about the words and add them to your vault'}
              </p>
            </div>
          </div>

          <button
            id="close-create-modal-button"
            onClick={handleAttemptClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inline Error Warning */}
        {inlineError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{inlineError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Title & Format */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="create-lyric-title-input"
                type="text"
                maxLength={200}
                placeholder="e.g. Midnight Thoughts"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (inlineError) setInlineError(null);
                }}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Content Type
              </label>
              <select
                id="create-lyric-type-select"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
              >
                <option value="Lyric">Lyric</option>
                <option value="Song Verse">Song Verse</option>
                <option value="Poetry">Poetry</option>
                <option value="Quote">Quote</option>
                <option value="Excerpt">Excerpt</option>
              </select>
            </div>
          </div>

          {/* Main Lyric Content Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Lyrics <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                {content.length.toLocaleString()} / 20,000
              </span>
            </div>
            <textarea
              id="create-lyric-content-input"
              rows={5}
              maxLength={20000}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (inlineError) setInlineError(null);
              }}
              placeholder="Paste or write the lyric lines here..."
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 p-4 font-editorial text-lg italic text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 focus:border-[#8B2F4A] focus:outline-none focus:ring-1 focus:ring-[#8B2F4A] leading-relaxed whitespace-pre-wrap"
            />
          </div>

          {/* Song Information */}
          <div className="rounded-2xl border border-[var(--border-color)]/80 bg-[var(--bg-muted)]/30 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Music2 className="h-3.5 w-3.5 text-[#8B2F4A] dark:text-[#E06C88]" />
                Song Information <span className="font-normal text-[var(--text-secondary)]">(Optional)</span>
              </span>
            </div>

            {/* Row 1: Song title, Artist, Album */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Song Title</label>
                <input
                  id="create-lyric-song-title-input"
                  type="text"
                  placeholder="e.g. Unspoken Waters"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Artist</label>
                <input
                  id="create-lyric-artist-input"
                  type="text"
                  placeholder="e.g. The Echo Drift"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Album</label>
                <input
                  id="create-lyric-album-input"
                  type="text"
                  placeholder="e.g. Distant Horizon"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                />
              </div>
            </div>

            {/* Row 2: Author, Language, Genre */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Author</label>
                <input
                  id="create-lyric-author-input"
                  type="text"
                  placeholder="e.g. Pablo Neruda"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Language</label>
                <select
                  id="create-lyric-language-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                {language === 'Other' && (
                  <input
                    id="create-lyric-custom-language-input"
                    type="text"
                    placeholder="Enter custom language..."
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">Genre</label>
                <select
                  id="create-lyric-genre-select"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                >
                  <option value="">Select genre (optional)</option>
                  {GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {genre === 'Other' && (
                  <input
                    id="create-lyric-custom-genre-input"
                    type="text"
                    placeholder="Enter custom genre..."
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* Row 3: Cover Image URL */}
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Cover Image URL
              </label>
              <div className="relative">
                <input
                  id="create-lyric-cover-url-input"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                />
                <ImageIcon className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--text-secondary)]" />
              </div>
            </div>

            {/* Song URLs Section (Multiple Links) */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Song URLs <span className="font-normal text-[var(--text-secondary)]">(Spotify, YouTube, Apple Music, etc.)</span>
                  </label>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                  
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddLink('')}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#8B2F4A]/10 px-2.5 py-1 text-xs font-semibold text-[#8B2F4A] hover:bg-[#8B2F4A]/20 dark:bg-[#8B2F4A]/20 dark:text-[#E06C88] transition-colors shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add URL</span>
                </button>
              </div>

              <div className="space-y-2">
                {songLinks.map((link, idx) => {
                  const platform = detectMusicPlatform(link);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          id={`create-lyric-song-link-input-${idx}`}
                          type="url"
                          placeholder={
                            idx === 0
                              ? 'e.g. https://open.spotify.com/track/...'
                              : idx === 1
                              ? 'e.g. https://youtube.com/watch?v=...'
                              : 'https://music.apple.com/...'
                          }
                          value={link}
                          onChange={(e) => handleLinkChange(idx, e.target.value)}
                          className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] pl-8 pr-28 py-1.5 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
                        />
                        <Link2 className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--text-secondary)]" />

                        {link.trim() ? (
                          <span
                            className={`absolute right-2 top-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${platform.color}`}
                          >
                            <Music className="h-2.5 w-2.5" />
                            <span>{platform.name}</span>
                          </span>
                        ) : null}
                      </div>

                      {songLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0"
                          title="Remove link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[var(--text-secondary)]">
                <span className="text-[10px] font-medium">Quick add:</span>
                <button
                  type="button"
                  onClick={() => handleAddLink('https://open.spotify.com/')}
                  className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  + Spotify
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLink('https://youtube.com/')}
                  className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  + YouTube
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLink('https://music.apple.com/')}
                  className="rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
                >
                  + Apple Music
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLink('https://soundcloud.com/')}
                  className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                >
                  + SoundCloud
                </button>
              </div>
            </div>
          </div>

          {/* Mood Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
              Select Primary Mood <span className="font-normal text-[var(--text-secondary)]">(Optional)</span>
            </label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(mood === m.id ? ('' as MoodType) : (m.id as MoodType))}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                    mood === m.id
                      ? 'bg-[#8B2F4A] text-white border-[#8B2F4A] dark:bg-[#E06C88] dark:text-zinc-950'
                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[#8B2F4A]/40'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme Selector */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Select Themes <span className="font-normal text-[var(--text-secondary)]">(Optional, select up to 3)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {THEMES.map((t) => {
                const isSel = selectedThemes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTheme(t.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      isSel
                        ? 'bg-[#8B2F4A]/15 text-[#8B2F4A] font-semibold dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
                        : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    #{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Description / Notes <span className="font-normal text-[var(--text-secondary)]">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Personal commentary, backstory, or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[#8B2F4A] focus:outline-none"
            />
          </div>

          {/* Visibility Options */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Visibility:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors ${
                  visibility === 'public'
                    ? 'bg-[#8B2F4A]/10 text-[#8B2F4A] font-semibold dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Public</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex items-center gap-1 rounded-full px-3 py-1 font-medium transition-colors ${
                  visibility === 'private'
                    ? 'bg-[#8B2F4A]/10 text-[#8B2F4A] font-semibold dark:bg-[#E06C88]/20 dark:text-[#E06C88]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Private</span>
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="rounded-full px-5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>

            <button
              id="submit-create-lyric-button"
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-all ${
                isSaving
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
                <span>Saved</span>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>{editingLyric ? 'Update Lyric' : 'Save Lyric'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Discard Changes Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4">
            <h3 className="font-editorial text-xl font-bold text-[var(--text-primary)]">
              Discard changes?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              You have unsaved edits. Are you sure you want to discard them?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="rounded-full border border-[var(--border-color)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
              >
                Continue Editing
              </button>
              <button
                id="confirm-discard-button"
                type="button"
                onClick={handleConfirmDiscard}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
