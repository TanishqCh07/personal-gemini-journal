import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  Calendar, 
  Sparkles, 
  Filter, 
  ChevronRight,
  BookOpen,
  FolderOpen,
  PlusCircle
} from 'lucide-react';
import { Interaction, JournalCategory } from '../types';

interface HistorySidebarProps {
  interactions: Interaction[];
  selectedId: string | null;
  onSelect: (interaction: Interaction) => void;
  onDelete: (interactionId: string) => void;
  onNewReflection?: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  selectedId,
  onSelect,
  onDelete,
  onNewReflection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredInteractions = interactions.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.entry && item.entry.toLowerCase().includes(term)) ||
      (item.summary && item.summary.toLowerCase().includes(term));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-semibold text-slate-900">Reflection Vault</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {interactions.length} {interactions.length === 1 ? 'entry' : 'entries'}
          </span>
          {onNewReflection && (
            <button
              id="sidebar-new-entry-btn"
              type="button"
              onClick={onNewReflection}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition cursor-pointer"
              title="Compose New Reflection"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="history-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search entries or insights..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
        />
      </div>

      {/* Filter categories */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none text-[11px]">
        {['all', 'reflection', 'brainstorm', 'gratitude', 'challenge', 'summary'].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`px-2.5 py-1 rounded-md capitalize whitespace-nowrap transition border ${
              filterCategory === cat
                ? 'bg-indigo-50 text-indigo-700 font-semibold border-indigo-200'
                : 'text-slate-500 border-transparent hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {filteredInteractions.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center">
            <FolderOpen className="w-7 h-7 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 font-medium">
              {interactions.length === 0 ? 'No reflections yet' : 'No matching entries found'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              {interactions.length === 0
                ? 'Write your first thought to see your history and summaries here.'
                : 'Try adjusting your search keywords or filter category.'}
            </p>
            {interactions.length === 0 && onNewReflection && (
              <button
                id="sidebar-empty-state-new-btn"
                type="button"
                onClick={onNewReflection}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition transform active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Compose First Reflection</span>
              </button>
            )}
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const isSelected = item.id === selectedId;
            const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={item.id}
                onClick={() => onSelect(item)}
                className={`group relative p-3 rounded-xl border text-left cursor-pointer transition ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-200 shadow-xs'
                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50/60 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                    {item.citations && item.citations.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[9px] border border-emerald-100" title="Grounded with citations from past reflections">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        <span>Grounded ({item.citations.length})</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-800 line-clamp-1 pr-6">
                  {item.title || 'Untitled Entry'}
                </div>

                {item.summary && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.summary}
                  </p>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  title="Delete Entry"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${item.title || 'this entry'}" permanently from Firestore?`)) {
                      onDelete(item.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition absolute right-2 top-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
