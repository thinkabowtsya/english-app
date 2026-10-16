import type { LearningSession } from '@/types/learning';
import { sessionSchema } from './schema';

/**
 * Antrean sesi yang sudah selesai tetapi belum berhasil disimpan ke Supabase (mis. offline).
 * Disimpan per pengguna di localStorage agar tidak hilang saat reload; dikirim ulang
 * otomatis. Penyimpanan bersifat idempoten (ID sesi = primary key), jadi tidak ada duplikat.
 */

const key = (userId: string) => `english-app:outbox:${userId}`;

export function readOutbox(userId: string): LearningSession[] {
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const r = sessionSchema.safeParse(item);
      return r.success ? [r.data] : [];
    });
  } catch {
    return [];
  }
}

function write(userId: string, sessions: LearningSession[]) {
  try {
    if (sessions.length === 0) window.localStorage.removeItem(key(userId));
    else window.localStorage.setItem(key(userId), JSON.stringify(sessions));
  } catch {
    // Jika localStorage diblokir, sesi tetap ada di memori sampai berhasil terkirim.
  }
}

export function addToOutbox(userId: string, session: LearningSession) {
  const current = readOutbox(userId);
  if (current.some((s) => s.id === session.id)) return;
  write(userId, [...current, session]);
}

export function removeFromOutbox(userId: string, ids: string[]) {
  const drop = new Set(ids);
  write(
    userId,
    readOutbox(userId).filter((s) => !drop.has(s.id)),
  );
}

export function clearOutbox(userId: string) {
  write(userId, []);
}
