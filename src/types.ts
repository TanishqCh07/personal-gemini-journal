export interface RecallCitation {
  id: string;
  title: string;
  date: string;
  category?: string;
  excerpt: string;
  relevanceReason?: string;
}

export interface DialogueMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  citations?: RecallCitation[];
}

export type JournalCategory = 
  | 'reflection'
  | 'brainstorm'
  | 'summary'
  | 'gratitude'
  | 'challenge'
  | 'general';

export interface PlaceLocation {
  placeName: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export interface Interaction {
  id: string;
  userId: string;
  title: string;
  entry: string;
  content?: string;
  category: JournalCategory;
  aiResponse: string;
  summary: string;
  messages: DialogueMessage[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  citations?: RecallCitation[];
  recalledCount?: number;
  location?: PlaceLocation;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface ReflectionGenerationResult {
  aiResponse: string;
  summary: string;
  modelUsed: string;
  citations?: RecallCitation[];
  recalledCount?: number;
  totalVaultEntries?: number;
  notice?: string;
}

export interface RecallResult {
  aiResponse: string;
  summary?: string;
  reply?: string;
  citations: RecallCitation[];
  modelUsed: string;
  recalledCount: number;
  totalVaultEntries: number;
  notice?: string;
}
