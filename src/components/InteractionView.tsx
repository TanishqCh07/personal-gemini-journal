import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  ArrowLeft, 
  Copy, 
  Check, 
  Calendar, 
  Bookmark, 
  MessageSquare,
  AlertCircle,
  Search,
  MapPin,
  Trash2,
  Pencil
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Interaction, DialogueMessage } from '../types';
import { sendChatDialogueApi, recallFromVaultApi } from '../lib/geminiApi';
import { updateInteractionInFirestore, formatEditedDate } from '../lib/firestoreService';
import { CitationsList } from './CitationsList';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface InteractionViewProps {
  userId: string;
  interaction: Interaction;
  onBack: () => void;
  onInteractionUpdated: (updated: Interaction) => void;
  onDelete?: (interactionId: string) => void | Promise<void>;
  vaultInteractions?: Interaction[];
}

export const InteractionView: React.FC<InteractionViewProps> = ({
  userId,
  interaction,
  onBack,
  onInteractionUpdated,
  onDelete,
  vaultInteractions,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatRecall, setChatRecall] = useState(true);
  const [copied, setCopied] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset edit state whenever selected interaction changes
  useEffect(() => {
    setIsEditing(false);
    setEditError(null);
  }, [interaction.id]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditError(null);
    const isUntitled =
      !interaction.title ||
      interaction.title === 'Untitled Journal Entry' ||
      interaction.title === 'Untitled Reflection' ||
      interaction.title === 'Untitled Entry';
    setEditTitle(isUntitled ? '' : interaction.title);
    setEditContent(interaction.entry || interaction.content || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    const isUntitled =
      !interaction.title ||
      interaction.title === 'Untitled Journal Entry' ||
      interaction.title === 'Untitled Reflection' ||
      interaction.title === 'Untitled Entry';
    setEditTitle(isUntitled ? '' : interaction.title);
    setEditContent(interaction.entry || interaction.content || '');
  };

  const handleSaveEdit = async () => {
    const trimmedContent = editContent.trim();
    if (!trimmedContent) {
      setEditError('Journal content cannot be empty. Please enter your thoughts before saving.');
      return;
    }

    const finalTitle = editTitle.trim() || 'Untitled Reflection';
    const finalContent = trimmedContent;
    const editedAtTimestamp = new Date().toISOString();

    const updatedInteraction: Interaction = {
      ...interaction,
      title: finalTitle,
      entry: finalContent,
      content: finalContent,
      editedAt: editedAtTimestamp,
      updatedAt: editedAtTimestamp,
    };

    // 1. Optimistic local app state update
    onInteractionUpdated(updatedInteraction);

    try {
      setIsSaving(true);
      setEditError(null);

      // 2. Persist updated title, entry, content, and editedAt to Firestore
      await updateInteractionInFirestore(userId, interaction.id, {
        title: finalTitle,
        entry: finalContent,
        content: finalContent,
        editedAt: editedAtTimestamp,
      });

      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to save edited entry:', err);
      setEditError(err?.message || 'Failed to save changes to Firestore. Please try again.');
      // Revert optimistic update on failure
      onInteractionUpdated(interaction);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySummary = () => {
    const textToCopy = `Title: ${interaction.title}\n\nSummary:\n${interaction.summary}\n\nGemini Insights:\n${interaction.aiResponse}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || loadingChat) return;

    const userMessageText = chatInput.trim();
    setChatInput('');
    setLoadingChat(true);
    setChatError(null);

    const timestamp = new Date().toISOString();
    const newUserMsg: DialogueMessage = {
      role: 'user',
      content: userMessageText,
      timestamp,
    };

    const currentHistory = interaction.messages || [];
    const optimisticMessages = [...currentHistory, newUserMsg];

    // Optimistically update local view
    const optimisticInteraction: Interaction = {
      ...interaction,
      messages: optimisticMessages,
    };
    onInteractionUpdated(optimisticInteraction);

    try {
      let replyText = '';
      let citations = undefined;

      if (chatRecall) {
        const recallResult = await recallFromVaultApi({
          userId,
          query: userMessageText,
          mode: 'chat',
          currentEntryId: interaction.id,
          history: currentHistory,
          initialEntry: interaction.entry,
          vaultInteractions,
        });

        replyText = recallResult.reply || recallResult.aiResponse;
        if (recallResult.citations && recallResult.citations.length > 0) {
          citations = recallResult.citations;
        }
      } else {
        // Standard multi-turn dialogue
        const result = await sendChatDialogueApi({
          message: userMessageText,
          initialEntry: interaction.entry,
          history: currentHistory,
        });
        replyText = result.reply;
      }

      const modelMsg: DialogueMessage = {
        role: 'model',
        content: replyText,
        timestamp: new Date().toISOString(),
        citations,
      };

      const updatedMessages = [...optimisticMessages, modelMsg];
      const finalizedInteraction: Interaction = {
        ...interaction,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      };

      // 2. Persist updated messages to Cloud Firestore
      await updateInteractionInFirestore(userId, interaction.id, {
        messages: updatedMessages,
      });

      onInteractionUpdated(finalizedInteraction);
    } catch (err: any) {
      console.error('Error in multi-turn conversation:', err);
      setChatError(err?.message || 'Failed to receive response from Gemini. Please try again.');
      // Restore previous state if failed
      onInteractionUpdated(interaction);
    } finally {
      setLoadingChat(false);
    }
  };

  const formattedDate = new Date(interaction.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
        <button
          id="back-to-editor-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Write New Reflection</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id="copy-entry-btn"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            id="edit-detail-entry-btn"
            type="button"
            onClick={() => {
              if (isEditing) {
                handleCancelEdit();
              } else {
                handleStartEdit();
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isEditing
                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
            }`}
            title={isEditing ? 'Cancel editing and discard changes' : 'Edit entry title and content'}
          >
            <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
          </button>

          {onDelete && (
            <button
              id="delete-detail-entry-btn"
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-900/50 transition cursor-pointer"
              title="Delete reflection from Firestore"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400" />
              <span>Delete Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* Main reflection record */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6 transition-colors duration-200">
        {/* Metadata bar */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {interaction.category}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
            {interaction.editedAt && (
              <>
                <span className="text-xs text-slate-300 dark:text-slate-700">&bull;</span>
                <span 
                  id="detail-edited-label"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  title={`Originally created: ${new Date(interaction.createdAt).toLocaleString()}\nLast edited: ${new Date(interaction.editedAt).toLocaleString()}`}
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">Edited</span>
                  <span>{formatEditedDate(interaction.editedAt)}</span>
                </span>
              </>
            )}
            <span className="text-xs text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              Firestore Isolated
            </span>
            {interaction.location && (
              <>
                <span className="text-xs text-slate-300 dark:text-slate-700">&bull;</span>
                <div 
                  id="entry-view-location-chip"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-slate-700"
                  title={interaction.location.formattedAddress || `${interaction.location.lat}, ${interaction.location.lng}`}
                >
                  <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{interaction.location.placeName}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    ({interaction.location.lat.toFixed(2)}, {interaction.location.lng.toFixed(2)})
                  </span>
                </div>
              </>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2.5 space-y-1">
              <label 
                htmlFor="edit-entry-title-input" 
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Entry Title <span className="font-normal text-slate-400 dark:text-slate-500">(Optional — falls back to Untitled Reflection)</span>
              </label>
              <input
                id="edit-entry-title-input"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g., Reflections on Leadership & Resilience"
                maxLength={120}
                disabled={isSaving}
                className="w-full px-3.5 py-2 text-base sm:text-lg font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          ) : (
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {interaction.title || 'Untitled Journal Entry'}
            </h1>
          )}
        </div>

        {/* User's original entry */}
        {isEditing ? (
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-850/70 border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Edit Journal Content</span>
              </div>
              <span className={`text-[11px] font-mono ${
                editContent.length > 7800
                  ? 'text-amber-600 dark:text-amber-400 font-semibold'
                  : 'text-slate-400 dark:text-slate-500'
              }`}>
                {editContent.length.toLocaleString()} / 8,000 characters
              </span>
            </div>

            <textarea
              id="edit-entry-content-textarea"
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                if (editError && e.target.value.trim()) {
                  setEditError(null);
                }
              }}
              rows={8}
              maxLength={8000}
              placeholder="Unpack your raw thoughts here..."
              disabled={isSaving}
              className="w-full px-3.5 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed resize-y"
            />

            {editError && (
              <div
                id="edit-entry-error-banner"
                className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                id="cancel-edit-entry-btn"
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="save-edit-entry-btn"
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-850/70 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <UserIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Your Journal Entry</span>
            </div>
            <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {interaction.entry}
            </div>
          </div>
        )}

        {/* Gemini Summary Card */}
        {interaction.summary && (
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-violet-50/70 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-100/90 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Key Takeaways & Core Theme</span>
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
              {interaction.summary}
            </p>
          </div>
        )}

        {/* Gemini Primary Reflection Insights */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">
            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Gemini 3.6 Flash Reflection & Brainstorming</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-2xs">
            <ReactMarkdown>{interaction.aiResponse}</ReactMarkdown>
          </div>

          {/* Citations from Semantic Recall for the primary reflection */}
          {interaction.citations && interaction.citations.length > 0 && (
            <div className="mt-3.5">
              <CitationsList citations={interaction.citations} />
            </div>
          )}
        </div>

        {/* Multi-turn conversation section */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Continue the Conversation with Gemini
              </h3>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Multi-Turn Dialogue
            </span>
          </div>

          {/* Dialogue history */}
          <div className="space-y-3.5 mb-5 max-h-[480px] overflow-y-auto pr-1">
            {interaction.messages && interaction.messages.length > 2 ? (
              interaction.messages.slice(2).map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}

                      {/* Lightweight Citations for this model message */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                          <CitationsList citations={msg.citations} compact />
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-1 text-right ${
                          isUser ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 mt-1">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 px-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                Ask a follow-up question, brainstorm solutions, or explore deeper motives with Gemini.
              </div>
            )}

            {loadingChat && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                  <span>
                    {chatRecall
                      ? 'Gemini is retrieving relevant vault reflections & formulating grounded guidance...'
                      : 'Gemini is formulating thoughtful guidance...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {chatError && (
            <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{chatError}</span>
            </div>
          )}

          {/* Semantic Recall toggle in chat */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <button
              id="toggle-chat-recall-btn"
              type="button"
              onClick={() => setChatRecall(!chatRecall)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition cursor-pointer ${
                chatRecall
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="When active, Gemini recalls semantically relevant past entries to answer your question"
            >
              <Search className={`w-3.5 h-3.5 ${chatRecall ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>Recall from past entries</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  chatRecall ? 'bg-indigo-600 dark:bg-indigo-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            </button>

            {chatRecall && (
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hidden sm:inline">
                Vault recall active &bull; Answers will cite relevant past entries
              </span>
            )}
          </div>

          {/* Chat input box */}
          <form onSubmit={handleSendFollowUp} className="flex gap-2">
            <input
              id="chat-dialogue-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                chatRecall
                  ? "Ask across your past journal: e.g. 'What have I written about work stress before?'"
                  : "Reply or ask a question: e.g. 'How should I break down that first step?'"
              }
              className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
              disabled={loadingChat}
            />
            <button
              id="send-chat-button"
              type="submit"
              disabled={loadingChat || !chatInput.trim()}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        itemTitle={interaction.title}
        onConfirm={async () => {
          if (onDelete) {
            setIsDeleting(true);
            try {
              await onDelete(interaction.id);
            } finally {
              setIsDeleting(false);
              setShowDeleteModal(false);
            }
          }
        }}
        onClose={() => {
          if (!isDeleting) setShowDeleteModal(false);
        }}
        isDeleting={isDeleting}
      />
    </div>
  );
};
