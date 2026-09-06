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
  PlusCircle,
  MapPin,
  Star
} from 'lucide-react';
import { Interaction } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { HistoryCard } from './HistoryCard';

interface HistorySidebarProps {
  interactions: Interaction[];
  selectedId: string | null;
  onSelect: (interaction: Interaction) => void;
  onDelete: (interactionId: string) => void | Promise<void>;
  onToggleStar: (interaction: Interaction) => void | Promise<void>;
  onReorder: (draggedId: string, targetId: string) => void | Promise<void>;
  onNewReflection?: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  selectedId,
  onSelect,
  onDelete,
  onToggleStar,
  onReorder,
  onNewReflection,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [entryToDelete, setEntryToDelete] = useState<Interaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag-and-drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Drag-to-reorder is only active when unfiltered (category === 'all' and search is empty)
  const isDragEnabled = filterCategory === 'all' && searchTerm.trim() === '';

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

  // Separate into Starred and Unstarred blocks (starred always floats on top)
  const starredList = filteredInteractions.filter((item) => Boolean(item.starred));
  const unstarredList = filteredInteractions.filter((item) => !item.starred);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: Interaction) => {
    setDraggedId(item.id);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, item: Interaction) => {
    if (!isDragEnabled || !draggedId || draggedId === item.id) return;
    setDragOverId(item.id);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, item: Interaction) => {
    if (dragOverId === item.id) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItem: Interaction) => {
    if (!isDragEnabled || !draggedId || draggedId === targetItem.id) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    onReorder(draggedId, targetItem.id);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col h-full transition-colors duration-200">
      <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Reflection Vault</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
            {interactions.length} {interactions.length === 1 ? 'entry' : 'entries'}
          </span>
          {onNewReflection && (
            <button
              id="sidebar-new-entry-btn"
              type="button"
              onClick={onNewReflection}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
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
        <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="history-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search entries or insights..."
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border-indigo-200 dark:border-indigo-800'
                : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
        {filteredInteractions.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center">
            <FolderOpen className="w-7 h-7 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {interactions.length === 0 ? 'No reflections yet' : 'No matching entries found'}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
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
          <>
            {/* Starred Group (always floats on top) */}
            {starredList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                    <span>Starred ({starredList.length})</span>
                  </div>
                  {isDragEnabled && starredList.length > 1 && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      drag to reorder
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {starredList.map((item) => (
                    <HistoryCard
                      key={item.id}
                      item={item}
                      isSelected={item.id === selectedId}
                      onSelect={onSelect}
                      onDeleteRequest={(target) => setEntryToDelete(target)}
                      onToggleStar={onToggleStar}
                      isDragEnabled={isDragEnabled}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedId === item.id}
                      isDragOver={dragOverId === item.id && draggedId !== item.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unstarred Group */}
            {unstarredList.length > 0 && (
              <div className="space-y-1.5">
                {starredList.length > 0 && (
                  <div className="flex items-center justify-between px-1 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                    <span>Recent Reflections ({unstarredList.length})</span>
                    {isDragEnabled && unstarredList.length > 1 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        drag to reorder
                      </span>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  {unstarredList.map((item) => (
                    <HistoryCard
                      key={item.id}
                      item={item}
                      isSelected={item.id === selectedId}
                      onSelect={onSelect}
                      onDeleteRequest={(target) => setEntryToDelete(target)}
                      onToggleStar={onToggleStar}
                      isDragEnabled={isDragEnabled}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      isDragging={draggedId === item.id}
                      isDragOver={dragOverId === item.id && draggedId !== item.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={Boolean(entryToDelete)}
        itemTitle={entryToDelete?.title}
        onConfirm={async () => {
          if (entryToDelete) {
            setIsDeleting(true);
            try {
              await onDelete(entryToDelete.id);
            } finally {
              setIsDeleting(false);
              setEntryToDelete(null);
            }
          }
        }}
        onClose={() => {
          if (!isDeleting) setEntryToDelete(null);
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
};
