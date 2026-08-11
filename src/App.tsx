import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { MobileNavbar } from './components/MobileNavbar';
import { LyricDetailModal } from './components/LyricDetailModal';
import { LyricReader } from './components/LyricReader';
import { CreateLyricModal } from './components/CreateLyricModal';
import { DeleteLyricModal } from './components/DeleteLyricModal';
import { AddToCollectionModal } from './components/AddToCollectionModal';
import { CreateCollectionModal } from './components/CreateCollectionModal';
import { AuthPromptModal } from './components/AuthPromptModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { HomeView } from './views/HomeView';
import { DiscoverView } from './views/DiscoverView';
import { LibraryView } from './views/LibraryView';
import { CollectionsView } from './views/CollectionsView';
import { ProfileView } from './views/ProfileView';
import { PublicProfileView } from './views/PublicProfileView';
import { PublicLyricView } from './views/PublicLyricView';
import { LoginView } from './views/LoginView';
import { SignupView } from './views/SignupView';
import { INITIAL_LYRICS, INITIAL_COLLECTIONS } from './data/demoData';
import { Lyric, Collection, MoodType, ThemeType } from './types';
import { lyricsService } from './services/lyricsService';
import { bookmarkService } from './services/bookmarkService';
import { collectionService } from './services/collectionService';
import { likeService } from './services/likeService';

