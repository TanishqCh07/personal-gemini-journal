import React, { useMemo } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Calendar, 
  Clock, 
  Award, 
  PlusCircle, 
  ArrowRight,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Interaction } from '../types';

interface DashboardViewProps {
  user: User;
  interactions: Interaction[];
  onOpenNewReflection: () => void;
  onSelectEntry: (interaction: Interaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  interactions,
  onOpenNewReflection,
  onSelectEntry,
}) => {
  // Compute stats client-side from existing interactions
  const stats = useMemo(() => {
    const total = interactions.length;
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let thisWeek = 0;
    let thisMonth = 0;
    const modeCounts: Record<string, number> = {
      reflection: 0,
      brainstorm: 0,
      gratitude: 0,
      challenge: 0,
    };

    interactions.forEach((item) => {
      const time = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      if (time >= sevenDaysAgo) thisWeek++;
      if (time >= thirtyDaysAgo) thisMonth++;

      if (item.category && modeCounts[item.category] !== undefined) {
        modeCounts[item.category]++;
      }
    });

    // Find most used mode
    let mostUsedMode = 'None';
    let maxModeCount = 0;
    Object.entries(modeCounts).forEach(([mode, count]) => {
      if (count > maxModeCount) {
        maxModeCount = count;
        mostUsedMode = mode.charAt(0).toUpperCase() + mode.slice(1);
      }
    });

    if (total === 0) {
      mostUsedMode = 'None';
    }

    return {
      total,
      thisWeek,
      thisMonth,
      mostUsedMode,
      maxModeCount,
    };
  }, [interactions]);

  const recentEntries = useMemo(() => {
    return interactions.slice(0, 3);
  }, [interactions]);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
              Personal Reflection Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Welcome back, {user.displayName || 'Journalist'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Your private, owner-isolated cognitive sanctuary powered by Gemini 3.6 Flash. Ground your reflections, discover recurring patterns, and gain deep personal insight.
          </p>
        </div>

        <button
          id="dashboard-compose-btn"
          type="button"
          onClick={onOpenNewReflection}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition transform active:scale-95 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Compose New Reflection</span>
        </button>
      </div>

      {/* Four Stat Cards in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Entries */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Entries
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              All-time saved reflections
            </p>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              This Week
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.thisWeek}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Created in the last 7 days
            </p>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              This Month
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
              {stats.thisMonth}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Created in the last 30 days
            </p>
          </div>
        </div>

        {/* Most Used Mode */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Most Used Mode
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {stats.mostUsedMode}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {stats.maxModeCount > 0 ? `${stats.maxModeCount} reflections logged` : 'Start journaling to track'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Entries Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recent Reflections
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jump back into your recent entries or dialogue sessions.
            </p>
          </div>
        </div>

        {recentEntries.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              No reflections logged yet.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 mb-3">
              Write your first thought to see your cognitive patterns and history here.
            </p>
            <button
              type="button"
              onClick={onOpenNewReflection}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Compose First Reflection</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((item) => {
              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectEntry(item)}
                  className="group p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        {item.category}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </span>
                      {item.citations && item.citations.length > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Grounded ({item.citations.length})</span>
                        </span>
                      )}
                      {item.location && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                          <span>{item.location.placeName}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                      {item.title || 'Untitled Reflection'}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.summary || item.entry}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 shrink-0 sm:self-center">
                    <span>Open in History</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
