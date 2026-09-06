import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  MapPin,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { JournalCategory, Interaction, RecallCitation, PlaceLocation } from '../types';
import { generateReflectionApi, recallFromVaultApi } from '../lib/geminiApi';
import { saveInteractionToFirestore } from '../lib/firestoreService';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';
import { isSpeechSynthesisSupported, speechManager, VOICE_MODE_STORAGE_KEY } from '../lib/speechSynthesis';
import { AudioWaveVisualizer } from './AudioWaveVisualizer';

interface JournalEditorProps {
  userId: string;
  onEntrySaved: (interaction: Interaction, options?: { autoSpeak?: boolean }) => void;
  resetSignal?: number;
  vaultInteractions?: Interaction[];
}

const CATEGORIES: { id: JournalCategory; label: string; icon: any; color: string }[] = [
  { id: 'reflection', label: 'Deep Reflection', icon: Compass, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800' },
  { id: 'brainstorm', label: 'Brainstorm Ideas', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' },
  { id: 'gratitude', label: 'Gratitude & Wins', icon: Heart, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' },
  { id: 'challenge', label: 'Hurdle / Problem', icon: Target, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' },
  { id: 'summary', label: 'Day / Week Summary', icon: BookOpen, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' },
  { id: 'general', label: 'Open Stream', icon: Zap, color: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
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
  const [showLocationToggle, setShowLocationToggle] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<PlaceLocation | null>(null);
  const [mapsAvailable, setMapsAvailable] = useState(true);

  // Web Speech API state
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const lastFinalizedIndexRef = useRef<number>(-1);

  // SpeechSynthesis Voice Mode state
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  const [voiceMode, setVoiceMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(VOICE_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Detect Web Speech API support (Recognition & Synthesis)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSupport = Boolean(
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      );
      setSpeechSupported(hasSupport);
      setSpeechSynthesisSupported(isSpeechSynthesisSupported());
    }
  }, []);

  const toggleVoiceMode = () => {
    setVoiceMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VOICE_MODE_STORAGE_KEY, String(next));
      } catch {
        // benign storage error
      }
      return next;
    });
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // benign
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    // Clear interim text preview without writing to permanent journal text
    setInterimText('');
    lastFinalizedIndexRef.current = -1;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      return;
    }

    // Stop in-progress SpeechSynthesis immediately so Gemini doesn't talk over user's voice input
    speechManager.stop();

    setSpeechError(null);
    lastFinalizedIndexRef.current = -1;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        // Reset tracked finalized index on every fresh recognition session
        lastFinalizedIndexRef.current = -1;
      };

      recognition.onresult = (event: any) => {
        let newlyFinalized = '';
        let currentInterim = '';

        // Start processing strictly from event.resultIndex (the lowest index in event.results that has changed)
        const resultIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0;

        for (let i = resultIndex; i < event.results.length; ++i) {
          const resultItem = event.results[i];
          if (!resultItem) continue;
          const transcript = resultItem[0]?.transcript || '';

          if (resultItem.isFinal) {
            // Track and append only newly finalized transcript segments that haven't been committed yet
            if (i > lastFinalizedIndexRef.current) {
              const cleaned = transcript.trim();
              if (cleaned) {
                newlyFinalized += (newlyFinalized ? ' ' : '') + cleaned;
              }
              lastFinalizedIndexRef.current = i;
            }
          } else {
            currentInterim += transcript;
          }
        }

        // Only append newly finalized text segments to the permanent journal entry
        if (newlyFinalized) {
          setEntry((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${newlyFinalized}` : newlyFinalized;
          });
        }

        // Interim results are displayed as temporary live feedback only
        setInterimText(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('[Web Speech API] Recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser to use voice input.');
          stopListening();
        } else if (event.error === 'no-speech') {
          // Benign user pause
        } else if (event.error === 'network') {
          setSpeechError('Network error occurred during speech recognition. Please try again.');
          stopListening();
        } else {
          setSpeechError(`Speech recognition notice: ${event.error}`);
          stopListening();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
        lastFinalizedIndexRef.current = -1;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[Web Speech API] Failed to start speech recognition:', err);
      setSpeechError(err.message || 'Unable to start speech recognition.');
      setIsListening(false);
    }
  };

  // Triggered whenever user clicks "New Entry"
  React.useEffect(() => {
    if (resetSignal && resetSignal > 0) {
      stopListening();
      setTitle('');
      setEntry('');
      setSelectedLocation(null);
      setShowLocationToggle(false);
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
    stopListening();
    // Cancel in-progress speech immediately when triggering a new reflection
    speechManager.stop();

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
        location: selectedLocation || undefined,
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
      setSelectedLocation(null);
      setShowLocationToggle(false);
      setStatusMessage(null);

      // 5. Notify parent to display the newly saved interaction with autoSpeak preference
      onEntrySaved(newInteraction, { autoSpeak: voiceMode });
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
      className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-300 shadow-sm p-5 sm:p-7 ${
        highlighted ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>New Reflection</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
                className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition underline underline-offset-2 ml-2 cursor-pointer"
                title="Discard draft and start empty"
              >
                Clear draft
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap border cursor-pointer ${
                  isSelected
                    ? `${cat.color} ring-1 ring-offset-0 shadow-xs font-semibold`
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
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
      <div className="my-4 p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>Thought Starters & Reflection Prompts:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {THOUGHT_STARTERS.map((starter, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyThoughtStarter(starter)}
              className="text-left text-[11px] text-slate-600 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-slate-700/80 p-2 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition line-clamp-2 cursor-pointer"
            >
              &bull; {starter}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Entry Title or Focus <span className="font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
          </label>
          <input
            id="journal-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Career Crossroads & Next Strategic Quarter"
            className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
            disabled={loading}
          />
        </div>

        {/* Location Tagging (Places Autocomplete & Direct Entry) */}
        <div className="pt-0.5">
          <div className="flex items-center justify-between">
            <button
              id="toggle-location-btn"
              type="button"
              onClick={() => setShowLocationToggle((prev) => !prev)}
              disabled={loading}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${
                selectedLocation
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-semibold shadow-2xs'
                  : showLocationToggle
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-medium ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title={showLocationToggle ? 'Close location search field' : 'Attach place name, address, and coordinates to this reflection'}
            >
              <MapPin className={`w-3.5 h-3.5 ${selectedLocation ? 'text-emerald-600 dark:text-emerald-400' : showLocationToggle ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{selectedLocation ? selectedLocation.placeName : showLocationToggle ? 'Close location' : 'Add location'}</span>
            </button>

            {selectedLocation && (
              <button
                id="change-location-btn"
                type="button"
                onClick={() => setShowLocationToggle((prev) => !prev)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition cursor-pointer"
              >
                {showLocationToggle ? 'Close' : 'Change'}
              </button>
            )}
          </div>

          {showLocationToggle && (
            <div id="location-search-container" className="mt-2 p-3 rounded-xl bg-slate-50/90 dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 animate-in fade-in duration-200">
              <PlaceAutocompleteInput
                selectedLocation={selectedLocation}
                onSelectPlace={(loc) => {
                  setSelectedLocation(loc);
                  setShowLocationToggle(false);
                }}
                onClearPlace={() => {
                  setSelectedLocation(null);
                }}
                onClose={() => setShowLocationToggle(false)}
                onLoadError={() => setMapsAvailable(false)}
              />
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Journal Content & Reflection
            </label>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Web Speech API Voice Input Button (hidden if not supported by browser) */}
              {speechSupported && (
                <button
                  id="voice-input-btn"
                  type="button"
                  onClick={toggleListening}
                  disabled={loading}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${
                    isListening
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-semibold shadow-2xs ring-2 ring-rose-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={isListening ? 'Stop voice recording' : 'Dictate reflection using voice input (Web Speech API)'}
                >
                  {isListening ? (
                    <>
                      <AudioWaveVisualizer active={true} colorVariant="rose" size="sm" barCount={5} />
                      <MicOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Voice Input</span>
                    </>
                  )}
                </button>
              )}

              <button
                id="toggle-semantic-recall-btn"
                type="button"
                onClick={() => setUseRecall(!useRecall)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${
                  useRecall
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="When active, Gemini analyzes past entries from your private vault to discover thematic connections and citations"
              >
                <Search className={`w-3.5 h-3.5 ${useRecall ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="hidden sm:inline">Recall from past entries</span>
                <span className="sm:hidden">Recall</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    useRecall ? 'bg-indigo-600 dark:bg-indigo-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              </button>

              {/* Web Speech API Voice Mode Toggle (gracefully hidden if SpeechSynthesis unsupported) */}
              {speechSynthesisSupported && (
                <button
                  id="toggle-voice-mode-btn"
                  type="button"
                  onClick={toggleVoiceMode}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${
                    voiceMode
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title={
                    voiceMode
                      ? 'Voice Mode is ON: Gemini reflection responses will be read aloud automatically'
                      : 'Turn on Voice Mode to automatically hear Gemini reflection responses read aloud'
                  }
                >
                  <Volume2
                    className={`w-3.5 h-3.5 ${
                      voiceMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>Voice Mode</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      voiceMode ? 'bg-indigo-600 dark:bg-indigo-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                </button>
              )}

              <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
                {entry.length} / 8,000 characters
              </span>
            </div>
          </div>

          {/* Clear Recording Indicator when speech recognition is active */}
          {isListening && (
            <div 
              id="voice-recording-indicator"
              className="mb-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <AudioWaveVisualizer active={true} colorVariant="rose" size="md" barCount={7} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-rose-950 dark:text-rose-100">Listening...</span>
                    <span className="text-rose-700/80 dark:text-rose-300/80 text-[11px]">Transcribing speech into text</span>
                  </div>
                  {interimText && (
                    <div className="text-slate-700 dark:text-slate-300 italic text-[11px] truncate mt-0.5">
                      "{interimText}"
                    </div>
                  )}
                </div>
              </div>
              <button
                id="stop-listening-bar-btn"
                type="button"
                onClick={toggleListening}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] transition shadow-xs cursor-pointer"
              >
                Done Speaking
              </button>
            </div>
          )}

          {speechError && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2 animate-in fade-in">
              <span>{speechError}</span>
              <button 
                type="button" 
                onClick={() => setSpeechError(null)} 
                className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 font-bold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {useRecall && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span>
                Semantic Recall active: Gemini will ground its reflection in your past entries and provide citations.
              </span>
            </div>
          )}

          <div className="relative">
            <textarea
              id="journal-content-input"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              rows={7}
              placeholder="Unpack your raw thoughts here. Describe what happened, why it matters, what dilemmas you face, or where you need fresh creative angles..."
              className={`w-full px-3.5 py-3 ${speechSupported ? 'pr-12' : ''} text-sm bg-white dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed resize-y ${
                isListening 
                  ? 'border-rose-300 ring-2 ring-rose-200/60' 
                  : 'border-slate-200 dark:border-slate-700'
              }`}
              disabled={loading}
            />

            {/* Corner microphone button inside textarea for quick access */}
            {speechSupported && (
              <button
                id="textarea-corner-mic-btn"
                type="button"
                onClick={toggleListening}
                disabled={loading}
                title={isListening ? 'Stop voice listening' : 'Start voice input (Web Speech API)'}
                className={`absolute right-3 bottom-3.5 p-1.5 rounded-lg border transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xs animate-pulse'
                    : 'bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state with Retry button (Guaranteed Transaction Verification) */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Persistence / Generation Error</div>
              <div className="text-rose-700 dark:text-rose-300 mt-0.5">{errorMessage}</div>
              <div className="text-rose-600 dark:text-rose-400 text-[11px] mt-1 font-medium">
                Your drafted text is preserved in the editor.
              </div>
            </div>
          </div>
          <button
            id="retry-save-button"
            type="button"
            onClick={handleGenerateAndSave}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium shrink-0 shadow-xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Reflection & Save</span>
          </button>
        </div>
      )}

      {/* Status indicator */}
      {statusMessage && (
        <div className="mt-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-xs flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
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
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Clear
            </button>
          )}

          <button
            id="reflect-with-gemini-btn"
            type="button"
            onClick={handleGenerateAndSave}
            disabled={loading || !entry.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-xs font-semibold shadow-sm transition transform active:scale-98 cursor-pointer"
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
