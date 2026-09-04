import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Database, 
  KeyRound, 
  Server, 
  CheckCircle2, 
  Copy, 
  Check, 
  Cpu, 
  Lock,
  ListChecks
} from 'lucide-react';

interface SystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const SystemModal: React.FC<SystemModalProps> = ({ isOpen, onClose, userId }) => {
  const [copiedRules, setCopiedRules] = useState(false);
  const [activeTab, setActiveTab] = useState<'architecture' | 'rules' | 'walkthrough'>('architecture');

  if (!isOpen) return null;

  const rulesString = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // User interactions, journal entries, and AI reflection history isolation
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(rulesString);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                System & Security Architecture
              </h3>
              <p className="text-[11px] text-slate-500">
                Cloud Firestore Owner Isolation &bull; Resilient Gemini 3.6 Flash Fallback
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'architecture'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Architecture & Fallback
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'rules'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Firestore Security Rules
          </button>
          <button
            onClick={() => setActiveTab('walkthrough')}
            className={`py-3 border-b-2 transition ${
              activeTab === 'walkthrough'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Verification Walkthrough
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600">
          {activeTab === 'architecture' && (
            <div className="space-y-5">
              {/* Isolation Path */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Current User Isolation Document Path
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                    Owner Enforced
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] break-all select-all">
                  /users/{userId}/interactions/[interactionId]
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Queries and mutations are strictly isolated to the authenticated user ID. Any attempt to read or mutate another user's path is denied at the database engine level.
                </p>
              </div>

              {/* Gemini Fallback Ladder */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-900 text-xs mb-2 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  Resilient Gemini Model Fallback Ladder
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-mono text-slate-800">1. Primary: gemini-3.6-flash</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">Default</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-mono text-slate-800">2. High-Availability: gemini-3.1-flash-lite</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">Auto-Fallback</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-mono text-slate-800">3. Dynamic Alias: gemini-flash-latest</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">Auto-Fallback</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-mono text-slate-800">4. Deep Reasoning: gemini-3.7-flash</span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">Final Resilient Fallback</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Error Recovery Matrix captures HTTP 503, 429, 404, and 500 status codes and steps through the fallback ladder before raising an error to the user interface.
                </p>
              </div>

              {/* Zero Hardcoding Hygiene */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  Secret Management & Zero-Hardcoding
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  The Gemini API key is stored strictly on the server in <code>process.env.GEMINI_API_KEY</code> and is never exposed or delivered to the client browser. In production, Cloud Run securely mounts the secret directly from Google Cloud Secret Manager.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs">
                  Active firestore.rules
                </span>
                <button
                  onClick={copyRules}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] transition"
                >
                  {copiedRules ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                  <span>{copiedRules ? 'Copied' : 'Copy Rules'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {rulesString}
              </pre>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Zero-Trust Access Control Confirmed:</strong> Rejects unauthenticated traffic and enforces strict path owner checking <code>request.auth.uid == userId</code>.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'walkthrough' && (
            <div className="space-y-4">
              <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-indigo-600" />
                Comprehensive End-to-End Test Walkthrough
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-semibold text-slate-900 mb-1">
                    Step 1: Sign-In & Authentication
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Click "Sign In with Google" or "Enter as Guest Explorer". Confirm that user credentials populate the navbar avatar and display name. Verify user profile synchronization under <code>/users/&#123;uid&#125;</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-semibold text-slate-900 mb-1">
                    Step 2: Create a Multi-Turn Journal Reflection
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Select a category (e.g. "Deep Reflection" or "Brainstorm Ideas"). Enter a title and reflection body, or use a thought-starter. Click "Reflect with Gemini".
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-semibold text-slate-900 mb-1">
                    Step 3: Verify Gemini Output & Takeaway Summary
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Verify that Gemini 3.6 Flash returns a multi-angle reflection and a dedicated "Key Takeaways & Core Theme" summary card.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-semibold text-slate-900 mb-1">
                    Step 4: Continue Dialogue in Multi-Turn Thread
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Type a follow-up query in the chat input below the entry (e.g. "What is the first step I should take tomorrow?"). Confirm Gemini replies with contextual continuity.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-semibold text-slate-900 mb-1">
                    Step 5: Cloud Firestore Persistence & Isolation
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Verify that the reflection is listed in the "Reflection Vault" sidebar. Refresh the browser to confirm that data remains persisted in Cloud Firestore for your UID.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div className="font-semibold text-slate-900 mb-1">
                    Step 6: Deletion & Search Verification
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Use the search bar in the sidebar to search for a keyword. Then test entry deletion by clicking the trash icon and confirming removal from Firestore.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
