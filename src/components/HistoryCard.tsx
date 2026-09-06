import React from 'react';
import { Calendar, Sparkles, MapPin, Trash2, Star, GripVertical } from 'lucide-react';
import { Interaction } from '../types';
import { formatEditedDate } from '../lib/firestoreService';

interface HistoryCardProps {
  item: Interaction;
  isSelected?: boolean;
  onSelect: (interaction: Interaction) => void;
  onDeleteRequest: (interaction: Interaction) => void;
  onToggleStar?: (interaction: Interaction) => void;
  isDragEnabled?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, item: Interaction) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>, item: Interaction) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>, item: Interaction) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>, item: Interaction) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({
  item,
  isSelected = false,
  onSelect,
  onDeleteRequest,
  onToggleStar,
  isDragEnabled = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragging = false,
  isDragOver = false,
}) => {
  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Recent';

  return (
    <div
      id={`history-item-${item.id}`}
      onClick={() => onSelect(item)}
      onDragOver={(e) => {
        if (!isDragEnabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver?.(e, item);
      }}
      onDragLeave={(e) => {
        if (!isDragEnabled) return;
        onDragLeave?.(e, item);
      }}
      onDrop={(e) => {
        if (!isDragEnabled) return;
        e.preventDefault();
        onDrop?.(e, item);
      }}
      onDragEnd={(e) => {
        if (!isDragEnabled) return;
        onDragEnd?.(e);
      }}
      className={`group relative p-3.5 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between select-none ${
        isDragEnabled ? 'pl-6 sm:pl-7' : ''
      } ${
        isDragging
          ? 'opacity-40 border-dashed border-indigo-400 dark:border-indigo-500 scale-[0.99] shadow-none'
          : isDragOver
          ? 'ring-2 ring-indigo-500/60 border-indigo-400 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/50'
          : isSelected
          ? 'bg-indigo-50/70 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-700/80 shadow-xs ring-1 ring-indigo-500/20'
          : 'bg-white dark:bg-slate-800/90 border-slate-100 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/70 dark:hover:bg-slate-800 shadow-2xs'
      }`}
    >
      {/* Left-edge Drag Handle (hidden by default, reveals on hover when unfiltered) */}
      {isDragEnabled && (
        <div
          id={`drag-handle-${item.id}`}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onDragStart?.(e, item);
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1 sm:left-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100 dark:hover:bg-slate-700/60 z-10"
          title="Drag to reorder within group"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}

      <div>
        <div className="flex items-start justify-between text-[10px] text-slate-400 dark:text-slate-400 mb-1.5 gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-900/60 dark:border dark:border-indigo-800/60 px-1.5 py-0.5 rounded shrink-0">
              {item.category}
            </span>
            {item.citations && item.citations.length > 0 && (
              <span 
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-medium text-[9px] border border-emerald-100 dark:border-emerald-800 shrink-0" 
                title="Grounded with citations from past reflections"
              >
                <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                <span>Grounded ({item.citations.length})</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-400">
              <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-400 shrink-0" />
              <span>{dateStr}</span>
            </div>

            {item.editedAt && (
              <span
                id={`card-edited-label-${item.id}`}
                className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600/60 shrink-0"
                title={`Originally created: ${new Date(item.createdAt).toLocaleString()}\nLast edited: ${new Date(item.editedAt).toLocaleString()}`}
              >
                <span>Edited</span>
                <span className="ml-1 opacity-80">{formatEditedDate(item.editedAt)}</span>
              </span>
            )}

            {/* Star toggle button: outline by default, filled amber when starred */}
            {onToggleStar && (
              <button
                id={`star-entry-card-${item.id}`}
                type="button"
                title={item.starred ? 'Unstar reflection' : 'Star reflection'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar(item);
                }}
                className={`p-1 rounded-md transition cursor-pointer ${
                  item.starred
                    ? 'text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    : 'text-slate-400 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/30'
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 transition-colors ${
                    item.starred
                      ? 'fill-amber-400 text-amber-500 dark:fill-amber-400 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400'
                  }`}
                />
              </button>
            )}

            {/* Delete button: small trash icon */}
            <button
              id={`delete-entry-card-${item.id}`}
              type="button"
              title="Delete Entry"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRequest(item);
              }}
              className="p-1 text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1 mb-1">
          {item.title || 'Untitled Entry'}
        </div>

        {item.editedAt ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {item.entry || item.content || item.summary}
          </p>
        ) : item.summary ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {item.summary}
          </p>
        ) : item.entry ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {item.entry}
          </p>
        ) : null}
      </div>

      {item.location && (
        <div 
          className="mt-2.5 flex items-center gap-1 text-[10px] text-indigo-700 dark:text-indigo-200 bg-indigo-50/80 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-800/80 px-2 py-0.5 rounded-md w-fit max-w-full"
          title={item.location.formattedAddress || item.location.placeName}
        >
          <MapPin className="w-2.5 h-2.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span className="truncate font-medium">{item.location.placeName}</span>
        </div>
      )}
    </div>
  );
};
