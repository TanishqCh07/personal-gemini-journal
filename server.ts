import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Read Firebase applet configuration for server-side verification and Firestore REST access
let firebaseConfig: {
  projectId?: string;
  apiKey?: string;
  firestoreDatabaseId?: string;
} = {};

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (err) {
  console.warn('[Firebase Config] Warning: Could not read firebase-applet-config.json:', err);
}

// 1. Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 2. Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
];

interface FallbackOptions {
  contents: any;
  config?: any;
}

/**
 * Standard Helper: Resilient Model Fallback Ladder & Error Recovery Matrix
 */
async function generateContentWithFallback(options: FallbackOptions) {
  const ai = getAiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      if (response && response.text) {
        return {
          text: response.text,
          modelUsed: model,
        };
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || 0;
      const message = String(err?.message || '');
      
      const isRecoverable =
        status === 503 ||
        status === 429 ||
        status === 404 ||
        status === 500 ||
        message.includes('503') ||
        message.includes('429') ||
        message.includes('404') ||
        message.includes('ResourceExhausted') ||
        message.includes('Unavailable');

      console.warn(`[Gemini Fallback] Model ${model} encountered issue (status: ${status}): ${message}. Trying next model if available...`);
      
      if (!isRecoverable && status >= 400 && status < 500 && status !== 404 && status !== 429) {
        // Unrecoverable client error (e.g. 400 bad payload or invalid key)
        throw err;
      }
    }
  }

  throw lastError || new Error('All model fallback attempts were exhausted.');
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * POST /api/gemini/reflect
 * Ingests a user reflection, journal entry, or prompt and produces:
 * - A thoughtful, constructive feedback/brainstorm/reflection response
 * - A concise 1-2 sentence key takeaway summary
 */
app.post('/api/gemini/reflect', async (req, res) => {
  try {
    // Defensive payload ingestion (Null-Safe Destructuring)
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const entry = typeof body.entry === 'string' ? body.entry.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'reflection';

    if (!entry) {
      return res.status(400).json({ error: 'Journal reflection entry is required.' });
    }

    if (entry.length > 8000) {
      return res.status(400).json({ error: 'Entry exceeds maximum allowed length of 8,000 characters.' });
    }

    const systemInstruction = `You are a supportive, insightful, and wise journaling companion and thought partner.
Your role is to help the user unpack their thoughts, feelings, challenges, and goals.
Provide an empathetic, deeply perceptive response tailored to their topic and tone.
- Acknowledge their perspective with genuine warmth and clarity.
- Offer 2 to 3 constructive angles, clarifying questions, or creative brainstorm ideas to help them grow or see fresh solutions.
- Format with clean Markdown (subheadings, bullet points where appropriate). Keep it easy to read, grounded, and inspiring.
- Never output medical diagnoses or legal mandates.
- Keep the tone mindful, encouraging, and actionable.`;

    const promptText = `User Journal Topic: "${title || 'Untitled Entry'}"
Category: ${category}

User Journal Reflection:
"""
${entry}
"""

Please provide:
1. An insightful reflection and brainstorming response that directly addresses what was written.
2. A separate 1-2 sentence takeaway summary at the end marked clearly with:
[SUMMARY_START]
Your concise 1-2 sentence key takeaway here.
[SUMMARY_END]`;

    const result = await generateContentWithFallback({
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    let rawText = result.text;
    let reflectionText = rawText;
    let summaryText = '';

    const summaryMatch = rawText.match(/\[SUMMARY_START\]([\s\S]*?)\[SUMMARY_END\]/);
    if (summaryMatch) {
      summaryText = summaryMatch[1].trim();
      reflectionText = rawText.replace(/\[SUMMARY_START\][\s\S]*?\[SUMMARY_END\]/, '').trim();
    } else {
      // Fallback summary generation if marker is omitted
      const firstLines = rawText.split('\n').filter((l: string) => l.trim().length > 10);
      summaryText = firstLines[0]?.slice(0, 160) || 'Insightful reflection on personal progress and mindfulness.';
    }

    return res.json({
      aiResponse: reflectionText,
      summary: summaryText,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/reflect:', error);
    const message = error?.message || 'Failed to generate AI reflection';
    return res.status(500).json({
      error: message,
    });
  }
});

/**
 * POST /api/gemini/chat
 * Multi-turn dialogue continuation on an existing journal entry
 */
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const initialEntry = typeof body.initialEntry === 'string' ? body.initialEntry.trim() : '';
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    if (message.length > 4000) {
      return res.status(400).json({ error: 'Message exceeds maximum allowed length of 4,000 characters.' });
    }

    const systemInstruction = `You are a trusted journaling companion and conversational thought-partner.
You are having an ongoing conversation with the user regarding their personal journal reflection.
Original Journal Context:
"""
${initialEntry.slice(0, 3000)}
"""

Guidelines:
- Maintain continuity with previous turns in the discussion.
- Be thoughtful, non-judgmental, curious, and constructive.
- Help them explore their decisions, brainstorm options, find emotional clarity, or formulate practical next steps.
- Use clear Markdown formatting.`;

    // Build dialogue turns safely
    const formattedContents: any[] = [];
    for (const item of history.slice(-8)) {
      if (item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'model')) {
        formattedContents.push({
          role: item.role,
          parts: [{ text: item.content.slice(0, 2000) }],
        });
      }
    }

    // Add latest user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const result = await generateContentWithFallback({
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    const message = error?.message || 'Failed to continue dialogue with Gemini';
    return res.status(500).json({
      error: message,
    });
  }
});

