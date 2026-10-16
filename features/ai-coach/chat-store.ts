'use client';

import { useSyncExternalStore } from 'react';
import { createId } from '@/lib/id';
import type { AiProviderName, CoachMode } from '@/types/ai';

/**
 * Riwayat percakapan AI Coach untuk sesi browser ini (sessionStorage): tetap ada saat
 * berpindah halaman atau reload, hilang saat tab ditutup. Tidak dikirim ke mana pun
 * selain ke /api/coach saat meminta balasan.
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  kind: 'message' | 'explanation';
  content: string;
  provider?: AiProviderName;
  createdAt: number;
}

export interface ChatState {
  mode: CoachMode;
  scenario: string;
  messages: ChatMessage[];
}

const KEY = 'english-app:coach-chat';
const MAX_STORED = 100;
const EMPTY: ChatState = { mode: 'help-me-say-it', scenario: '', messages: [] };

let state: ChatState | null = null;
const listeners = new Set<() => void>();

function load(): ChatState {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<ChatState>;
    const modes: CoachMode[] = ['help-me-say-it', 'free-conversation', 'role-play', 'correct-my-english'];
    return {
      mode: modes.includes(parsed.mode as CoachMode) ? (parsed.mode as CoachMode) : EMPTY.mode,
      scenario: typeof parsed.scenario === 'string' ? parsed.scenario.slice(0, 200) : '',
      messages: Array.isArray(parsed.messages)
        ? parsed.messages.filter(
            (m): m is ChatMessage =>
              typeof m === 'object' && m !== null && typeof m.id === 'string' && typeof m.content === 'string' &&
              (m.role === 'user' || m.role === 'assistant'),
          )
        : [],
    };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): ChatState {
  if (state === null) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(next: ChatState) {
  state = { ...next, messages: next.messages.slice(-MAX_STORED) };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Penyimpanan sesi penuh/diblokir: riwayat tetap ada di memori.
  }
  for (const l of listeners) l();
}

export function getChatState(): ChatState {
  return getSnapshot();
}

export function useChatState(): ChatState {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function appendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  const full: ChatMessage = { ...message, id: createId('m'), createdAt: Date.now() };
  const current = getSnapshot();
  set({ ...current, messages: [...current.messages, full] });
  return full;
}

export function setMode(mode: CoachMode) {
  set({ ...getSnapshot(), mode });
}

export function setScenario(scenario: string) {
  set({ ...getSnapshot(), scenario: scenario.slice(0, 200) });
}

export function clearConversation() {
  set({ ...getSnapshot(), messages: [] });
}
