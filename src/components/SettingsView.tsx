import React, { useState } from 'react';
import { 
  User as UserIcon, 
  LogOut, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Lock, 
  Database, 
  Copy, 
  Check, 
  KeyRound, 
  Cpu, 
  ExternalLink 
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SettingsViewProps {
  user: User;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSignOut: () => void;
  onOpenSystemModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  theme,
  onToggleTheme,
  onSignOut,
  onOpenSystemModal,
}) => {
  const [copiedRules, setCopiedRules] = useState(false);

  const rulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Isolated User Profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Isolated Interactions & Reflections
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(rulesSnippet);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Settings Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Preferences & Account Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your session profile, display appearance, and inspect security rules.
        </p>
      </div>

      {/* 1. Account Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Account Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your authenticated identity and personal vault owner ID.
            </p>
          </div>

          <button
            id="settings-sign-out-btn"
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User profile'}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xl border border-indigo-200 dark:border-indigo-800">
                {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {user.displayName || 'Reflective Journalist'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user.email || 'No email associated (anonymous or demo session)'}
            </p>
            <div className="pt-1 flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                User UID:
              </span>
              <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 select-all">
                {user.uid}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Appearance Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Appearance & Interface Theme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customize the contrast mode to suit your reflective environment. Preference is stored locally across sessions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {theme === 'dark' ? 'Dark Theme' : 'Light Theme'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {theme === 'dark'
                  ? 'High-contrast dark surfaces with muted slate tones for night-time journaling.'
                  : 'Crisp, high-contrast light surfaces for daytime reading and clarity.'}
              </p>
            </div>
          </div>

          {/* Labeled Switch Button */}
          <div className="flex items-center gap-2">
            <button
              id="settings-theme-switch-btn"
              type="button"
              onClick={onToggleTheme}
              className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={theme === 'dark'}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              <span
                className={`pointer-events-none flex items-center justify-center h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  theme === 'dark' ? 'translate-x-8' : 'translate-x-0'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
              </span>
            </button>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[70px]">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Security & Data Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Security & Data Isolation
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Zero-leakage personal data boundary and production specifications.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSystemModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
          >
            <span>View Full Architecture Specs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Short Note describing per-user isolated vault */}
        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/80 space-y-2">
          <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-semibold text-xs">
            <Lock className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>Per-User Isolated Firestore Vault</span>
          </div>
          <p className="text-xs text-indigo-950 dark:text-indigo-200/90 leading-relaxed">
            Your reflection vault is architected with complete cryptographic and rule-based isolation. All journal entries and AI interactions are bound to <code className="font-mono bg-indigo-100 dark:bg-indigo-900/80 px-1.5 py-0.5 rounded text-[11px]">/users/{user.uid}/interactions/&#123;id&#125;</code>. Cloud Firestore security rules strictly enforce <code className="font-mono bg-indigo-100 dark:bg-indigo-900/80 px-1.5 py-0.5 rounded text-[11px]">request.auth.uid == userId</code>, ensuring no other user or unauthenticated request can read, query, or modify your personal data.
          </p>
        </div>

        {/* Security Rules Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Enforced Firestore Rules (firestore.rules)</span>
            </div>
            <button
              type="button"
              onClick={handleCopyRules}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
            >
              {copiedRules ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Rules</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed select-all">
            {rulesSnippet}
          </pre>
        </div>

        {/* Architecture Specs Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Gemini 3.6 Flash Fallback Ladder</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Automated resilience chain: Primary (gemini-3.6-flash) &rarr; Fallback (gemini-3.1-flash-lite) &rarr; Dynamic alias (gemini-flash-latest).
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Zero-Leakage Key Security</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              GEMINI_API_KEY is isolated strictly on the server-side via Cloud Secret Manager; no private model keys are exposed to the client.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
