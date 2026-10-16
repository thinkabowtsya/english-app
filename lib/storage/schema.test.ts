import { describe, expect, it } from 'vitest';
import type { LearningSession } from '@/types/learning';
import { addSessionToData } from './actions';
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, createDefaultData, migrateData } from './schema';

const NOW = new Date(2026, 9, 16, 12, 0, 0).getTime();

const validSession: LearningSession = {
  id: 's1',
  localDate: '2026-10-16',
  startedAt: NOW - 600_000,
  endedAt: NOW,
  targetMs: 600_000,
  actualMs: 600_000,
  status: 'completed',
  lessonId: null,
};

describe('migrateData', () => {
  it('menolak data yang bukan objek', () => {
    expect(migrateData(null, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(migrateData([], NOW)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('menolak versi skema yang lebih baru', () => {
    expect(migrateData({ schemaVersion: 99 }, NOW)).toEqual({ ok: false, reason: 'unsupported-version' });
  });

  it('membuang entri rusak tanpa menghapus data valid', () => {
    const result = migrateData(
      {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        createdAt: NOW,
        settings: { ...DEFAULT_SETTINGS, dailyGoalMinutes: -5, displayName: 'Rani' },
        sessions: [validSession, { id: 'broken' }, validSession],
        lessons: { x: { lessonId: 'x' } },
        reviews: 'oops',
      },
      NOW,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.sessions).toEqual([validSession]);
    expect(result.data.settings.dailyGoalMinutes).toBe(DEFAULT_SETTINGS.dailyGoalMinutes);
    expect(result.data.settings.displayName).toBe('Rani');
    expect(result.data.lessons).toEqual({});
    expect(result.data.reviews).toEqual([]);
  });
});

describe('addSessionToData', () => {
  it('tidak mencatat sesi yang sama dua kali (klik ganda)', () => {
    const once = addSessionToData(createDefaultData(NOW), validSession);
    const twice = addSessionToData(once, validSession);
    expect(twice.sessions).toHaveLength(1);
    expect(twice).toBe(once);
  });

  it('mengabaikan sesi tanpa waktu aktif', () => {
    const data = createDefaultData(NOW);
    expect(addSessionToData(data, { ...validSession, actualMs: 200 })).toBe(data);
  });

  it('menambah waktu belajar materi yang tertaut', () => {
    const data = {
      ...createDefaultData(NOW),
      lessons: {
        a: {
          lessonId: 'a',
          moduleId: 'm',
          status: 'in_progress' as const,
          timeSpentMs: 60_000,
          lastScore: null,
          lastStudiedAt: null,
          completedAt: null,
        },
      },
    };
    const next = addSessionToData(data, { ...validSession, lessonId: 'a' });
    expect(next.lessons.a.timeSpentMs).toBe(660_000);
    expect(next.lessons.a.lastStudiedAt).toBe(NOW);
  });
});
