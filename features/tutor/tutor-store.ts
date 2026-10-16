'use client';

import { useSyncExternalStore } from 'react';
import { createId, createUuid, isUuid } from '@/lib/id';
import type { AiProviderName } from '@/types/ai';

/**
 * Sesi Tanya Tutor yang sedang berjalan di browser ini (localStorage): tetap ada setelah tab
 * ditutup sampai pengguna memulai sesi baru. Saat sesi baru dimulai, sesi lama disimpan ke
 * riwayat Supabase (lihat tutor-history.ts). Pesan hanya dikirim ke /api/coach saat meminta jawaban.
 */

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: AiProviderName;
  createdAt: number;
}

export interface TutorSessionState {
  /** UUID sesi; sama dengan id baris di tabel tutor_sessions. */
  sessionId: string;
  messages: TutorMessage[];
}

const KEY = 'english-app:tutor-chat';
const MAX_STORED = 200;
const SERVER_STATE: TutorSessionState = { sessionId: '', messages: [] };

let state: TutorSessionState | null = null;
const listeners = new Set<() => void>();

function isMessage(m: unknown): m is TutorMessage {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.id === 'string' && typeof r.content === 'string' && typeof r.createdAt === 'number' &&
    (r.role === 'user' || r.role === 'assistant')
  );
}

function load(): TutorSessionState {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    // Format lama: hanya array pesan tanpa id sesi.
    if (Array.isArray(parsed)) return { sessionId: createUuid(), messages: parsed.filter(isMessage) };
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Partial<TutorSessionState>;
      return {
        sessionId: typeof p.sessionId === 'string' && isUuid(p.sessionId) ? p.sessionId : createUuid(),
        messages: Array.isArray(p.messages) ? p.messages.filter(isMessage) : [],
      };
    }
  } catch {
    // abaikan data rusak
  }
  return { sessionId: createUuid(), messages: [] };
}

function getSnapshot(): TutorSessionState {
  if (state === null) state = load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(next: TutorSessionState) {
  state = { ...next, messages: next.messages.slice(-MAX_STORED) };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Penyimpanan penuh/diblokir: riwayat tetap ada di memori.
  }
  for (const l of listeners) l();
}

export function getTutorSession(): TutorSessionState {
  return getSnapshot();
}

export function useTutorSession(): TutorSessionState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

export function appendTutorMessage(message: Omit<TutorMessage, 'id' | 'createdAt'>): TutorMessage {
  const full: TutorMessage = { ...message, id: createId('t'), createdAt: Date.now() };
  const current = getSnapshot();
  set({ ...current, messages: [...current.messages, full] });
  return full;
}

/** Mulai sesi kosong dengan id baru. */
export function startNewTutorSession() {
  set({ sessionId: createUuid(), messages: [] });
}

/** Ganti sesi aktif dengan sesi dari riwayat (untuk dilanjutkan). */
export function replaceTutorSession(next: TutorSessionState) {
  set(next);
}
