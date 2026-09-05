import React, { useState, useEffect } from 'react';
import { BookOpen, PlusCircle } from 'lucide-react';
import { onAuthStateChanged, fbSignOut, auth, User } from './lib/firebase';
import { 
  subscribeToUserInteractions, 
  deleteInteractionFromFirestore, 
  syncUserProfile 
} from './lib/firestoreService';
import { Interaction } from './types';
import { LandingPage } from './components/LandingPage';
import { Navbar, NavigationTab } from './components/Navbar';
import { JournalEditor } from './components/JournalEditor';
import { InteractionView } from './components/InteractionView';
import { HistorySidebar } from './components/HistorySidebar';
import { HistoryView } from './components/HistoryView';
import { DashboardView } from './components/DashboardView';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';
import { SystemModal } from './components/SystemModal';
import { Theme, getInitialTheme, setStoredTheme, applyTheme } from './lib/theme';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [navTab, setNavTab] = useState<NavigationTab>('journal');
  const [resetSignal, setResetSignal] = useState(0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Sync theme with DOM and listen for system theme changes if no preference is saved
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      setStoredTheme(nextTheme);
      return nextTheme;
    });
  };

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        try {
          await syncUserProfile(currentUser);
        } catch (err) {
          console.warn('Could not sync user profile to Firestore:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time subscription to isolated user interactions
  useEffect(() => {
    if (!user) {
      setInteractions([]);
      setSelectedInteraction(null);
      return;
    }

    setDbError(null);
    const unsubscribe = subscribeToUserInteractions(
      user.uid,
      (items) => {
        setInteractions(items);
        // If an interaction is currently selected, refresh its reference
        if (selectedInteraction) {
          const fresh = items.find((i) => i.id === selectedInteraction.id);
          if (fresh) {
            setSelectedInteraction(fresh);
          }
        }
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setDbError('Unable to load reflection history. Check network or security rules.');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handler for Sandbox Demo login
  const handleDemoLogin = (demoUser: User) => {
    setUser(demoUser);
    setAuthLoading(false);
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setUser(null);
    setSelectedInteraction(null);
  };

  // Unified handler to reliably open the journal composer every time
  const handleOpenNewReflection = () => {
    setSelectedInteraction(null);
    setNavTab('journal');
    setActiveTab('compose');
    setResetSignal((prev) => prev + 1);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const editorEl = document.getElementById('journal-editor-container');
      if (editorEl) {
        editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const titleInput = document.getElementById('journal-title-input');
      const contentInput = document.getElementById('journal-content-input');
      if (titleInput) {
        titleInput.focus();
      } else if (contentInput) {
        contentInput.focus();
      }
    }, 60);
  };

  // Open entry detail in History tab
  const handleOpenEntryInHistory = (entry: Interaction) => {
    setSelectedInteraction(entry);
    setNavTab('history');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Select interaction handler
  const handleSelectInteraction = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setActiveTab('compose');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler for updated interaction (optimistically updates both selected interaction and the interactions vault list)
  const handleInteractionUpdated = (updated: Interaction) => {
    setSelectedInteraction(updated);
    setInteractions((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  // Delete interaction handler
  const handleDeleteInteraction = async (interactionId: string) => {
    if (!user) return;
    try {
      // Immediately remove from state to update the Vault History list and entry count instantly
      setInteractions((prev) => prev.filter((item) => item.id !== interactionId));
      if (selectedInteraction?.id === interactionId) {
        setSelectedInteraction(null);
      }
      // Delete document from Firestore under the signed-in user's own path: /users/{userId}/interactions/{interactionId}
      await deleteInteractionFromFirestore(user.uid, interactionId);
    } catch (err) {
      console.error('Failed to delete interaction:', err);
      alert('Failed to delete entry. Please try again.');
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Initializing Secure Session...
          </span>
        </div>
      </div>
    );
  }

  // Not signed in: show Landing Page
  if (!user) {
    return (
      <LandingPage 
        onDemoLogin={handleDemoLogin} 
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // Signed in: Private Dashboard
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-100 dark:selection:bg-indigo-900">
      {/* Navbar with persistent navigation tabs */}
      <Navbar
        user={user}
        activeNavTab={navTab}
        onSelectNavTab={(tab) => {
          setNavTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSignOut={handleSignOut}
        onNewReflection={handleOpenNewReflection}
        onOpenSystemModal={() => setSystemModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Database connection banner if any issue */}
      {dbError && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-200">
          {dbError}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* 1. Dashboard View */}
        {navTab === 'dashboard' && (
          <DashboardView
            user={user}
            interactions={interactions}
            onOpenNewReflection={handleOpenNewReflection}
            onSelectEntry={handleOpenEntryInHistory}
          />
        )}

        {/* 2. Journal View (Composer + Compact Reflection Vault Sidebar) */}
        {navTab === 'journal' && (
          <>
            {/* Compact View Switcher for Mobile / Iframes (< lg) */}
            <div className="lg:hidden flex items-center p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-xl mb-4 max-w-sm mx-auto">
              <button
                id="tab-compose-btn"
                type="button"
                onClick={() => {
                  setActiveTab('compose');
                  if (!selectedInteraction) {
                    handleOpenNewReflection();
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'compose'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{selectedInteraction ? 'Viewing Entry' : 'Compose'}</span>
              </button>
              <button
                id="tab-history-btn"
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Vault History</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {interactions.length}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Editor or Active Interaction View (8 cols on lg) */}
              <div className={`lg:col-span-8 ${activeTab === 'compose' ? 'block' : 'hidden lg:block'}`}>
                {selectedInteraction ? (
                  <InteractionView
                    userId={user.uid}
                    interaction={selectedInteraction}
                    vaultInteractions={interactions}
                    onBack={handleOpenNewReflection}
                    onInteractionUpdated={handleInteractionUpdated}
                    onDelete={handleDeleteInteraction}
                  />
                ) : (
                  <JournalEditor
                    userId={user.uid}
                    resetSignal={resetSignal}
                    vaultInteractions={interactions}
                    onEntrySaved={(newInteraction) => {
                      setSelectedInteraction(newInteraction);
                      setActiveTab('compose');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}
              </div>

              {/* Right Column: Past Entries History Vault (4 cols on lg) */}
              <div className={`lg:col-span-4 h-full lg:sticky lg:top-24 ${activeTab === 'history' ? 'block' : 'hidden lg:block'}`}>
                <HistorySidebar
                  interactions={interactions}
                  selectedId={selectedInteraction?.id || null}
                  onSelect={handleSelectInteraction}
                  onDelete={handleDeleteInteraction}
                  onNewReflection={handleOpenNewReflection}
                />
              </div>
            </div>
          </>
        )}

        {/* 3. History View (Full-Width Responsive Grid) */}
        {navTab === 'history' && (
          <HistoryView
            userId={user.uid}
            interactions={interactions}
            selectedInteraction={selectedInteraction}
            onSelectInteraction={(target) => setSelectedInteraction(target)}
            onDelete={handleDeleteInteraction}
            onNewReflection={handleOpenNewReflection}
            onInteractionUpdated={handleInteractionUpdated}
          />
        )}

        {/* 4. Insights View */}
        {navTab === 'insights' && (
          <InsightsView interactions={interactions} />
        )}

        {/* 5. Settings View */}
        {navTab === 'settings' && (
          <SettingsView
            user={user}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onSignOut={handleSignOut}
            onOpenSystemModal={() => setSystemModalOpen(true)}
          />
        )}
      </main>

      {/* System & Architecture Specifications Modal */}
      <SystemModal
        isOpen={systemModalOpen}
        onClose={() => setSystemModalOpen(false)}
        userId={user.uid}
      />
    </div>
  );
}
