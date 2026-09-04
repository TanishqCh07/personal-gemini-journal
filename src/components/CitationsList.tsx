import React, { useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, Sparkles, Calendar, Tag } from 'lucide-react';
import { RecallCitation } from '../types';

interface CitationsListProps {
  citations: RecallCitation[];
  title?: string;
  className?: string;
  compact?: boolean;
}

export const CitationsList: React.FC<CitationsListProps> = ({
  citations,
  title = 'Grounded in Past Reflections',
  className = '',
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div
      id="semantic-citations-container"
      className={`rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs transition-all ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-indigo-950 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>{title}</span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
            {citations.length} {citations.length === 1 ? 'source' : 'sources'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 cursor-pointer"
        >
          <span>{expanded ? 'Hide citations' : 'View citations'}</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2.5 pt-2 border-t border-indigo-100/70">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Gemini semantically retrieved and grounded this insight in the following entries from your private vault:
          </p>

          <div className="grid grid-cols-1 gap-2">
            {citations.map((citation, index) => {
              const isSelected = selectedCitationId === citation.id;
              return (
                <div
                  key={`${citation.id}-${index}`}
                  className={`rounded-lg border p-2.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-white border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-white/80 border-indigo-100 hover:bg-white hover:border-indigo-200'
                  }`}
                  onClick={() => setSelectedCitationId(isSelected ? null : citation.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Bookmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-800 truncate text-xs">
                        {citation.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400">
                      {citation.category && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 capitalize">
                          <Tag className="w-2.5 h-2.5" />
                          {citation.category}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 text-slate-500">
                        <Calendar className="w-2.5 h-2.5" />
                        {citation.date}
                      </span>
                    </div>
                  </div>

                  {citation.relevanceReason && (
                    <div className="mt-1 text-[11px] text-indigo-700/90 italic">
                      Why relevant: &ldquo;{citation.relevanceReason}&rdquo;
                    </div>
                  )}

                  {citation.excerpt && (
                    <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded border border-slate-100/80 font-mono text-[10.5px] leading-relaxed">
                      &ldquo;{citation.excerpt}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
