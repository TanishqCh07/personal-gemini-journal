import React from 'react';
import { 
  Sparkles, 
  LogOut, 
  ShieldCheck, 
  PlusCircle, 
  SlidersHorizontal,
  User as UserIcon,
  Database
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User;
  onSignOut: () => void;
  onNewReflection: () => void;
  onOpenSystemModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewReflection,
  onOpenSystemModal,
}) => {
  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand & DB badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-100">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm tracking-tight">Gemini Journal</span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>Isolated Vault</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden md:block">
              Gemini 3.6 Flash &bull; Cloud Firestore
            </p>
          </div>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="system-specs-btn"
            onClick={onOpenSystemModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            title="System & Security Architecture"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Security & Specs</span>
          </button>

          <button
            id="new-reflection-header-btn"
            type="button"
            onClick={onNewReflection}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Entry</span>
          </button>

          {/* User profile capsule */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
            
            <div className="hidden lg:block text-left">
              <div className="text-xs font-medium text-slate-900 leading-tight">
                {user.displayName || 'Journalist'}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {user.email || 'Authenticated'}
              </div>
            </div>

            <button
              id="sign-out-btn"
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
