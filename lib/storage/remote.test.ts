import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { getDailyTotalMs, getSessionTotals, getStreak } from '@/lib/progress';
import type { LearningSession } from '@/types/learning';
import {
  CloudError,
  buildAppData,
  fetchCloudData,
  insertSessions,
  isValidSessionForCloud,
  rowToSession,
  rowToSettings,
  sessionToRow,
} from './remote';
import { DEFAULT_SETTINGS } from './schema';

const T0 = new Date(2026, 9, 16, 9, 0, 0).getTime();
const MIN = 60_000;

function session(id: string, minutes: number, extra: Partial<LearningSession> = {}): LearningSession {
  return {
    id,
    localDate: '2026-10-16',
    startedAt: T0,
    endedAt: T0 + minutes * MIN,
    targetMs: 25 * MIN,
    actualMs: minutes * MIN,
    status: 'stopped',
    lessonId: null,
    ...extra,
  };
}

describe('mapping sesi', () => {
  it('round-trip baris ↔ sesi memakai detik untuk durasi aktif', () => {
    const s = session('6f1c2a7e-1b2c-4d3e-8f90-123456789abc', 7.5);
    const row = sessionToRow(s);
    expect(row.active_seconds).toBe(450);
    expect(row.target_seconds).toBe(1500);
    expect(rowToSession(row)).toEqual({ ...s, startedAt: s.startedAt, endedAt: s.endedAt });
  });

  it('durasi aktif dibulatkan ke bawah (tidak pernah menambah waktu)', () => {
    expect(sessionToRow(session('x', 0, { actualMs: 59_999, endedAt: T0 + 60_000 })).active_seconds).toBe(59);
  });

  it('menolak sesi yang melanggar constraint tabel', () => {
    expect(isValidSessionForCloud(session('a', 10))).toBe(true);
    expect(isValidSessionForCloud(session('b', 0, { actualMs: 500 }))).toBe(false);
    // Waktu aktif lebih besar dari rentang waktu nyata
    expect(isValidSessionForCloud(session('c', 10, { endedAt: T0 + 2 * MIN }))).toBe(false);
    // Aktual melebihi target
    expect(isValidSessionForCloud(session('d', 30, { targetMs: 25 * MIN }))).toBe(false);
  });
});

describe('buildAppData', () => {
  const settings = { ...DEFAULT_SETTINGS };

  it('akun baru tanpa data menghasilkan statistik nol', () => {
    const data = buildAppData({ sessions: [], pendingSessions: [], progress: [], reviews: [], settings, now: T0 });
    expect(data.sessions).toEqual([]);
    expect(data.lastLessonId).toBeNull();
    expect(getSessionTotals(data.sessions)).toEqual({ totalMs: 0, sessionCount: 0, completedCount: 0 });
    expect(getStreak(data.sessions, '2026-10-16').current).toBe(0);
    expect(getDailyTotalMs(data.sessions, '2026-10-16')).toBe(0);
  });

  it('sesi tertunda yang sudah ada di cloud tidak dihitung dua kali', () => {
    const saved = session('s1', 10);
    const data = buildAppData({
      sessions: [saved],
      pendingSessions: [saved, session('s2', 5)],
      progress: [],
      reviews: [],
      settings,
      now: T0,
    });
    expect(data.sessions.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(getDailyTotalMs(data.sessions, '2026-10-16')).toBe(15 * MIN);
  });

  it('waktu per materi & materi terakhir diturunkan dari data', () => {
    const data = buildAppData({
      sessions: [session('s1', 10, { lessonId: 'a' }), session('s2', 5, { lessonId: 'a' })],
      pendingSessions: [],
      progress: [
        { lessonId: 'a', moduleId: 'm', status: 'in_progress', timeSpentMs: 0, lastScore: null, lastStudiedAt: T0, completedAt: null },
        { lessonId: 'b', moduleId: 'm', status: 'in_progress', timeSpentMs: 0, lastScore: null, lastStudiedAt: T0 + 1, completedAt: null },
      ],
      reviews: [],
      settings,
      now: T0,
    });
    expect(data.lessons.a.timeSpentMs).toBe(15 * MIN);
    expect(data.lessons.b.timeSpentMs).toBe(0);
    expect(data.lastLessonId).toBe('b');
  });

  it('pengaturan default bila belum ada baris settings', () => {
    expect(rowToSettings(null)).toEqual({
      displayName: '',
      dailyGoalMinutes: 30,
      defaultSessionMinutes: 25,
      coachDifficulty: 'intermediate',
    });
  });
});

/** Klien Supabase tiruan: setiap query mengembalikan hasil yang ditentukan. */
function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const builder = (table: string): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'order', 'range', 'upsert', 'delete', 'eq', 'maybeSingle']) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return chain;
  };
  return { client: { from: (table: string) => builder(table) } as unknown as SupabaseClient, calls };
}

describe('penanganan error database', () => {
  it('insertSessions melempar CloudError bila Supabase menolak', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'permission denied' } });
    await expect(insertSessions(client, [session('s1', 10)])).rejects.toBeInstanceOf(CloudError);
  });

  it('insertSessions idempoten: upsert dengan ignoreDuplicates pada id', async () => {
    const { client, calls } = fakeClient({ data: null, error: null });
    await insertSessions(client, [session('s1', 10)]);
    const upsert = calls.find((c) => c.method === 'upsert');
    expect(upsert?.table).toBe('learning_sessions');
    expect(upsert?.args[1]).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    // user_id tidak dikirim dari browser — diisi auth.uid() oleh database.
    expect((upsert?.args[0] as Record<string, unknown>[])[0]).not.toHaveProperty('user_id');
  });

  it('fetchCloudData gagal dengan CloudError bila query error', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'network' } });
    await expect(fetchCloudData(client)).rejects.toBeInstanceOf(CloudError);
  });

  it('fetchCloudData akun baru: semua kosong', async () => {
    const { client } = fakeClient({ data: [], error: null });
    const result = await fetchCloudData(client);
    expect(result.sessions).toEqual([]);
    expect(result.progress).toEqual([]);
    expect(result.reviews).toEqual([]);
  });
});