/**
 * -------------------------------------------------------------------------
 * ENHANCEMENT #1: SEMANTIC RECALL PIPELINE
 * -------------------------------------------------------------------------
 */

interface VaultEntry {
  id: string;
  title: string;
  entry: string;
  category: string;
  summary: string;
  createdAt: string;
  aiResponse: string;
}

interface RecallCitationItem {
  id: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  relevanceReason: string;
}

function parseFirestoreField(field: any): any {
  if (!field || typeof field !== 'object') return field;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return parseInt(field.integerValue, 10);
  if ('doubleValue' in field) return parseFloat(field.doubleValue);
  if ('booleanValue' in field) return field.booleanValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('nullValue' in field) return null;
  if ('arrayValue' in field) {
    return (field.arrayValue?.values || []).map(parseFirestoreField);
  }
  if ('mapValue' in field) {
    const res: Record<string, any> = {};
    const subFields = field.mapValue?.fields || {};
    for (const k of Object.keys(subFields)) {
      res[k] = parseFirestoreField(subFields[k]);
    }
    return res;
  }
  return field;
}

/**
 * Security: Strict server-side user verification
 * Derives userId from Google Identity Toolkit token lookup.
 * Rejects any client-supplied userId to prevent IDOR / access-control bypass.
 */
async function verifyAuthAndGetUserId(authHeader: string | undefined): Promise<{ userId: string; token: string; isDemo: boolean }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED: Missing or malformed Authorization header.');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new Error('UNAUTHORIZED: Authorization token is empty.');
  }

  // Handle Demo / Sandbox Guest Explorer preview token
  if (token.startsWith('demo-explorer-') || token === 'demo') {
    return { userId: token, token, isDemo: true };
  }

  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) {
    throw new Error('SERVER_CONFIG_ERROR: Firebase API key is not configured.');
  }

  // Google Identity Toolkit accounts:lookup verifies the token against Google
  const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });

  if (!verifyRes.ok) {
    const errBody = await verifyRes.json().catch(() => ({}));
    const message = errBody?.error?.message || 'Token verification failed';
    throw new Error(`UNAUTHORIZED: ${message}`);
  }

  const data = await verifyRes.json();
  const user = data?.users?.[0];
  if (!user || !user.localId) {
    throw new Error('UNAUTHORIZED: No user identity found for token.');
  }

  return { userId: user.localId, token, isDemo: false };
}

