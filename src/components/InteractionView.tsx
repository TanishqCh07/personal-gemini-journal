import React, { useState } from 'react';
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
  Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Interaction, DialogueMessage } from '../types';
import { sendChatDialogueApi, recallFromVaultApi } from '../lib/geminiApi';
import { updateInteractionInFirestore } from '../lib/firestoreService';
import { CitationsList } from './CitationsList';

interface InteractionViewProps {
  userId: string;
  interaction: Interaction;
  onBack: () => void;
  onInteractionUpdated: (updated: Interaction) => void;
  vaultInteractions?: Interaction[];
}

export const InteractionView: React.FC<InteractionViewProps> = ({
  userId,
  interaction,
  onBack,
  onInteractionUpdated,
  vaultInteractions,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatRecall, setChatRecall] = useState(true);
  const [copied, setCopied] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          id="back-to-editor-btn"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Write New Reflection</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            id="copy-entry-btn"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main reflection record */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Metadata bar */}
        <div className="border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              {interaction.category}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedDate}</span>
            </div>
            <span className="text-xs text-slate-300">&bull;</span>
            <span className="text-[11px] text-emerald-700 font-medium">
              Firestore Isolated
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {interaction.title || 'Untitled Journal Entry'}
          </h1>
        </div>

        {/* User's original entry */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
            <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Your Journal Entry</span>
          </div>
          <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {interaction.entry}
          </div>
        </div>

        {/* Gemini Summary Card */}
        {interaction.summary && (
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-violet-50/70 border border-indigo-100/90 text-slate-900">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Key Takeaways & Core Theme</span>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {interaction.summary}
            </p>
          </div>
        )}

        {/* Gemini Primary Reflection Insights */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 mb-3">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span>Gemini 3.6 Flash Reflection & Brainstorming</span>
          </div>
          <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
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
        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Continue the Conversation with Gemini
              </h3>
            </div>
            <span className="text-xs text-slate-400">
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
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-xs'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none text-slate-800">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      )}

                      {/* Lightweight Citations for this model message */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/70">
                          <CitationsList citations={msg.citations} compact />
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-1 text-right ${
                          isUser ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                Ask a follow-up question, brainstorm solutions, or explore deeper motives with Gemini.
              </div>
            )}

            {loadingChat && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs text-slate-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
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
            <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
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
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
              title="When active, Gemini recalls semantically relevant past entries to answer your question"
            >
              <Search className={`w-3.5 h-3.5 ${chatRecall ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Recall from past entries</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  chatRecall ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'
                }`}
              />
            </button>

            {chatRecall && (
              <span className="text-[11px] text-indigo-600 font-medium hidden sm:inline">
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
              className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition placeholder:text-slate-400"
              disabled={loadingChat}
            />
            <button
              id="send-chat-button"
              type="submit"
              disabled={loadingChat || !chatInput.trim()}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold shadow-xs transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
