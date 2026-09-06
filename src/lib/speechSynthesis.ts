import React, { useState, useEffect } from 'react';

/**
 * Web Speech API - SpeechSynthesis Service for Gemini Reflection Journal
 * Handles text-to-speech audio reading, markdown/citation cleaning,
 * sentence chunking to avoid browser freeze limits, overlap prevention,
 * and reactive UI state tracking.
 */

export interface SpeechState {
  speakingId: string | null;
  isSpeaking: boolean;
}

export const VOICE_MODE_STORAGE_KEY = 'gemini_journal_voice_mode';

/**
 * Check if the current browser environment supports SpeechSynthesis
 */
export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

/**
 * Strips out markdown syntax, citation brackets (like [Ref: ...]), code blocks,
 * and converts text into natural, clean speech sentences.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove citations like [Ref: 1, 2] or [Ref: ...]
  cleaned = cleaned.replace(/\[Ref:\s*[^\]]+\]/gi, '');
  cleaned = cleaned.replace(/\[citation:\s*[^\]]+\]/gi, '');

  // 2. Remove code blocks and inline code
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // 3. Convert markdown links [title](url) to title
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // 4. Remove bold / italic markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');

  // 5. Remove markdown headers (# Title)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // 6. Remove blockquotes (> quote)
  cleaned = cleaned.replace(/^>\s+/gm, '');

  // 7. Remove bullet points and numbered lists
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');

  // 8. Remove horizontal rules
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, '');

  // 9. Normalize multiple newlines to clean sentence pauses
  cleaned = cleaned.replace(/\n{2,}/g, '. ');
  cleaned = cleaned.replace(/\n/g, ' ');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  // 10. Clean duplicate punctuation and spacing before punctuation
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');

  return cleaned.trim();
}

/**
 * Splits text into sentence chunks under ~180 characters to prevent
 * Chromium/WebKit SpeechSynthesis from stalling or timing out on long paragraphs.
 */
