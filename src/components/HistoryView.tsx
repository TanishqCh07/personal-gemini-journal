import React, { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  FolderOpen, 
  PlusCircle, 
  ArrowLeft 
} from 'lucide-react';
import { Interaction } from '../types';
import { HistoryCard } from './HistoryCard';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { InteractionView } from './InteractionView';

interface HistoryViewProps {
  userId: string;
  interactions: Interaction[];
  selectedInteraction: Interaction | null;
  onSelectInteraction: (interaction: Interaction | null) => void;
  onDelete: (interactionId: string) => void | Promise<void>;
  onNewReflection: () => void;
  onInteractionUpdated: (updated: Interaction) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  userId,
  interactions,
  selectedInteraction,
  onSelectInteraction,
  onDelete,
  onNewReflection,
  onInteractionUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [entryToDelete, setEntryToDelete] = useState<Interaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // If an entry is selected, render the full-screen InteractionView with back to grid
  if (selectedInteraction) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => onSelectInteraction(null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Vault Grid</span>
        </button>

        <InteractionView
          userId={userId}
          interaction={selectedInteraction}
          vaultInteractions={interactions}
          onBack={() => onSelectInteraction(null)}
          onInteractionUpdated={onInteractionUpdated}
          onDelete={async (id) => {
            await onDelete(id);
            onSelectInteraction(null);
          }}
        />
      </div>
    );
  }

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

  const handleDeleteConfirmed = async () => {
    if (!entryToDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(entryToDelete.id);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Failed to delete entry from history view:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Reflection Vault Archive
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                {interactions.length} {interactions.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Full-width responsive grid view of your personal reflection vault. Click any entry to inspect or continue dialogue.
            </p>
          </div>
        </div>

        <button
          id="history-full-new-btn"
          type="button"
          onClick={onNewReflection}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition transform active:scale-95 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Reflection</span>
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="history-full-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search entries by title, thoughts, or AI summary insights..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {['all', 'reflection', 'brainstorm', 'gratitude', 'challenge', 'summary'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition border font-medium ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredInteractions.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
          <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {interactions.length === 0 ? 'Your Vault is Empty' : 'No matching entries found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            {interactions.length === 0
              ? 'Start recording your perspectives, gratitude, or challenges. Your vault is private and encrypted.'
              : `No entries matched "${searchTerm}". Try a different search term or category filter.`}
          </p>
          <button
            type="button"
            onClick={onNewReflection}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Compose Reflection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInteractions.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              isSelected={selectedInteraction?.id === item.id}
              onSelect={(target) => onSelectInteraction(target)}
              onDeleteRequest={(target) => setEntryToDelete(target)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(entryToDelete)}
        itemTitle={entryToDelete?.title}
        isDeleting={isDeleting}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
};
