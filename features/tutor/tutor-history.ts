import type { SupabaseClient } from '@supabase/supabase-js';
import { createId } from '@/lib/id';
import type { Difficulty } from '@/types/learning';
import type { TutorMessage, TutorSessionState } from './tutor-store';

/**
 * Riwayat sesi Tanya Tutor di tabel Supabase `tutor_sessions`.
 * Keamanan dijamin RLS (auth.uid()); user_id diisi default kolom, bukan dari browser.
 */

const TABLE = 'tutor_sessions';
const TITLE_MAX = 120;
export const HISTORY_LIMIT = 30;

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface TutorSessionRow {
  id: string;
  title: string;
  difficulty: Difficulty;
  messages: StoredMessage[];
  message_count: number;
  started_at: string;
  ended_at: string;
}

export interface TutorHistoryItem {
  id: string;
  title: string;
  difficulty: Difficulty;
  messageCount: number;
  endedAt: number;
}

/** Judul sesi = pertanyaan pertama pengguna, dipendekkan. */
export function sessionTitle(messages: TutorMessage[]): string {
  const first = messages.find((m) => m.role === 'user')?.content ?? messages[0]?.content ?? 'Sesi tutor';
  const clean = first.replace(/\s+/g, ' ').trim() || 'Sesi tutor';
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1)}…` : clean;
}

export function sessionToRow(session: TutorSessionState, difficulty: Difficulty): TutorSessionRow {
  const { messages } = session;
  return {
    id: session.sessionId,
    title: sessionTitle(messages),
    difficulty,
    messages: messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
    message_count: messages.length,
    started_at: new Date(messages[0].createdAt).toISOString(),
    ended_at: new Date(Math.max(...messages.map((m) => m.createdAt))).toISOString(),
  };
}

export function rowMessagesToSession(id: string, raw: unknown): TutorSessionState {
  const messages: TutorMessage[] = Array.isArray(raw)
    ? raw
        .filter(
          (m): m is StoredMessage =>
            typeof m === 'object' && m !== null && typeof m.content === 'string' &&
            (m.role === 'user' || m.role === 'assistant'),
        )
        .map((m) => ({
          id: createId('t'),
          role: m.role,
          content: m.content,
          createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
        }))
    : [];
  return { sessionId: id, messages };
}

/** Simpan (atau perbarui, bila sesi lama dilanjutkan) satu sesi. Sesi kosong tidak disimpan. */
export async function saveTutorSession(sb: SupabaseClient, session: TutorSessionState, difficulty: Difficulty) {
  if (session.messages.length === 0) return;
  const { error } = await sb.from(TABLE).upsert(sessionToRow(session, difficulty), { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function listTutorSessions(sb: SupabaseClient): Promise<TutorHistoryItem[]> {
  const { data, error } = await sb
    .from(TABLE)
    .select('id, title, difficulty, message_count, ended_at')
    .order('ended_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    difficulty: r.difficulty as Difficulty,
    messageCount: r.message_count as number,
    endedAt: new Date(r.ended_at as string).getTime(),
  }));
}

export async function loadTutorSession(sb: SupabaseClient, id: string): Promise<TutorSessionState> {
  const { data, error } = await sb.from(TABLE).select('id, messages').eq('id', id).single();
  if (error) throw new Error(error.message);
  return rowMessagesToSession(data.id as string, data.messages);
}

export async function deleteTutorSession(sb: SupabaseClient, id: string) {
  const { error } = await sb.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
