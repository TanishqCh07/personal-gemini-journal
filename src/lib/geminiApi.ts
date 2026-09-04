import { DialogueMessage, Interaction, JournalCategory, RecallResult, ReflectionGenerationResult } from '../types';
import { auth } from './firebase';
import { getDemoInteractions, isDemoUser } from './firestoreService';

export async function getCurrentAuthToken(userId?: string): Promise<string> {
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) return token;
    } catch (err) {
      console.warn('[Auth Token] Failed to get Firebase ID token:', err);
    }
  }

  if (userId && isDemoUser(userId)) {
    return userId;
  }

  // Fallback check in storage
  const guestUser = sessionStorage.getItem('gemini_guest_user');
  if (guestUser) {
    try {
      const parsed = JSON.parse(guestUser);
      if (parsed.uid) return parsed.uid;
    } catch {}
  }

  return 'demo-explorer-anonymous';
}

export async function generateReflectionApi(params: {
  title: string;
  entry: string;
  category: JournalCategory;
}): Promise<ReflectionGenerationResult> {
  const response = await fetch('/api/gemini/reflect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errMsg = 'Failed to generate reflection from Gemini';
    try {
      const errData = await response.json();
      if (errData.error) errMsg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json();
}

export async function sendChatDialogueApi(params: {
  message: string;
  initialEntry: string;
  history: DialogueMessage[];
}): Promise<{ reply: string; modelUsed: string }> {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errMsg = 'Failed to send message to Gemini';
    try {
      const errData = await response.json();
      if (errData.error) errMsg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json();
}

/**
 * Perform Semantic Recall across the user's private reflection vault.
 * Mode 'reflect': Grounded reflection generation with citations.
 * Mode 'chat': Grounded multi-turn conversational response with citations.
 */
export async function recallFromVaultApi(params: {
  userId: string;
  query: string;
  mode: 'reflect' | 'chat';
  title?: string;
  category?: JournalCategory;
  currentEntryId?: string;
  history?: DialogueMessage[];
  initialEntry?: string;
  vaultInteractions?: Interaction[];
}): Promise<RecallResult> {
  const token = await getCurrentAuthToken(params.userId);
  const isDemo = isDemoUser(params.userId);

  const payload: any = {
    query: params.query,
    mode: params.mode,
    title: params.title,
    category: params.category,
    currentEntryId: params.currentEntryId,
    history: params.history,
    initialEntry: params.initialEntry,
  };

  if (isDemo) {
    payload.demoInteractions = getDemoInteractions(params.userId);
  } else if (Array.isArray(params.vaultInteractions) && params.vaultInteractions.length > 0) {
    payload.vaultInteractions = params.vaultInteractions.map((item) => ({
      id: item.id,
      title: item.title,
      entry: item.entry,
      category: item.category,
      summary: item.summary,
      createdAt: item.createdAt,
      aiResponse: item.aiResponse,
    }));
  }

  const response = await fetch('/api/gemini/recall', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = 'Semantic recall failed';
    try {
      const errData = await response.json();
      if (errData.error) errMsg = errData.error;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json();
}