function sanitizeCandidateList(items: any[]): VaultEntry[] {
  return items
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      id: String(item.id || ''),
      title: String(item.title || 'Untitled Reflection').slice(0, 200),
      entry: String(item.entry || '').slice(0, 6000),
      category: String(item.category || 'reflection'),
      summary: String(item.summary || '').slice(0, 500),
      createdAt: String(item.createdAt || new Date().toISOString()),
      aiResponse: String(item.aiResponse || '').slice(0, 4000),
    }))
    .filter((item) => item.id && (item.entry || item.title));
}

/**
 * Fetch past interactions from Cloud Firestore REST API
 * Scoped strictly to /users/{userId}/interactions using the user's bearer token.
 */
async function fetchVaultInteractions(userId: string, token: string): Promise<VaultEntry[]> {
  const projectId = firebaseConfig.projectId || 'fit-force-418305';
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const apiKey = firebaseConfig.apiKey || '';
  const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/users/${userId}/interactions?pageSize=100${keyParam}`;

  let res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  // If 403 or 404 with named database, attempt fallback to (default) database
  if ((res.status === 403 || res.status === 404) && dbId !== '(default)') {
    const fallbackUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}/interactions?pageSize=100${keyParam}`;
    const fallbackRes = await fetch(fallbackUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (fallbackRes.ok) {
      res = fallbackRes;
    }
  }

  if (res.status === 404) {
    return [];
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.warn(`[Firestore REST] Non-critical warning fetching interactions for user ${userId}:`, res.status, errText);
    throw new Error(`FIRESTORE_ERROR: Database returned status ${res.status}`);
  }

  const data = await res.json();
  const documents = Array.isArray(data?.documents) ? data.documents : [];

  return documents.map((doc: any) => {
    const nameParts = (doc.name || '').split('/');
    const docId = nameParts[nameParts.length - 1] || 'unknown-id';
    const fields = doc.fields || {};

    return {
      id: docId,
      title: parseFirestoreField(fields.title) || 'Untitled Reflection',
      entry: parseFirestoreField(fields.entry) || '',
      category: parseFirestoreField(fields.category) || 'reflection',
      summary: parseFirestoreField(fields.summary) || '',
      createdAt: parseFirestoreField(fields.createdAt) || doc.createTime || '',
      aiResponse: parseFirestoreField(fields.aiResponse) || '',
    };
  });
}

/**
 * POST /api/gemini/recall
 * Semantic Recall Endpoint:
 * 1. Fetches authenticated user's own past interactions from Firestore.
 * 2. Uses Gemini to select/rank which past entries are semantically relevant.
 * 3. Caps context (top 5, <= 3500 total characters) to manage token budget.
 * 4. Grounded synthesis: includes selected entries in reflection or chat with citations.
 */
