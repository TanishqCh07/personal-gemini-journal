import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, stripUndefined, auth } from './firebase';
import { Interaction, UserProfile } from '../types';
import { User } from 'firebase/auth';

const DEMO_EVENT_NAME = 'gemini_journal_demo_sync';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isDemoUser(userId: string): boolean {
  return typeof userId === 'string' && (userId.startsWith('demo-explorer-') || userId === 'demo');
}

export function getDemoInteractions(userId: string): Interaction[] {
  try {
    const raw = localStorage.getItem(`gemini_demo_interactions_${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to load demo interactions from storage:', err);
    return [];
  }
}

function setDemoInteractions(userId: string, items: Interaction[]): void {
  try {
    localStorage.setItem(`gemini_demo_interactions_${userId}`, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(DEMO_EVENT_NAME, { detail: { userId } }));
  } catch (err) {
    console.warn('Failed to save demo interactions to storage:', err);
  }
}

/**
 * Save user profile to /users/{userId}
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;

  if (isDemoUser(user.uid)) {
    try {
      localStorage.setItem(`gemini_demo_profile_${user.uid}`, JSON.stringify({
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || 'Guest Explorer',
        photoURL: user.photoURL || null,
        createdAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('Demo profile storage warning:', err);
    }
    return;
  }

  const userRef = doc(db, 'users', user.uid);
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || 'Anonymous Explorer',
    photoURL: user.photoURL || null,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(userRef, stripUndefined(profile), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

/**
 * Save or create an interaction record under /users/{userId}/interactions/{interactionId}
 * Guarantees strict user isolation.
 */
export async function saveInteractionToFirestore(
  userId: string,
  interaction: Interaction
): Promise<void> {
  if (!userId) throw new Error('User ID is required for saving interaction');
  if (!interaction.id) throw new Error('Interaction ID is required');

  const sanitized = stripUndefined({
    ...interaction,
    userId, // Enforce owner uid
    updatedAt: new Date().toISOString(),
  });

  if (isDemoUser(userId)) {
    const existing = getDemoInteractions(userId);
    const index = existing.findIndex((i) => i.id === interaction.id);
    if (index >= 0) {
      existing[index] = sanitized as Interaction;
    } else {
      existing.unshift(sanitized as Interaction);
    }
    setDemoInteractions(userId, existing);
    return;
  }

  const path = `users/${userId}/interactions/${interaction.id}`;
  const interactionRef = doc(db, 'users', userId, 'interactions', interaction.id);
  try {
    await setDoc(interactionRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Update an existing interaction (e.g. adding dialogue messages)
 */
export async function updateInteractionInFirestore(
  userId: string,
  interactionId: string,
  updates: Partial<Interaction>
): Promise<void> {
  if (!userId || !interactionId) return;

  const sanitized = stripUndefined({
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  if (isDemoUser(userId)) {
    const existing = getDemoInteractions(userId);
    const index = existing.findIndex((i) => i.id === interactionId);
    if (index >= 0) {
      existing[index] = { ...existing[index], ...sanitized };
      setDemoInteractions(userId, existing);
    }
    return;
  }

  const path = `users/${userId}/interactions/${interactionId}`;
  const interactionRef = doc(db, 'users', userId, 'interactions', interactionId);
  try {
    await updateDoc(interactionRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Delete an interaction
 */
export async function deleteInteractionFromFirestore(
  userId: string,
  interactionId: string
): Promise<void> {
  if (!userId || !interactionId) return;

  if (isDemoUser(userId)) {
    const existing = getDemoInteractions(userId);
    const filtered = existing.filter((i) => i.id !== interactionId);
    setDemoInteractions(userId, filtered);
    return;
  }

  const path = `users/${userId}/interactions/${interactionId}`;
  const interactionRef = doc(db, 'users', userId, 'interactions', interactionId);
  try {
    await deleteDoc(interactionRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time listener for user's isolated interactions collection:
 * /users/{userId}/interactions
 */
export function subscribeToUserInteractions(
  userId: string,
  onData: (items: Interaction[]) => void,
  onError: (err: Error) => void
) {
  if (!userId) {
    onData([]);
    return () => {};
  }

  if (isDemoUser(userId)) {
    // Immediate delivery for demo sandbox
    onData(getDemoInteractions(userId));

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string }>;
      if (!customEvent.detail || customEvent.detail.userId === userId) {
        onData(getDemoInteractions(userId));
      }
    };

    const storageHandler = () => {
      onData(getDemoInteractions(userId));
    };

    window.addEventListener(DEMO_EVENT_NAME, handler);
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener(DEMO_EVENT_NAME, handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  const path = `users/${userId}/interactions`;
  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Interaction[] = [];
      snapshot.forEach((docSnap) => {
        items.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Interaction, 'id'>),
        });
      });
      onData(items);
    },
    (error) => {
      console.error('Error fetching interactions:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (err: any) {
        onError(err);
      }
    }
  );
}
