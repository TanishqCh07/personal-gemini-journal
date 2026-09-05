import React from 'react';
import { 
  Sparkles, 
  LogOut, 
  ShieldCheck, 
  PlusCircle, 
  SlidersHorizontal,
  User as UserIcon,
  Database,
  Sun,
  Moon,
  LayoutDashboard,
  BookOpen,
  Clock,
  TrendingUp,
  Settings
} from 'lucide-react';
import { User } from 'firebase/auth';

export type NavigationTab = 'dashboard' | 'journal' | 'history' | 'insights' | 'settings';

interface NavbarProps {
  user: User;
  activeNavTab: NavigationTab;
  onSelectNavTab: (tab: NavigationTab) => void;
  onSignOut: () => void;
  onNewReflection: () => void;
  onOpenSystemModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeNavTab,
  onSelectNavTab,
  onSignOut,
  onNewReflection,
  onOpenSystemModal,
  theme,
  onToggleTheme,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'journal', label: 'Journal', icon: BookOpen },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Brand & DB badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-100 dark:shadow-none">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm tracking-tight">Gemini Journal</span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Isolated Vault</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden xl:block">
                Gemini 3.6 Flash &bull; Cloud Firestore
              </p>
            </div>
          </div>

          {/* Center: Persistent Navigation Bar (Desktop lg+) */}
          <nav 
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-full border border-slate-200 dark:border-slate-700/80 shadow-2xs"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  type="button"
                  onClick={() => onSelectNavTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Actions & User Info */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Dark / Light Mode Toggle Button */}
            <button
              id="theme-toggle-btn"
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

            <button
              id="system-specs-btn"
              onClick={onOpenSystemModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition"
              title="System & Security Architecture"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Security & Specs</span>
            </button>

            <button
              id="new-reflection-header-btn"
              type="button"
              onClick={() => {
                onSelectNavTab('journal');
                onNewReflection();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            {/* User profile capsule */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              
              <div className="hidden xl:block text-left">
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-tight">
                  {user.displayName || 'Journalist'}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                  {user.email || 'Authenticated'}
                </div>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet (< lg) Persistent Navigation Bar */}
        <div className="lg:hidden flex items-center justify-center pb-3 pt-1 overflow-x-auto scrollbar-none">
          <nav 
            aria-label="Mobile Navigation"
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-full border border-slate-200 dark:border-slate-700/80 shadow-2xs"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-nav-tab-${item.id}`}
                  type="button"
                  onClick={() => onSelectNavTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