app.post('/api/gemini/recall', async (req, res) => {
  try {
    // 1. Defensive input parsing
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'reflection';
    const mode = body.mode === 'chat' ? 'chat' : 'reflect';
    const currentEntryId = typeof body.currentEntryId === 'string' ? body.currentEntryId.trim() : '';
    const history = Array.isArray(body.history) ? body.history : [];
    const initialEntry = typeof body.initialEntry === 'string' ? body.initialEntry.trim() : '';

    if (!query) {
      return res.status(400).json({ error: 'Query or reflection text is required for semantic recall.' });
    }

    if (query.length > 8000) {
      return res.status(400).json({ error: 'Query exceeds maximum allowed length of 8,000 characters.' });
    }

    // 2. Auth verification (Strict server-side identity derivation)
    let authUser: { userId: string; token: string; isDemo: boolean };
    try {
      authUser = await verifyAuthAndGetUserId(req.headers.authorization);
    } catch (authErr: any) {
      const msg = authErr?.message || 'Authentication error';
      const status = msg.startsWith('UNAUTHORIZED') ? 401 : 403;
      return res.status(status).json({ error: msg });
    }

    // 3. Retrieve user's past entries
    let userEntries: VaultEntry[] = [];
    if (authUser.isDemo) {
      // Sandbox mode for Guest Explorer preview testing
      if (Array.isArray(body.demoInteractions)) {
        userEntries = sanitizeCandidateList(body.demoInteractions);
      }
    } else {
      // Prefer client-provided vaultInteractions (loaded via client-side authenticated Firestore SDK)
      if (Array.isArray(body.vaultInteractions) && body.vaultInteractions.length > 0) {
        userEntries = sanitizeCandidateList(body.vaultInteractions);
      } else {
        // Fall back to server-side REST query
        try {
          userEntries = await fetchVaultInteractions(authUser.userId, authUser.token);
        } catch (dbErr: any) {
          console.warn('[Semantic Recall] Firestore REST read failed, checking fallback:', dbErr.message);
          if (Array.isArray(body.vaultInteractions)) {
            userEntries = sanitizeCandidateList(body.vaultInteractions);
          } else {
            userEntries = [];
          }
        }
      }
    }

    // Exclude current entry so it does not recall itself
    const candidateEntries = userEntries.filter((e) => e.id !== currentEntryId && (e.entry || e.title));
    const totalVaultEntries = candidateEntries.length;

    // 4. Handle empty vault case (Graceful, no silent failure)
    if (candidateEntries.length === 0) {
      const emptyNotice = 'Your reflection vault has no past entries yet to recall from.';
      if (mode === 'chat') {
        const fallbackChatPrompt = `The user asked: "${query}".
Note: Their reflection vault has no past entries yet.
Provide a thoughtful, constructive answer acknowledging that their vault is currently empty, but giving them helpful insight on their question.`;

        const fallbackResult = await generateContentWithFallback({
          contents: fallbackChatPrompt,
          config: { temperature: 0.7 },
        });

        return res.json({
          reply: fallbackResult.text,
          aiResponse: fallbackResult.text,
          citations: [],
          recalledCount: 0,
          totalVaultEntries: 0,
          notice: emptyNotice,
          modelUsed: fallbackResult.modelUsed,
        });
      } else {
        // Mode === 'reflect'
        const promptText = `User Reflection: "${query}"
Note: Their reflection vault has no past entries yet. Provide a thoughtful reflection and 1-2 sentence takeaway:
[SUMMARY_START]
Takeaway summary here.
[SUMMARY_END]`;

        const fallbackResult = await generateContentWithFallback({
          contents: promptText,
          config: { temperature: 0.7 },
        });

        let rawText = fallbackResult.text;
        let reflectionText = rawText;
        let summaryText = 'Mindful reflection on personal progress.';

        const summaryMatch = rawText.match(/\[SUMMARY_START\]([\s\S]*?)\[SUMMARY_END\]/);
        if (summaryMatch) {
          summaryText = summaryMatch[1].trim();
          reflectionText = rawText.replace(/\[SUMMARY_START\][\s\S]*?\[SUMMARY_END\]/, '').trim();
        }

        return res.json({
          aiResponse: reflectionText,
          summary: summaryText,
          citations: [],
          recalledCount: 0,
          totalVaultEntries: 0,
          notice: emptyNotice,
          modelUsed: fallbackResult.modelUsed,
        });
      }
    }

    // 5. Semantic Relevance Ranking with Gemini
    // Prepare concise catalog
    const catalogSnippets = candidateEntries.slice(0, 35).map((entry) => {
      const dateStr = entry.createdAt
        ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Past Reflection';
      const preview = (entry.entry || '').slice(0, 260).replace(/\s+/g, ' ');
      const summary = (entry.summary || '').slice(0, 160).replace(/\s+/g, ' ');

      return `[ID: ${entry.id}]
Title: "${entry.title}"
Date: ${dateStr}
Category: ${entry.category}
Summary: ${summary || 'N/A'}
Excerpt: "${preview}"`;
    }).join('\n---\n');

    const rankingPrompt = `You are a semantic retrieval engine for a private personal journal.
User Query / Topic:
<user_query>
${query}
</user_query>

User's Past Reflections Catalog:
<vault_catalog>
${catalogSnippets}
</vault_catalog>

Task:
1. Identify up to 5 past entries that are semantically or thematically related to the user query (e.g. matching emotions, core challenges, habits, recurring themes, decisions, or direct topics).
2. Rank them by relevanceScore (integer 1 to 10). Only include entries with relevanceScore >= 5.
3. If no past entries relate to the query, return an empty array {"matches": []}.

Output schema:
Respond ONLY with valid JSON conforming to:
{
  "matches": [
    {
      "id": "entry-id",
      "relevanceScore": 8,
      "reason": "1-sentence explanation of why it is relevant",
      "keyExcerpt": "brief quote or concept from the entry"
    }
  ]
}`;

    let parsedMatches: Array<{ id: string; relevanceScore: number; reason: string; keyExcerpt: string }> = [];
    try {
      const rankingResponse = await generateContentWithFallback({
        contents: rankingPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(rankingResponse.text.trim());
      if (Array.isArray(parsed?.matches)) {
        parsedMatches = parsed.matches;
      }
    } catch (rankErr) {
      console.warn('[Semantic Recall] Ranking parse warning, falling back to top recent entries:', rankErr);
      // Fallback: take top 2 most recent candidate entries if ranking JSON fails
      parsedMatches = candidateEntries.slice(0, 2).map((e) => ({
        id: e.id,
        relevanceScore: 7,
        reason: 'Chronological continuity in your reflection vault.',
        keyExcerpt: (e.entry || '').slice(0, 120),
      }));
    }

    // 6. Grounding Context Assembly & Token / Character Capping
    // Filter to valid candidate entries and sort by score
    const candidateMap = new Map<string, VaultEntry>();
    for (const c of candidateEntries) {
      candidateMap.set(c.id, c);
    }

    const validMatches = parsedMatches
      .filter((m) => typeof m.id === 'string' && candidateMap.has(m.id) && (m.relevanceScore || 0) >= 5)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 5); // Cap at top 5

    const selectedCitations: RecallCitationItem[] = [];
    const groundingBlocks: string[] = [];
    let totalGroundingChars = 0;
    const MAX_TOTAL_GROUNDING_CHARS = 3500;
    const MAX_PER_ENTRY_CHARS = 700;

    for (const match of validMatches) {
      const entry = candidateMap.get(match.id);
      if (!entry) continue;

      const dateStr = entry.createdAt
        ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Past Reflection';

      let snippet = entry.entry.slice(0, MAX_PER_ENTRY_CHARS).trim();
      if (totalGroundingChars + snippet.length > MAX_TOTAL_GROUNDING_CHARS) {
        const remaining = MAX_TOTAL_GROUNDING_CHARS - totalGroundingChars;
        if (remaining > 150) {
          snippet = snippet.slice(0, remaining).trim();
        } else {
          break;
        }
      }

      totalGroundingChars += snippet.length;

      selectedCitations.push({
        id: entry.id,
        title: entry.title,
        date: dateStr,
        category: entry.category,
        excerpt: match.keyExcerpt || entry.summary || snippet.slice(0, 160),
        relevanceReason: match.reason || 'Semantically linked to your query.',
      });

      groundingBlocks.push(`
<grounding_entry id="${entry.id}" title="${entry.title}" date="${dateStr}" category="${entry.category}">
${snippet}
</grounding_entry>`);
    }

    const hasGrounding = groundingBlocks.length > 0;
    const groundingNotice = hasGrounding
      ? `Retrieved ${selectedCitations.length} semantically relevant past reflections.`
      : `Vault searched (${totalVaultEntries} total entries): no past reflections closely matched this specific topic.`;

    // 7. Grounded Synthesis with Gemini
    if (mode === 'chat') {
      const chatSystemInstruction = `You are a trusted journaling companion and conversational thought-partner.
The user has enabled Semantic Recall to search their private reflection vault.

${hasGrounding ? `The following past reflections were semantically retrieved from their vault as grounding context:
<user_vault_grounding>
${groundingBlocks.join('\n')}
</user_vault_grounding>

Instructions:
- Provide a helpful, perceptive, and constructive answer addressing their question.
- Synthesize connections, lessons, recurring habits, or growth between their past reflections and their current question.
- Whenever you reference or draw upon an idea from a past reflection, cite it cleanly using the format: [Ref: "<Title>" (<Date>)].
- Do not invent or hallucinate past reflections outside the provided grounding context.` : `The user asked a question, but no past entries in their vault matched the topic. Answer their question thoughtfully and note gently that no past reflections specifically touched on this theme.`}

Context of current discussion:
Original Entry Context: "${(initialEntry || '').slice(0, 2000)}"`;

      const formattedContents: any[] = [];
      for (const item of history.slice(-6)) {
        if (item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'model')) {
          formattedContents.push({
            role: item.role,
            parts: [{ text: item.content.slice(0, 2000) }],
          });
        }
      }

      formattedContents.push({
        role: 'user',
        parts: [{ text: query }],
      });

      const synthesisResult = await generateContentWithFallback({
        contents: formattedContents,
        config: {
          systemInstruction: chatSystemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({
        reply: synthesisResult.text,
        aiResponse: synthesisResult.text,
        citations: selectedCitations,
        modelUsed: synthesisResult.modelUsed,
        recalledCount: selectedCitations.length,
        totalVaultEntries,
        notice: groundingNotice,
      });
    } else {
      // mode === 'reflect'
      const reflectSystemInstruction = `You are a supportive, deeply insightful journaling companion and thought-partner.
The user has enabled Semantic Recall to enrich their new reflection with their past journal wisdom.

${hasGrounding ? `Historical Reflections Retrieved as Grounding Context:
<user_vault_grounding>
${groundingBlocks.join('\n')}
</user_vault_grounding>

Instructions:
- Provide an empathetic, constructive reflection that directly addresses what they wrote.
- Highlight patterns, contrasts, progress, or recurring challenges compared to their past reflections.
- Explicitly cite past entries whenever referencing them using: [Ref: "<Title>" (<Date>)].
- Do not hallucinate past reflections.
- Format with clean Markdown.` : `The user is writing a new reflection. No past reflections were found with high semantic similarity. Provide an empathetic, constructive reflection directly addressing what they wrote.`}

End your response with a 1-2 sentence key takeaway summary enclosed in markers:
[SUMMARY_START]
Takeaway summary here.
[SUMMARY_END]`;

      const promptText = `User Journal Topic: "${title || 'Untitled Entry'}"
Category: ${category}

User Journal Reflection:
"""
${query}
"""`;

      const synthesisResult = await generateContentWithFallback({
        contents: promptText,
        config: {
          systemInstruction: reflectSystemInstruction,
          temperature: 0.7,
        },
      });

      let rawText = synthesisResult.text;
      let reflectionText = rawText;
      let summaryText = '';

      const summaryMatch = rawText.match(/\[SUMMARY_START\]([\s\S]*?)\[SUMMARY_END\]/);
      if (summaryMatch) {
        summaryText = summaryMatch[1].trim();
        reflectionText = rawText.replace(/\[SUMMARY_START\][\s\S]*?\[SUMMARY_END\]/, '').trim();
      } else {
        const firstLines = rawText.split('\n').filter((l: string) => l.trim().length > 10);
        summaryText = firstLines[0]?.slice(0, 160) || 'Insightful reflection synthesizing personal growth and mindfulness.';
      }

      return res.json({
        aiResponse: reflectionText,
        summary: summaryText,
        citations: selectedCitations,
        modelUsed: synthesisResult.modelUsed,
        recalledCount: selectedCitations.length,
        totalVaultEntries,
        notice: groundingNotice,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/gemini/recall:', error);
    const message = error?.message || 'Failed to process semantic recall';
    return res.status(500).json({ error: message });
  }
});

/**
 * Start Server with Vite middleware in dev or static files in production
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
