import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Database, 
  BrainCircuit, 
  MessageSquare, 
  FileText,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { syncUserProfile } from '../lib/firestoreService';
import { User } from 'firebase/auth';

interface LandingPageProps {
  onDemoLogin?: (demoUser: User) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onDemoLogin, theme = 'light', onToggleTheme }) => {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncUserProfile(result.user);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let msg = err?.message || 'Authentication failed. Please try again.';
      if (err?.code === 'auth/popup-blocked') {
        msg = 'The sign-in popup was blocked by your browser. Please allow popups or use the sandbox test login.';
      } else if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in was cancelled before completion.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        msg = 'Another sign-in window is already open.';
      }
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxDemoSignIn = () => {
    if (onDemoLogin) {
      const demoUser = {
        uid: 'demo-explorer-' + Math.random().toString(36).substring(2, 9),
        email: 'explorer@example.com',
        displayName: 'Guest Explorer',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      } as unknown as User;
      onDemoLogin(demoUser);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-100 dark:selection:bg-indigo-900 transition-colors duration-200">
      {/* Top Bar */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 dark:shadow-none">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-slate-100">Gemini Journal</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-800">
                Firestore Isolated
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onToggleTheme && (
              <button
                id="landing-theme-toggle-btn"
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600 transition-transform duration-200 hover:-rotate-12" />
                )}
              </button>
            )}

            <button
              id="header-sign-in-button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center">
        {/* Security badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Strict Owner Isolation: <code>/users/&#123;uid&#125;/interactions</code></span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 max-w-2xl leading-[1.15]">
          A Private Reflection Journal Powered by <span className="text-indigo-600 dark:text-indigo-400">Gemini</span> & <span className="text-violet-600 dark:text-violet-400">Firestore</span>
        </h1>

        <p className="mt-5 text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl leading-relaxed">
          Write multi-turn journal reflections, brainstorm bold ideas, and receive structured takeaways.
          Every thought is strictly sealed to your authenticated account in Cloud Firestore.
        </p>

        {/* Auth Box */}
        <div className="mt-8 w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none flex flex-col gap-4">
          <div className="text-left mb-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Authenticate to Access Private Vault</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zero password storage. Federated identity powered by Firebase.</p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Authentication Notice:</span> {authError}
              </div>
            </div>
          )}

          <button
            id="google-sign-in-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition transform active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Sign In with Google'}</span>
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 dark:text-slate-500 font-medium">Or for testing</span>
            </div>
          </div>

          <button
            id="sandbox-test-login-btn"
            onClick={handleSandboxDemoSignIn}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Enter as Guest Explorer (Sandbox Preview)</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span>End-to-end user isolation with Firestore Rules</span>
          </div>
        </div>

        {/* Features Triad */}
        <div className="mt-14 w-full grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gemini 3.6 Flash Engine</h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Provides multi-angle reflections, constructive challenges, and automated key takeaway synthesis with resilient fallback.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Isolated Cloud Firestore</h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              All interactions stored under <code>/users/&#123;uid&#125;/interactions</code>. Only your authenticated credentials can read or write.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Multi-Turn Dialogue</h3>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Converse back-and-forth on any reflection. Ask follow-up questions, brainstorm next steps, and build deep self-clarity.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span>Gemini Reflection Journal</span>
            <span>&bull;</span>
            <span>Google Cloud Run & Cloud Firestore</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Zero-Hardcoding Standards</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
