import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  MapPin, 
  Sparkles, 
  Lightbulb, 
  Heart, 
  ShieldAlert, 
  FileText,
  Calendar
} from 'lucide-react';
import { Interaction, JournalCategory } from '../types';

interface InsightsViewProps {
  interactions: Interaction[];
}

export const InsightsView: React.FC<InsightsViewProps> = ({ interactions }) => {
  const total = interactions.length;

  // 1. Entries by Mode
  const modeStats = useMemo(() => {
    const modes: { id: JournalCategory; label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; barClass: string }[] = [
      { id: 'reflection', label: 'Reflection', icon: Sparkles, colorClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800', barClass: 'bg-indigo-600 dark:bg-indigo-500' },
      { id: 'brainstorm', label: 'Brainstorm', icon: Lightbulb, colorClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800', barClass: 'bg-amber-500 dark:bg-amber-400' },
      { id: 'gratitude', label: 'Gratitude', icon: Heart, colorClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800', barClass: 'bg-rose-500 dark:bg-rose-400' },
      { id: 'challenge', label: 'Challenge', icon: ShieldAlert, colorClass: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800', barClass: 'bg-purple-600 dark:bg-purple-500' },
    ];

    return modes.map((mode) => {
      const count = interactions.filter((item) => item.category === mode.id).length;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        ...mode,
        count,
        percentage,
      };
    });
  }, [interactions, total]);

  // 2. Journaling Activity - Last 14 days
  const activityData = useMemo(() => {
    const days: { date: Date; dateStr: string; dayLabel: string; count: number }[] = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);

      const count = interactions.filter((item) => {
        if (!item.createdAt) return false;
        const itemDate = new Date(item.createdAt);
        return itemDate >= d && itemDate < nextD;
      }).length;

      days.push({
        date: d,
        dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        dayLabel: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        count,
      });
    }

    const maxCount = Math.max(1, ...days.map((d) => d.count));
    const totalLast14Days = days.reduce((acc, cur) => acc + cur.count, 0);

    return {
      days,
      maxCount,
      totalLast14Days,
    };
  }, [interactions]);

  // 3. Tagged Locations
  const locationStats = useMemo(() => {
    const map = new Map<string, { count: number; formattedAddress?: string }>();
    interactions.forEach((item) => {
      if (item.location && item.location.placeName) {
        const name = item.location.placeName.trim();
        const existing = map.get(name);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(name, {
            count: 1,
            formattedAddress: item.location.formattedAddress,
          });
        }
      }
    });

    return Array.from(map.entries())
      .map(([placeName, data]) => ({
        placeName,
        count: data.count,
        formattedAddress: data.formattedAddress,
      }))
      .sort((a, b) => b.count - a.count);
  }, [interactions]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Cognitive Insights & Patterns
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Client-side analytics derived from your vault entries — mode distribution, writing rhythms, and geographic footprint.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {total} Total Reflections
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entries by Mode (5 cols on lg) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Entries by Mode
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Distribution
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {modeStats.map((mode) => {
                const Icon = mode.icon;
                return (
                  <div key={mode.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`p-1 rounded-md border ${mode.colorClass}`}>
                          <Icon className="w-3 h-3" />
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {mode.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {mode.count} {mode.count === 1 ? 'entry' : 'entries'}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold min-w-[34px] text-right">
                          {mode.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200/80 dark:border-slate-700/80 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${mode.barClass}`}
                        style={{ width: `${Math.max(mode.percentage, mode.count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            Categorize your reflections to balance analytical thinking, gratitude, problem solving, and open brainstorming.
          </p>
        </div>

        {/* Journaling Activity (7 cols on lg) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Journaling Activity (Last 14 Days)
                </h2>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {activityData.totalLast14Days} reflections
              </span>
            </div>

            {/* Custom Div-based Bar Chart */}
            <div className="mt-6">
              <div className="h-44 flex items-end justify-between gap-1 sm:gap-2 px-1 pb-2 border-b border-slate-200 dark:border-slate-800">
                {activityData.days.map((day, idx) => {
                  const barHeightPercent = day.count > 0 
                    ? Math.round((day.count / activityData.maxCount) * 100) 
                    : 4;

                  return (
                    <div 
                      key={idx} 
                      className="flex-1 flex flex-col items-center justify-end h-full group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-9 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-semibold py-1 px-2 rounded shadow-md whitespace-nowrap z-10">
                        {day.dateStr}: {day.count} {day.count === 1 ? 'entry' : 'entries'}
                      </div>

                      {/* Bar */}
                      <div 
                        className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                          day.count > 0
                            ? 'bg-indigo-600 dark:bg-indigo-500 group-hover:bg-indigo-700 dark:group-hover:bg-indigo-400 shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
                        }`}
                        style={{ height: `${barHeightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Day Labels below bars */}
              <div className="flex items-center justify-between gap-1 sm:gap-2 px-1 pt-2">
                {activityData.days.map((day, idx) => (
                  <div key={idx} className="flex-1 text-center">
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block truncate" title={day.dateStr}>
                      {day.dayLabel}
                    </span>
                    <span className="text-[9px] text-slate-300 dark:text-slate-600 block hidden sm:block truncate">
                      {day.dateStr.split(' ')[1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>Peak Day: {activityData.maxCount > 0 ? `${activityData.maxCount} entries` : '0 entries'}</span>
            <span>Daily cadence strengthens cognitive recall</span>
          </div>
        </div>
      </div>

      {/* Tagged Locations Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tagged Locations
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {locationStats.length} {locationStats.length === 1 ? 'place' : 'places'} mapped
          </span>
        </div>

        {locationStats.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              No Tagged Locations Yet
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Add a location tag in the Journal composer to map your reflective footprint across places, cafes, libraries, and retreats.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {locationStats.map((loc, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex items-start justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {loc.placeName}
                    </h4>
                    {loc.formattedAddress && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {loc.formattedAddress}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                  {loc.count} {loc.count === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