function MainApp() {
  const { user, profile, isAuthenticated } = useAuth();
  const currentUserId = user?.id || 'demo_user_123';

  // State for lyrics & collections
  const [lyrics, setLyrics] = useState<Lyric[]>(INITIAL_LYRICS);
  const [collections, setCollections] = useState<Collection[]>(INITIAL_COLLECTIONS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // High-Contrast Dark Mode Toggle (Defaults to true for dark mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('lyricvault_darkmode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Auth Prompt Modal State
  const [authPromptOpen, setAuthPromptOpen] = useState<boolean>(false);
  const [authPromptContext, setAuthPromptContext] = useState<'save' | 'bookmark'>('bookmark');

  // Route & Navigation State
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [viewingUsername, setViewingUsername] = useState<string>('');
  const [viewingLyricId, setViewingLyricId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMoodFilter, setActiveMoodFilter] = useState<MoodType | undefined>(undefined);
  const [activeThemeFilter, setActiveThemeFilter] = useState<ThemeType | undefined>(undefined);

  // Synchronize route from URL on mount & back/forward navigation
  useEffect(() => {
    const handleUrlRouting = () => {
      const path = window.location.pathname;
      const profileMatch = path.match(/^\/profile\/@?([^/]+)/);
      const lyricMatch = path.match(/^\/lyrics\/([^/]+)/);

      if (profileMatch && profileMatch[1]) {
        setViewingUsername(profileMatch[1]);
        setCurrentTab('public_profile');
      } else if (lyricMatch && lyricMatch[1]) {
        setViewingLyricId(lyricMatch[1]);
        setCurrentTab('public_lyric');
      }
    };

    handleUrlRouting();

    window.addEventListener('popstate', handleUrlRouting);
    return () => window.removeEventListener('popstate', handleUrlRouting);
  }, []);

  const handleSelectCreator = (username: string) => {
    const cleanHandle = username.replace(/^@/, '');
    setViewingUsername(cleanHandle);
    setCurrentTab('public_profile');
    window.history.pushState(null, '', `/profile/@${cleanHandle}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Selected Lyric Modal State
  const [selectedLyric, setSelectedLyric] = useState<Lyric | null>(null);

  // Full-screen Reading Mode State
  const [readingLyric, setReadingLyric] = useState<Lyric | null>(null);

  const handleOpenReadingMode = (lyric: Lyric) => {
    setReadingLyric(lyric);
  };

  // Create / Edit Lyric Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingLyric, setEditingLyric] = useState<Lyric | null>(null);
  const [deletingLyric, setDeletingLyric] = useState<Lyric | null>(null);

  // Add To Collection Modal State
  const [addToCollectionLyric, setAddToCollectionLyric] = useState<Lyric | null>(null);
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState<boolean>(false);
  const [isCreateCollectionOpenFromAdd, setIsCreateCollectionOpenFromAdd] = useState<boolean>(false);

  // Fetch lyrics & collections from Supabase on mount / auth change
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [fetchedLyrics, fetchedCollections] = await Promise.all([
          lyricsService.getPublicLyrics(user?.id),
          collectionService.getCollections(user?.id),
        ]);

        // Check bookmark status for each lyric if logged in
        const lyricsWithSavedStatus = await Promise.all(
          fetchedLyrics.map(async (l) => {
            const isSaved = isAuthenticated && user ? await bookmarkService.isLyricBookmarked(user.id, l.id) : false;
            const count = await bookmarkService.getLyricBookmarkCount(l.id);
            return {
              ...l,
              is_saved: isSaved,
              saves_count: Math.max(l.saves_count, count),
            };
          })
        );

        setLyrics(lyricsWithSavedStatus);
        setCollections(fetchedCollections);
      } catch (err) {
        console.error('Failed to load initial data from Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    localStorage.setItem('lyricvault_darkmode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleOpenAuthPrompt = (context: 'save' | 'bookmark' = 'bookmark') => {
    setAuthPromptContext(context);
    setAuthPromptOpen(true);
  };

  // Toggle Like Handler with Supabase Integration
  const handleToggleLike = async (e: React.MouseEvent, lyricId: string) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      handleOpenAuthPrompt('save');
      return;
    }

    const target = lyrics.find((l) => l.id === lyricId);
    if (!target) return;

    const willLike = !target.is_liked;

    // Optimistic UI update
    setLyrics((prev) =>
      prev.map((l) => {
        if (l.id === lyricId) {
          return {
            ...l,
            is_liked: willLike,
            likes_count: willLike ? l.likes_count + 1 : Math.max(0, l.likes_count - 1),
          };
        }
        return l;
      })
    );

    if (selectedLyric && selectedLyric.id === lyricId) {
      setSelectedLyric((prev) =>
        prev
          ? {
              ...prev,
              is_liked: willLike,
              likes_count: willLike ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1),
            }
          : null
      );
    }

    // Persist to Supabase
    try {
      const res = await likeService.toggleLike(currentUserId, lyricId);
      // Sync exact count and liked state from server
      setLyrics((prev) =>
        prev.map((l) => {
          if (l.id === lyricId) {
            return {
              ...l,
              is_liked: res.liked,
              likes_count: res.count,
            };
          }
          return l;
        })
      );

      if (selectedLyric && selectedLyric.id === lyricId) {
        setSelectedLyric((prev) =>
          prev ? { ...prev, is_liked: res.liked, likes_count: res.count } : null
        );
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update on failure
      setLyrics((prev) =>
        prev.map((l) => {
          if (l.id === lyricId) {
            return {
              ...l,
              is_liked: !willLike,
              likes_count: !willLike ? l.likes_count + 1 : Math.max(0, l.likes_count - 1),
            };
          }
          return l;
        })
      );

      if (selectedLyric && selectedLyric.id === lyricId) {
        setSelectedLyric((prev) =>
          prev
            ? {
                ...prev,
                is_liked: !willLike,
                likes_count: !willLike ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1),
              }
            : null
        );
      }
      showToast('Could not sync like with server.', 'error');
    }
  };

  // Toggle Bookmark / Save with Supabase Integration
  const handleToggleSave = async (e: React.MouseEvent, lyricId: string) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      handleOpenAuthPrompt('bookmark');
      return;
    }

    const target = lyrics.find((l) => l.id === lyricId);
    if (!target) return;

    const willSave = !target.is_saved;

    // Optimistic UI update
    setLyrics((prev) =>
      prev.map((l) => {
        if (l.id === lyricId) {
          return {
            ...l,
            is_saved: willSave,
            saves_count: willSave ? l.saves_count + 1 : Math.max(0, l.saves_count - 1),
          };
        }
        return l;
      })
    );

    if (selectedLyric && selectedLyric.id === lyricId) {
      setSelectedLyric((prev) =>
        prev
          ? {
              ...prev,
              is_saved: willSave,
              saves_count: willSave ? prev.saves_count + 1 : Math.max(0, prev.saves_count - 1),
            }
          : null
      );
    }

    // Call Supabase service
    try {
      if (willSave) {
        await bookmarkService.bookmarkLyric(currentUserId, lyricId);
        showToast('Saved to your Library.', 'success');
      } else {
        await bookmarkService.unbookmarkLyric(currentUserId, lyricId);
        showToast('Removed from your Library.', 'info');
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      showToast('Could not sync bookmark with server.', 'error');
    }
  };

  // Callback when a lyric is created or updated
  const handleLyricSavedOrUpdated = (savedLyric: Lyric) => {
    setLyrics((prev) => {
      const exists = prev.some((l) => l.id === savedLyric.id);
      if (exists) {
        return prev.map((l) => (l.id === savedLyric.id ? savedLyric : l));
      } else {
        return [savedLyric, ...prev];
      }
    });

    if (selectedLyric?.id === savedLyric.id) {
      setSelectedLyric(savedLyric);
    }

    if (isAuthenticated && user) {
      bookmarkService.bookmarkLyric(user.id, savedLyric.id);
    }
  };

  // Open Edit Modal for a lyric
  const handleOpenEditLyric = (lyric: Lyric) => {
    setEditingLyric(lyric);
    setIsCreateModalOpen(true);
  };

  // Open Delete Modal for a lyric
  const handleOpenDeleteLyric = (lyric: Lyric) => {
    setDeletingLyric(lyric);
  };

  // Handle Lyric Deleted
  const handleLyricDeleted = (lyricId: string) => {
    setLyrics((prev) => prev.filter((l) => l.id !== lyricId));
    if (selectedLyric?.id === lyricId) {
      setSelectedLyric(null);
    }
  };

  // Refresh collections from Supabase
  const refreshCollections = async () => {
    try {
      const fetched = await collectionService.getCollections(user?.id);
      setCollections(fetched);
    } catch (err) {
      console.error('Error refreshing collections:', err);
    }
  };

  // Open Add to Collection Modal
  const handleOpenAddToCollection = (lyric: Lyric) => {
    if (!isAuthenticated) {
      handleOpenAuthPrompt('bookmark');
      return;
    }
    setAddToCollectionLyric(lyric);
    setIsAddToCollectionOpen(true);
  };

  // Create new collection submit
  const handleCreateCollectionSubmit = async (data: {
    title: string;
    description: string;
    privacy: 'public' | 'private';
    coverGradient: string;
    coverUrl?: string;
  }) => {
    if (!user) throw new Error('You must be logged in to create a collection.');

    const createdCol = await collectionService.createCollection({
      userId: user.id,
      title: data.title,
      description: data.description,
      privacy: data.privacy,
      coverGradient: data.coverGradient,
      coverUrl: data.coverUrl,
      userHandle: profile?.username ? `@${profile.username}` : undefined,
      displayName: profile?.display_name,
    });

    setCollections((prev) => [createdCol, ...prev]);
    showToast(`Collection "${createdCol.title}" created.`, 'success');
  };

  // Update collection submit
  const handleUpdateCollectionSubmit = async (
    collectionId: string,
    updates: {
      title: string;
      description: string;
      privacy: 'public' | 'private';
      cover_gradient: string;
      cover_url?: string;
    }
  ) => {
    const updatedCol = await collectionService.updateCollection(collectionId, updates);
    setCollections((prev) => prev.map((c) => (c.id === collectionId ? updatedCol : c)));
    showToast(`Collection "${updatedCol.title}" updated.`, 'success');
  };

  // Delete collection submit
  const handleDeleteCollectionSubmit = async (collectionId: string) => {
    await collectionService.deleteCollection(collectionId);
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
  };

  // Handle Tab Navigation with Optional Filters
  const handleNavigateTab = (tab: string, moodFilter?: MoodType, themeFilter?: ThemeType) => {
    setCurrentTab(tab);
    if (tab !== 'public_profile' && window.location.pathname.startsWith('/profile/')) {
      window.history.pushState(null, '', '/');
    }
    if (moodFilter) setActiveMoodFilter(moodFilter);
    if (themeFilter) setActiveThemeFilter(themeFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200 selection:bg-[#8B2F4A]/20">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCreateModal={() => {
          if (!isAuthenticated) {
            handleOpenAuthPrompt('save');
          } else {
            setEditingLyric(null);
            setIsCreateModalOpen(true);
          }
        }}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenLogin={() => setCurrentTab('login')}
        onOpenSignup={() => setCurrentTab('signup')}
        onOpenAuthPrompt={handleOpenAuthPrompt}
      />

      {/* Main View Router */}
      <main className="min-h-[calc(100vh-4rem)]">
        {currentTab === 'login' && (
          <LoginView
            onSwitchToSignup={() => setCurrentTab('signup')}
            onSuccess={() => setCurrentTab('home')}
            showToast={showToast}
          />
        )}

        {currentTab === 'signup' && (
          <SignupView
            onSwitchToLogin={() => setCurrentTab('login')}
            onSuccess={() => setCurrentTab('home')}
            showToast={showToast}
          />
        )}

        {currentTab === 'home' && (
          <HomeView
            lyrics={lyrics}
            collections={collections}
            onSelectLyric={(lyric) => setSelectedLyric(lyric)}
            onSelectCreator={handleSelectCreator}
            onSelectCollection={() => setCurrentTab('collections')}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenAddToCollection={handleOpenAddToCollection}
            onOpenReadingMode={handleOpenReadingMode}
            onLyricCreated={handleLyricSavedOrUpdated}
            onNavigateTab={handleNavigateTab}
            showToast={showToast}
          />
        )}

        {currentTab === 'discover' && (
          <DiscoverView
            lyrics={lyrics}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            initialMoodFilter={activeMoodFilter}
            initialThemeFilter={activeThemeFilter}
            onSelectLyric={(lyric) => setSelectedLyric(lyric)}
            onSelectCreator={handleSelectCreator}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenAddToCollection={handleOpenAddToCollection}
            onOpenReadingMode={handleOpenReadingMode}
            onOpenCreateModal={() => {
              if (!isAuthenticated) {
                handleOpenAuthPrompt('save');
              } else {
                setEditingLyric(null);
                setIsCreateModalOpen(true);
              }
            }}
          />
        )}

        {currentTab === 'library' && (
          <LibraryView
            lyrics={lyrics}
            onSelectLyric={(lyric) => setSelectedLyric(lyric)}
            onSelectCreator={handleSelectCreator}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenAddToCollection={handleOpenAddToCollection}
            onOpenReadingMode={handleOpenReadingMode}
            onEditLyric={handleOpenEditLyric}
            onDeleteLyric={handleOpenDeleteLyric}
            onOpenCreateModal={() => {
              if (!isAuthenticated) {
                handleOpenAuthPrompt('save');
              } else {
                setEditingLyric(null);
                setIsCreateModalOpen(true);
              }
            }}
            onOpenLogin={() => setCurrentTab('login')}
          />
        )}

        {currentTab === 'collections' && (
          <CollectionsView
            collections={collections}
            lyrics={lyrics}
            onSelectLyric={(lyric) => setSelectedLyric(lyric)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenAddToCollection={handleOpenAddToCollection}
            onOpenReadingMode={handleOpenReadingMode}
            onCreateCollectionSubmit={handleCreateCollectionSubmit}
            onUpdateCollectionSubmit={handleUpdateCollectionSubmit}
            onDeleteCollectionSubmit={handleDeleteCollectionSubmit}
            onNavigateTab={handleNavigateTab}
            showToast={showToast}
            onOpenAuthPrompt={handleOpenAuthPrompt}
            onRefreshCollections={refreshCollections}
          />
        )}

        {(currentTab === 'profile' || currentTab === 'create') && (
          <ProfileView
            lyrics={lyrics}
            onSelectLyric={(lyric) => setSelectedLyric(lyric)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenReadingMode={handleOpenReadingMode}
            onOpenCreateModal={() => {
              if (!isAuthenticated) {
                handleOpenAuthPrompt('save');
              } else {
                setEditingLyric(null);
                setIsCreateModalOpen(true);
              }
            }}
            onOpenLogin={() => setCurrentTab('login')}
            showToast={showToast}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        )}

        {currentTab === 'public_profile' && viewingUsername && (
          <PublicProfileView
            username={viewingUsername}
            onSelectLyric={(lyric) => setSelectedLyric(lyric)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenAddToCollection={handleOpenAddToCollection}
            onOpenReadingMode={handleOpenReadingMode}
            onNavigateDiscover={() => handleNavigateTab('discover')}
            showToast={showToast}
          />
        )}

        {currentTab === 'public_lyric' && viewingLyricId && (
          <PublicLyricView
            lyricId={viewingLyricId}
            onSelectCreator={handleSelectCreator}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onOpenAddToCollection={handleOpenAddToCollection}
            onOpenReadingMode={handleOpenReadingMode}
            onNavigateDiscover={() => handleNavigateTab('discover')}
            onOpenAuthPrompt={handleOpenAuthPrompt}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-10 px-4 text-center text-xs text-[var(--text-secondary)]">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-editorial text-xl font-bold text-[var(--text-primary)]">LyricVault</span>
            <span className="text-[10px] opacity-75">— Save the words that stay with you.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={() => setCurrentTab('home')} className="hover:text-[var(--text-primary)]">
              Discover
            </button>
            <button onClick={() => setCurrentTab('library')} className="hover:text-[var(--text-primary)]">
              Library
            </button>
            <button onClick={() => setCurrentTab('collections')} className="hover:text-[var(--text-primary)]">
              Collections
            </button>
            <button
              onClick={() => {
                if (!isAuthenticated) handleOpenAuthPrompt('save');
                else setIsCreateModalOpen(true);
              }}
              className="hover:text-[var(--text-primary)]"
            >
              Save Lyric
            </button>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation for Mobile */}
      <MobileNavbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCreateModal={() => {
          if (!isAuthenticated) {
            handleOpenAuthPrompt('save');
          } else {
            setEditingLyric(null);
            setIsCreateModalOpen(true);
          }
        }}
        onOpenLogin={() => setCurrentTab('login')}
        onOpenAuthPrompt={handleOpenAuthPrompt}
      />

      {/* Lyric Detail Modal */}
      <LyricDetailModal
        lyric={selectedLyric}
        onClose={() => setSelectedLyric(null)}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onSelectCreator={handleSelectCreator}
        onOpenAddToCollection={handleOpenAddToCollection}
        onOpenReadingMode={handleOpenReadingMode}
        onEditLyric={
          selectedLyric &&
          isAuthenticated &&
          (selectedLyric.created_by.userId === user?.id ||
            selectedLyric.created_by.handle === (profile?.username ? `@${profile.username}` : undefined))
            ? handleOpenEditLyric
            : undefined
        }
        onDeleteLyric={
          selectedLyric &&
          isAuthenticated &&
          (selectedLyric.created_by.userId === user?.id ||
            selectedLyric.created_by.handle === (profile?.username ? `@${profile.username}` : undefined))
            ? handleOpenDeleteLyric
            : undefined
        }
        showToast={showToast}
      />

      {/* Full-Screen Distraction-Free Reading Mode Portal */}
      <LyricReader
        lyric={readingLyric}
        isOpen={Boolean(readingLyric)}
        onClose={() => setReadingLyric(null)}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onOpenAddToCollection={handleOpenAddToCollection}
        currentUserId={user?.id}
        showToast={showToast}
      />

      {/* Add To Collection Modal */}
      <AddToCollectionModal
        isOpen={isAddToCollectionOpen}
        lyric={addToCollectionLyric}
        onClose={() => {
          setIsAddToCollectionOpen(false);
          setAddToCollectionLyric(null);
        }}
        onOpenCreateCollection={() => {
          setIsAddToCollectionOpen(false);
          setIsCreateCollectionOpenFromAdd(true);
        }}
        onCollectionsUpdated={refreshCollections}
      />

      {/* Create Collection Modal triggered from AddToCollectionModal */}
      <CreateCollectionModal
        isOpen={isCreateCollectionOpenFromAdd}
        onClose={() => setIsCreateCollectionOpenFromAdd(false)}
        onSubmit={async (data) => {
          await handleCreateCollectionSubmit(data);
          // Re-open AddToCollectionModal with current lyric
          if (addToCollectionLyric) {
            setIsAddToCollectionOpen(true);
          }
        }}
      />

      {/* Full Create / Edit Lyric Modal */}
      <CreateLyricModal
        isOpen={isCreateModalOpen}
        editingLyric={editingLyric}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingLyric(null);
        }}
        onSaveLyric={handleLyricSavedOrUpdated}
        showToast={showToast}
      />

      {/* Delete Lyric Confirmation Modal */}
      <DeleteLyricModal
        isOpen={Boolean(deletingLyric)}
        lyric={deletingLyric}
        onClose={() => setDeletingLyric(null)}
        onDeleted={handleLyricDeleted}
        showToast={showToast}
      />

      {/* Unauthenticated Action Prompt Modal */}
      <AuthPromptModal
        isOpen={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        onSelectLogin={() => {
          setAuthPromptOpen(false);
          setCurrentTab('login');
        }}
        onSelectSignup={() => {
          setAuthPromptOpen(false);
          setCurrentTab('signup');
        }}
        onNavigateLogin={() => {
          setAuthPromptOpen(false);
          setCurrentTab('login');
        }}
        onNavigateSignup={() => {
          setAuthPromptOpen(false);
          setCurrentTab('signup');
        }}
        actionContext={authPromptContext}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