export function splitTextIntoChunks(text: string, maxChunkLength = 180): string[] {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return [];

  // Match sentences ending in punctuation
  const rawSentences = cleaned.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [cleaned];

  // Deduplicate adjacent identical sentences or header-to-first-sentence duplicate lines
  const dedupedSentences: string[] = [];
  for (let i = 0; i < rawSentences.length; i++) {
    const s = rawSentences[i].trim();
    if (!s) continue;
    if (dedupedSentences.length > 0) {
      const prev = dedupedSentences[dedupedSentences.length - 1];
      const normPrev = prev.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normCurr = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normPrev && normCurr && normPrev === normCurr) {
        // Skip duplicate identical sentence
        continue;
      }
      if (dedupedSentences.length === 1 && normPrev && normCurr && normCurr.startsWith(normPrev) && normPrev.length >= 8) {
        // First sentence was an excerpt or title heading that is repeated verbatim at the start of the second sentence
        dedupedSentences.pop();
      }
    }
    dedupedSentences.push(s);
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of dedupedSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((currentChunk + ' ' + trimmed).trim().length <= maxChunkLength) {
      currentChunk = (currentChunk ? currentChunk + ' ' : '') + trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      if (trimmed.length > maxChunkLength) {
        // Break long sentence by commas or words
        const words = trimmed.split(' ');
        let subChunk = '';
        for (const word of words) {
          if ((subChunk + ' ' + word).trim().length <= maxChunkLength) {
            subChunk = (subChunk ? subChunk + ' ' : '') + word;
          } else {
            if (subChunk) chunks.push(subChunk.trim());
            subChunk = word;
          }
        }
        currentChunk = subChunk;
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

type SpeechListener = (speakingId: string | null, settlingId: string | null) => void;

class SpeechManager {
  private currentSpeakingId: string | null = null;
  private settlingId: string | null = null;
  private settleTimeout: any = null;
  private pendingPlayTimeout: any = null;
  private playSessionToken = 0;
  private lastSpokenId: string | null = null;
  private lastSpokenTime = 0;
  private spokenHistory: Map<string, number> = new Map();
  private listeners: Set<SpeechListener> = new Set();
  private isExplicitlyStopping = false;
  private currentQueue: string[] = [];
  private currentQueueIndex = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Cancel speech if user switches away from browser tab or window loses focus
      window.addEventListener('blur', () => {
        this.stop();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        }
      });
    }
  }

  public subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    listener(this.currentSpeakingId, this.settlingId);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentSpeakingId, this.settlingId);
      } catch (err) {
        console.error('Error in speech listener:', err);
      }
    }
  }

  public getCurrentSpeakingId(): string | null {
    return this.currentSpeakingId;
  }

  public getSettlingId(): string | null {
    return this.settlingId;
  }

  public isSpeaking(id?: string): boolean {
    if (!this.currentSpeakingId) return false;
    if (id) return this.currentSpeakingId === id;
    return true;
  }

  /**
   * Immediately stops any in-progress speech playback.
   */
  public stop() {
    if (!isSpeechSynthesisSupported()) return;

    this.isExplicitlyStopping = true;
    this.playSessionToken++;
    if (this.pendingPlayTimeout) {
      clearTimeout(this.pendingPlayTimeout);
      this.pendingPlayTimeout = null;
    }
    this.currentQueue = [];
    this.currentQueueIndex = 0;
    this.activeUtterance = null;
    this.lastSpokenId = null;
    this.lastSpokenTime = 0;

    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      // ignore benign error
    }

    if (this.currentSpeakingId !== null) {
      const prevId = this.currentSpeakingId;
      this.currentSpeakingId = null;
      if (this.settleTimeout) clearTimeout(this.settleTimeout);
      this.settlingId = prevId;
      this.notify();
      this.settleTimeout = setTimeout(() => {
        if (this.settlingId === prevId) {
          this.settlingId = null;
          this.notify();
        }
      }, 350);
    }

    setTimeout(() => {
      this.isExplicitlyStopping = false;
    }, 50);
  }

  /**
   * Speak clean text for a given item identifier.
   * Cancels any prior active speech first to avoid overlapping voices.
   */
  public speak(id: string, text: string) {
    if (!isSpeechSynthesisSupported()) return;

    const now = Date.now();
    // Guard 1: If already speaking this exact item ID, ignore duplicate trigger
    if (this.currentSpeakingId === id && this.currentQueue.length > 0) {
      return;
    }

    // Guard 2: Prevent rapid duplicate triggers for the same response ID within 1500ms
    const prevSpokenTime = this.spokenHistory.get(id) || 0;
    if (now - prevSpokenTime < 1500) {
      return;
    }

    // 1. Invalidate any prior play sessions and cancel speech immediately
    this.playSessionToken++;
    if (this.pendingPlayTimeout) {
      clearTimeout(this.pendingPlayTimeout);
      this.pendingPlayTimeout = null;
    }

    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }

    this.isExplicitlyStopping = false;
    if (this.settleTimeout) {
      clearTimeout(this.settleTimeout);
      this.settleTimeout = null;
    }
    this.settlingId = null;

    const chunks = splitTextIntoChunks(text);
    if (chunks.length === 0) {
      this.currentSpeakingId = null;
      this.notify();
      return;
    }

    this.currentSpeakingId = id;
    this.lastSpokenId = id;
    this.lastSpokenTime = now;
    this.spokenHistory.set(id, now);
    this.currentQueue = chunks;
    this.currentQueueIndex = 0;
    this.notify();

    const sessionToken = this.playSessionToken;

    // Small delay to allow synthesis.cancel() to fully settle in browser
    this.pendingPlayTimeout = setTimeout(() => {
      this.pendingPlayTimeout = null;
      if (this.playSessionToken !== sessionToken || this.currentSpeakingId !== id) return;
      this.playNextChunk(id, sessionToken);
    }, 60);
  }

  private playNextChunk(id: string, sessionToken: number) {
    if (!isSpeechSynthesisSupported()) return;
    if (this.playSessionToken !== sessionToken || this.currentSpeakingId !== id) return;
    if (this.currentQueueIndex >= this.currentQueue.length) {
      // Completed all chunks cleanly
      const prevId = this.currentSpeakingId;
      this.currentSpeakingId = null;
      this.currentQueue = [];
      this.currentQueueIndex = 0;
      this.activeUtterance = null;
      if (prevId) {
        if (this.settleTimeout) clearTimeout(this.settleTimeout);
        this.settlingId = prevId;
        this.notify();
        this.settleTimeout = setTimeout(() => {
          if (this.settlingId === prevId) {
            this.settlingId = null;
            this.notify();
          }
        }, 350);
      } else {
        this.notify();
      }
      return;
    }

    const chunkText = this.currentQueue[this.currentQueueIndex];
    const utterance = new SpeechSynthesisUtterance(chunkText);
    this.activeUtterance = utterance;

    // Attempt to set a natural voice if available
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Daniel') ||
                v.name.includes('Premium'))
          ) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];
        if (preferred) {
          utterance.voice = preferred;
        }
      }
    } catch {
      // benign fallback
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (this.isExplicitlyStopping || this.playSessionToken !== sessionToken || this.currentSpeakingId !== id) return;
      this.currentQueueIndex++;
      // Advance to next chunk asynchronously to avoid Chromium onend re-trigger bug
      this.pendingPlayTimeout = setTimeout(() => {
        this.pendingPlayTimeout = null;
        if (this.playSessionToken !== sessionToken || this.currentSpeakingId !== id) return;
        this.playNextChunk(id, sessionToken);
      }, 40);
    };

    utterance.onerror = (e) => {
      if (this.isExplicitlyStopping || this.playSessionToken !== sessionToken || this.currentSpeakingId !== id) return;
      // If canceled / interrupted, treat as end
      if (e.error === 'canceled' || e.error === 'interrupted') {
        const prevId = this.currentSpeakingId;
        this.currentSpeakingId = null;
        this.currentQueue = [];
        this.currentQueueIndex = 0;
        this.activeUtterance = null;
        if (prevId) {
          if (this.settleTimeout) clearTimeout(this.settleTimeout);
          this.settlingId = prevId;
          this.notify();
          this.settleTimeout = setTimeout(() => {
            if (this.settlingId === prevId) {
              this.settlingId = null;
              this.notify();
            }
          }, 350);
        } else {
          this.notify();
        }
        return;
      }
      // On non-fatal error, try next chunk asynchronously
      this.currentQueueIndex++;
      this.pendingPlayTimeout = setTimeout(() => {
        this.pendingPlayTimeout = null;
        if (this.playSessionToken !== sessionToken || this.currentSpeakingId !== id) return;
        this.playNextChunk(id, sessionToken);
      }, 40);
    };

    try {
      // Resume if browser suspended audio
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Error initiating speech synthesis utterance:', err);
      this.currentSpeakingId = null;
      this.notify();
    }
  }
}

export const speechManager = new SpeechManager();

/**
 * Custom React hook to bind speech state to component renders
 */
export function useSpeech() {
  const [speakingId, setSpeakingId] = React.useState<string | null>(() =>
    speechManager.getCurrentSpeakingId()
  );
  const [settlingId, setSettlingId] = React.useState<string | null>(() =>
    speechManager.getSettlingId()
  );

  React.useEffect(() => {
    return speechManager.subscribe((id, sId) => {
      setSpeakingId(id);
      setSettlingId(sId);
    });
  }, []);

  return {
    speakingId,
    settlingId,
    isSpeaking: speakingId !== null,
    isSpeakingId: (id: string) => speakingId === id,
    isSettlingId: (id: string) => settlingId === id,
    isActiveOrSettling: (id: string) => speakingId === id || settlingId === id,
    speak: (id: string, text: string) => speechManager.speak(id, text),
    stop: () => speechManager.stop(),
  };
}
