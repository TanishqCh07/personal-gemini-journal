import React, { useState } from 'react';
import { 
  Sparkles, 
  Lightbulb, 
  BookOpen, 
  Target, 
  Heart, 
  Zap, 
  RotateCcw, 
  AlertTriangle,
  Compass,
  ArrowRight,
  Search
} from 'lucide-react';
import { JournalCategory, Interaction, RecallCitation } from '../types';
import { generateReflectionApi, recallFromVaultApi } from '../lib/geminiApi';
import { saveInteractionToFirestore } from '../lib/firestoreService';

interface JournalEditorProps {
  userId: string;
  onEntrySaved: (interaction: Interaction) => void;
  resetSignal?: number;
  vaultInteractions?: Interaction[];
}

const CATEGORIES: { id: JournalCategory; label: string; icon: any; color: string }[] = [
  { id: 'reflection', label: 'Deep Reflection', icon: Compass, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 'brainstorm', label: 'Brainstorm Ideas', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'gratitude', label: 'Gratitude & Wins', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 'challenge', label: 'Hurdle / Problem', icon: Target, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 'summary', label: 'Day / Week Summary', icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'general', label: 'Open Stream', icon: Zap, color: 'text-slate-600 bg-slate-100 border-slate-200' },
];

const THOUGHT_STARTERS = [
  'What decision or turning point am I navigating right now, and what are the hidden assumptions?',
  'What friction or unexpected hurdle arose today, and what could be the lesson or alternative path?',
  'What project or idea am I excited about, and how can I break it into high-impact next steps?',
  'What moments of gratitude, presence, or clarity felt meaningful over the past 48 hours?',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({ 
  userId, 
  onEntrySaved, 
  resetSignal,
  vaultInteractions 
}) => {
  const [title, setTitle] = useState('');
  const [entry, setEntry] = useState('');
  const [category, setCategory] = useState<JournalCategory>('reflection');
  const [useRecall, setUseRecall] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(false);

  // Triggered whenever user clicks "New Entry"
  React.useEffect(() => {
    if (resetSignal && resetSignal > 0) {
      setTitle('');
      setEntry('');
      setErrorMessage(null);
      setStatusMessage(null);
      setHighlighted(true);
      const timer = setTimeout(() => setHighlighted(false), 1400);

      // Auto-focus title or content input
      setTimeout(() => {
        const titleEl = document.getElementById('journal-title-input');
        if (titleEl) {
          titleEl.focus();
        }
      }, 60);

      return () => clearTimeout(timer);
    }
  }, [resetSignal]);

  const applyThoughtStarter = (prompt: string) => {
    if (!entry || window.confirm('Replace current editor text with this thought starter?')) {
      setEntry(prompt + '\n\n');
      if (!title) {
        setTitle(prompt.slice(0, 45) + '...');
      }
    }
  };

  const handleGenerateAndSave = async () => {
    if (!entry.trim()) {
      setErrorMessage('Please enter your thoughts before reflecting with Gemini.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      let resultAiResponse = '';
      let resultSummary = '';
      let resultCitations: RecallCitation[] = [];
      let resultRecalledCount = 0;

      if (useRecall) {
        setStatusMessage('Searching your reflection vault & ranking semantic themes with Gemini...');
        const recallResult = await recallFromVaultApi({
          userId,
          query: entry.trim(),
          mode: 'reflect',
          title: title.trim() || 'Untitled Reflection',
          category,
          vaultInteractions,
        });

        resultAiResponse = recallResult.aiResponse;
        resultSummary = recallResult.summary || 'Mindful reflection on personal progress.';
        resultCitations = recallResult.citations || [];
        resultRecalledCount = recallResult.recalledCount || 0;
      } else {
        setStatusMessage('Analyzing with Gemini 3.6 Flash & structuring insights...');
        const standardResult = await generateReflectionApi({
          title: title.trim() || 'Untitled Reflection',
          entry: entry.trim(),
          category,
        });

        resultAiResponse = standardResult.aiResponse;
        resultSummary = standardResult.summary;
      }

      setStatusMessage('Persisting securely to Cloud Firestore under user vault...');

      // 2. Prepare interaction payload
      const interactionId = 'int_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const timestamp = new Date().toISOString();

      const newInteraction: Interaction = {
        id: interactionId,
        userId,
        title: title.trim() || 'Untitled Reflection',
        entry: entry.trim(),
        category,
        aiResponse: resultAiResponse,
        summary: resultSummary,
        citations: resultCitations,
        recalledCount: resultRecalledCount,
        messages: [
          {
            role: 'user',
            content: entry.trim(),
            timestamp,
          },
          {
            role: 'model',
            content: resultAiResponse,
            timestamp,
            citations: resultCitations.length > 0 ? resultCitations : undefined,
          },
        ],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // 3. Guaranteed Transaction Verification: Save to Firestore
      await saveInteractionToFirestore(userId, newInteraction);

      // 4. Clean up input state ONLY after successful persistence
      setTitle('');
      setEntry('');
      setStatusMessage(null);

      // 5. Notify parent to display the newly saved interaction
      onEntrySaved(newInteraction);
    } catch (err: any) {
      console.error('Error generating reflection or saving to Firestore:', err);
      setErrorMessage(
        err?.message || 'An unexpected error occurred while communicating with Gemini or Firestore.'
      );
      setStatusMessage(null);
      // Notice: we do NOT clear entry or title, preserving user input!
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="journal-editor-container" 
      className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm p-5 sm:p-7 ${
        highlighted ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span>New Reflection</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Private Vault
              </span>
            </h2>
            {Boolean(title || entry) && (
              <button
                id="clear-draft-button"
                type="button"
                onClick={() => {
                  if (!entry.trim() || window.confirm('Clear current draft and start a fresh reflection?')) {
                    setTitle('');
                    setEntry('');
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-rose-600 transition underline underline-offset-2 ml-2"
                title="Discard draft and start empty"
              >
                Clear draft
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Write your thoughts, challenge your perspectives, or brainstorm with Gemini.
          </p>
        </div>

        {/* Categories selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap border ${
                  isSelected
                    ? `${cat.color} ring-1 ring-offset-0 shadow-xs font-semibold`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thought starters accordion / chips */}
      <div className="my-4 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Thought Starters & Reflection Prompts:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THOUGHT_STARTERS.map((starter, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyThoughtStarter(starter)}
              className="text-left text-[11px] text-slate-600 hover:text-indigo-700 hover:bg-white p-2 rounded-lg border border-transparent hover:border-slate-200 transition line-clamp-2"
            >
              &bull; {starter}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Entry Title or Focus <span className="font-normal text-slate-400">(Optional)</span>
          </label>
          <input
            id="journal-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Career Crossroads & Next Strategic Quarter"
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400"
            disabled={loading}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Journal Content & Reflection
            </label>

            <div className="flex items-center gap-3">
              <button
                id="toggle-semantic-recall-btn"
                type="button"
                onClick={() => setUseRecall(!useRecall)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${
                  useRecall
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                }`}
                title="When active, Gemini analyzes past entries from your private vault to discover thematic connections and citations"
              >
                <Search className={`w-3.5 h-3.5 ${useRecall ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Recall from past entries</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    useRecall ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'
                  }`}
                />
              </button>

              <span className="text-[11px] text-slate-400">
                {entry.length} / 8,000 characters
              </span>
            </div>
          </div>

          {useRecall && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-700 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>
                Semantic Recall active: Gemini will ground its reflection in your past entries and provide citations.
              </span>
            </div>
          )}

          <textarea
            id="journal-content-input"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            rows={7}
            placeholder="Unpack your raw thoughts here. Describe what happened, why it matters, what dilemmas you face, or where you need fresh creative angles..."
            className="w-full px-3.5 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 leading-relaxed resize-y"
            disabled={loading}
          />
        </div>
      </div>

      {/* Error state with Retry button (Guaranteed Transaction Verification) */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Persistence / Generation Error</div>
              <div className="text-rose-700 mt-0.5">{errorMessage}</div>
              <div className="text-rose-600 text-[11px] mt-1 font-medium">
                Your drafted text is preserved in the editor.
              </div>
            </div>
          </div>
          <button
            id="retry-save-button"
            type="button"
            onClick={handleGenerateAndSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium shrink-0 shadow-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Reflection & Save</span>
          </button>
        </div>
      )}

      {/* Status indicator */}
      {statusMessage && (
        <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Powered by Gemini 3.6 Flash &bull; Auto-saved to Cloud Firestore</span>
        </div>

        <div className="flex items-center gap-2">
          {entry && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear current draft?')) {
                  setTitle('');
                  setEntry('');
                  setErrorMessage(null);
                }
              }}
              disabled={loading}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
            >
              Clear
            </button>
          )}

          <button
            id="reflect-with-gemini-btn"
            type="button"
            onClick={handleGenerateAndSave}
            disabled={loading || !entry.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold shadow-sm transition transform active:scale-98"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Synthesizing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reflect with Gemini</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
