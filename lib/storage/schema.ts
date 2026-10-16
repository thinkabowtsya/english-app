import { z } from 'zod';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '@/lib/timer';
import type { ActiveTimer, AppData, Settings } from '@/types/learning';

export const CURRENT_SCHEMA_VERSION = 1 as const;

export const DEFAULT_SETTINGS: Settings = {
  displayName: '',
  dailyGoalMinutes: 30,
  defaultSessionMinutes: 25,
  theme: 'system',
  soundOnFinish: true,
  browserNotification: false,
  coachDifficulty: 'intermediate',
};

export function createDefaultData(now: number): AppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    settings: { ...DEFAULT_SETTINGS },
    sessions: [],
    lessons: {},
    reviews: [],
    evaluations: [],
    lastLessonId: null,
  };
}

const epoch = z.number().int().nonnegative();
const id = z.string().min(1).max(120);

/** Validasi form pengaturan (juga dipakai saat membaca localStorage). */
export const settingsSchema = z.object({
  displayName: z.string().trim().max(40, 'Nama maksimal 40 karakter'),
  dailyGoalMinutes: z
    .number({ error: 'Target harus berupa angka' })
    .int('Target harus bilangan bulat')
    .min(5, 'Target minimal 5 menit')
    .max(600, 'Target maksimal 600 menit'),
  defaultSessionMinutes: z
    .number({ error: 'Durasi harus berupa angka' })
    .int('Durasi harus bilangan bulat')
    .min(MIN_SESSION_MINUTES, `Durasi minimal ${MIN_SESSION_MINUTES} menit`)
    .max(MAX_SESSION_MINUTES, `Durasi maksimal ${MAX_SESSION_MINUTES} menit`),
  theme: z.enum(['system', 'light', 'dark']),
  soundOnFinish: z.boolean(),
  browserNotification: z.boolean(),
  coachDifficulty: z.enum(['beginner', 'intermediate', 'advanced']),
});

/** Saat membaca data tersimpan, field yang rusak diganti default tanpa membuang field lain. */
const storedSettingsSchema = z.object({
  displayName: settingsSchema.shape.displayName.catch(DEFAULT_SETTINGS.displayName),
  dailyGoalMinutes: settingsSchema.shape.dailyGoalMinutes.catch(DEFAULT_SETTINGS.dailyGoalMinutes),
  defaultSessionMinutes: settingsSchema.shape.defaultSessionMinutes.catch(
    DEFAULT_SETTINGS.defaultSessionMinutes,
  ),
  theme: settingsSchema.shape.theme.catch(DEFAULT_SETTINGS.theme),
  soundOnFinish: settingsSchema.shape.soundOnFinish.catch(DEFAULT_SETTINGS.soundOnFinish),
  browserNotification: settingsSchema.shape.browserNotification.catch(
    DEFAULT_SETTINGS.browserNotification,
  ),
  coachDifficulty: settingsSchema.shape.coachDifficulty.catch(DEFAULT_SETTINGS.coachDifficulty),
});

const sessionSchema = z.object({
  id,
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: epoch,
  endedAt: epoch,
  targetMs: z.number().nonnegative(),
  actualMs: z.number().nonnegative(),
  status: z.enum(['completed', 'stopped', 'interrupted']),
  lessonId: id.nullable(),
});

const lessonProgressSchema = z.object({
  lessonId: id,
  moduleId: id,
  status: z.enum(['in_progress', 'completed', 'needs_review']),
  timeSpentMs: z.number().nonnegative(),
  lastScore: z.number().nullable(),
  lastStudiedAt: epoch.nullable(),
  completedAt: epoch.nullable(),
});

const reviewSchema = z.object({
  id,
  kind: z.enum(['lesson', 'pattern', 'phrase']),
  label: z.string().min(1).max(500),
  note: z.string().max(1000).nullable(),
  reason: z.string().max(300),
  lessonId: id.nullable(),
  source: z.enum(['manual', 'evaluation', 'ai-coach']),
  createdAt: epoch,
  nextReviewAt: epoch.nullable(),
  failCount: z.number().int().nonnegative(),
  resolvedAt: epoch.nullable(),
});

const evaluationSchema = z.object({
  id,
  lessonId: id,
  score: z.number(),
  maxScore: z.number().positive(),
  takenAt: epoch,
});

export const activeTimerSchema = z.object({
  id,
  targetMs: z
    .number()
    .min(MIN_SESSION_MINUTES * 60_000)
    .max(MAX_SESSION_MINUTES * 60_000),
  startedAt: epoch,
  status: z.enum(['running', 'paused']),
  accumulatedMs: z.number().nonnegative(),
  segmentStartedAt: epoch.nullable(),
  lastSeenAt: epoch,
  lessonId: id.nullable(),
  pausedAt: epoch.nullable(),
  pauseReason: z.enum(['user', 'inactive']).nullable(),
}) satisfies z.ZodType<ActiveTimer>;

/** Mengambil item array yang valid satu per satu, agar satu entri rusak tidak menghapus semuanya. */
function validItems<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function parseV1(raw: Record<string, unknown>, now: number): AppData {
  const lessons: AppData['lessons'] = {};
  if (raw.lessons && typeof raw.lessons === 'object') {
    for (const value of Object.values(raw.lessons as Record<string, unknown>)) {
      const parsed = lessonProgressSchema.safeParse(value);
      if (parsed.success) lessons[parsed.data.lessonId] = parsed.data;
    }
  }
  const settings = storedSettingsSchema.safeParse(raw.settings ?? {});

  // Hapus duplikat sesi berdasarkan ID (mis. akibat penyimpanan ganda di versi lama).
  const seen = new Set<string>();
  const sessions = validItems(raw.sessions, sessionSchema).filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: epoch.safeParse(raw.createdAt).data ?? now,
    settings: settings.success ? settings.data : { ...DEFAULT_SETTINGS },
    sessions,
    lessons,
    reviews: validItems(raw.reviews, reviewSchema),
    evaluations: validItems(raw.evaluations, evaluationSchema),
    lastLessonId: id.nullable().safeParse(raw.lastLessonId ?? null).data ?? null,
  };
}

export type MigrationResult =
  | { ok: true; data: AppData; migrated: boolean }
  | { ok: false; reason: 'unsupported-version' | 'invalid' };

/**
 * Memigrasikan data tersimpan ke versi skema terbaru.
 * Tambahkan langkah migrasi baru di sini ketika schemaVersion dinaikkan, mis.:
 *   if (version === 1) { raw = migrateV1toV2(raw); version = 2; }
 */
export function migrateData(raw: unknown, now: number): MigrationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: 'invalid' };
  }
  const record = raw as Record<string, unknown>;
  const version = record.schemaVersion;

  if (version === CURRENT_SCHEMA_VERSION) {
    return { ok: true, data: parseV1(record, now), migrated: false };
  }
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported-version' };
  }
  return { ok: false, reason: 'invalid' };
}
