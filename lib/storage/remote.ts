import type { SupabaseClient } from '@supabase/supabase-js';
import { MIN_RECORDED_MS } from '@/lib/timer';
import type {
  AppData,
  Difficulty,
  LearningSession,
  LessonProgress,
  ReviewItem,
  Settings,
} from '@/types/learning';
import { DEFAULT_SETTINGS, CURRENT_SCHEMA_VERSION } from './schema';

/**
 * Akses tabel Supabase + konversi baris ↔ model aplikasi.
 * Keamanan data dijamin RLS (auth.uid()), bukan oleh filter di sini; user_id diisi otomatis
 * oleh default kolom `auth.uid()` sehingga browser tidak perlu (dan tidak bisa) memalsukannya.
 */

/* --------------------------------- Rows --------------------------------- */

export interface SessionRow {
  id: string;
  local_date: string;
  started_at: string;
  ended_at: string;
  target_seconds: number;
  active_seconds: number;
  status: LearningSession['status'];
  lesson_id: string | null;
}

export interface ProgressRow {
  item_id: string;
  module_id: string;
  status: LessonProgress['status'];
  last_score: number | null;
  last_studied_at: string | null;
  completed_at: string | null;
}

export interface SettingsRow {
  display_name: string;
  daily_goal_minutes: number;
  default_session_minutes: number;
  coach_difficulty: Difficulty;
}

export interface ReviewRow {
  id: string;
  kind: ReviewItem['kind'];
  label: string;
  note: string | null;
  reason: string;
  item_id: string | null;
  source: ReviewItem['source'];
  next_review_at: string | null;
  fail_count: number;
  resolved_at: string | null;
  created_at: string;
}

const toIso = (ms: number) => new Date(ms).toISOString();
const toMs = (iso: string) => new Date(iso).getTime();
const toMsOrNull = (iso: string | null) => (iso ? toMs(iso) : null);

/* ------------------------------- Mapping -------------------------------- */

export function sessionToRow(s: LearningSession): SessionRow {
  return {
    id: s.id,
    local_date: s.localDate,
    started_at: toIso(s.startedAt),
    ended_at: toIso(s.endedAt),
    target_seconds: Math.round(s.targetMs / 1000),
    // Pembulatan ke bawah agar tidak pernah melebihi waktu aktif sebenarnya.
    active_seconds: Math.max(1, Math.floor(s.actualMs / 1000)),
    status: s.status,
    lesson_id: s.lessonId,
  };
}

export function rowToSession(r: SessionRow): LearningSession {
  return {
    id: r.id,
    localDate: r.local_date,
    startedAt: toMs(r.started_at),
    endedAt: toMs(r.ended_at),
    targetMs: r.target_seconds * 1000,
    actualMs: r.active_seconds * 1000,
    status: r.status,
    lessonId: r.lesson_id,
  };
}

/** Sesi yang boleh dikirim ke database (sesuai constraint tabel). */
export function isValidSessionForCloud(s: LearningSession): boolean {
  const row = sessionToRow(s);
  return (
    s.actualMs >= MIN_RECORDED_MS &&
    row.target_seconds >= 60 &&
    row.target_seconds <= 10_800 &&
    row.active_seconds <= row.target_seconds &&
    s.endedAt >= s.startedAt &&
    row.active_seconds <= (s.endedAt - s.startedAt) / 1000 + 5
  );
}

export function progressToRow(p: LessonProgress): ProgressRow {
  return {
    item_id: p.lessonId,
    module_id: p.moduleId,
    status: p.status,
    last_score: p.lastScore,
    last_studied_at: p.lastStudiedAt === null ? null : toIso(p.lastStudiedAt),
    completed_at: p.completedAt === null ? null : toIso(p.completedAt),
  };
}

export function rowToProgress(r: ProgressRow): LessonProgress {
  return {
    lessonId: r.item_id,
    moduleId: r.module_id,
    status: r.status,
    timeSpentMs: 0,
    lastScore: r.last_score === null ? null : Number(r.last_score),
    lastStudiedAt: toMsOrNull(r.last_studied_at),
    completedAt: toMsOrNull(r.completed_at),
  };
}

export function reviewToRow(r: ReviewItem): ReviewRow {
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    note: r.note,
    reason: r.reason,
    item_id: r.lessonId,
    source: r.source,
    next_review_at: r.nextReviewAt === null ? null : toIso(r.nextReviewAt),
    fail_count: r.failCount,
    resolved_at: r.resolvedAt === null ? null : toIso(r.resolvedAt),
    created_at: toIso(r.createdAt),
  };
}

export function rowToReview(r: ReviewRow): ReviewItem {
  return {
    id: r.id,
    kind: r.kind,
    label: r.label,
    note: r.note,
    reason: r.reason,
    lessonId: r.item_id,
    source: r.source,
    createdAt: toMs(r.created_at),
    nextReviewAt: toMsOrNull(r.next_review_at),
    failCount: r.fail_count,
    resolvedAt: toMsOrNull(r.resolved_at),
  };
}

export type SyncedSettings = Pick<
  Settings,
  'displayName' | 'dailyGoalMinutes' | 'defaultSessionMinutes' | 'coachDifficulty'
>;

export function settingsToRow(s: SyncedSettings): SettingsRow {
  return {
    display_name: s.displayName,
    daily_goal_minutes: s.dailyGoalMinutes,
    default_session_minutes: s.defaultSessionMinutes,
    coach_difficulty: s.coachDifficulty,
  };
}

export function rowToSettings(r: SettingsRow | null): SyncedSettings {
  if (!r) {
    const { displayName, dailyGoalMinutes, defaultSessionMinutes, coachDifficulty } = DEFAULT_SETTINGS;
    return { displayName, dailyGoalMinutes, defaultSessionMinutes, coachDifficulty };
  }
  return {
    displayName: r.display_name,
    dailyGoalMinutes: r.daily_goal_minutes,
    defaultSessionMinutes: r.default_session_minutes,
    coachDifficulty: r.coach_difficulty,
  };
}

/**
 * Menyusun AppData dari data cloud + sesi yang masih di antrean lokal.
 * Waktu belajar per materi dan "materi terakhir" diturunkan dari data, bukan disimpan ganda.
 */
export function buildAppData(input: {
  sessions: LearningSession[];
  pendingSessions: LearningSession[];
  progress: LessonProgress[];
  reviews: ReviewItem[];
  settings: Settings;
  now: number;
}): AppData {
  const byId = new Map<string, LearningSession>();
  for (const s of [...input.sessions, ...input.pendingSessions]) if (!byId.has(s.id)) byId.set(s.id, s);
  const sessions = [...byId.values()].sort((a, b) => a.startedAt - b.startedAt);

  const lessons: AppData['lessons'] = {};
  for (const p of input.progress) lessons[p.lessonId] = { ...p, timeSpentMs: 0 };
  for (const s of sessions) {
    if (s.lessonId && lessons[s.lessonId]) lessons[s.lessonId].timeSpentMs += s.actualMs;
  }

  let lastLessonId: string | null = null;
  let lastAt = -1;
  for (const p of Object.values(lessons)) {
    if (p.lastStudiedAt !== null && p.lastStudiedAt > lastAt) {
      lastAt = p.lastStudiedAt;
      lastLessonId = p.lessonId;
    }
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: input.now,
    settings: input.settings,
    sessions,
    lessons,
    reviews: input.reviews,
    evaluations: [],
    lastLessonId,
  };
}

/* ------------------------------ Repository ------------------------------ */

const PAGE = 1000;

/** Mengambil seluruh baris dengan paginasi (PostgREST membatasi ~1000 baris per request). */
async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new CloudError(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

export class CloudError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudError';
  }
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new CloudError(result.error.message);
  return result.data;
}

export async function fetchCloudData(supabase: SupabaseClient) {
  const [sessions, progress, reviews, settings] = await Promise.all([
    fetchAllRows<SessionRow>((from, to) =>
      supabase
        .from('learning_sessions')
        .select('id, local_date, started_at, ended_at, target_seconds, active_seconds, status, lesson_id')
        .order('started_at', { ascending: true })
        .range(from, to),
    ),
    fetchAllRows<ProgressRow>((from, to) =>
      supabase
        .from('learning_progress')
        .select('item_id, module_id, status, last_score, last_studied_at, completed_at')
        .order('item_id')
        .range(from, to),
    ),
    fetchAllRows<ReviewRow>((from, to) =>
      supabase
        .from('review_items')
        .select('id, kind, label, note, reason, item_id, source, next_review_at, fail_count, resolved_at, created_at')
        .order('created_at', { ascending: true })
        .range(from, to),
    ),
    supabase
      .from('learning_settings')
      .select('display_name, daily_goal_minutes, default_session_minutes, coach_difficulty')
      .maybeSingle<SettingsRow>()
      .then(check),
  ]);
  return {
    sessions: sessions.map(rowToSession),
    progress: progress.map(rowToProgress),
    reviews: reviews.map(rowToReview),
    settings,
  };
}

/** Idempoten: sesi dengan ID yang sudah ada diabaikan (tidak tercatat dua kali). */
export async function insertSessions(supabase: SupabaseClient, sessions: LearningSession[]) {
  if (sessions.length === 0) return;
  check(
    await supabase
      .from('learning_sessions')
      .upsert(sessions.map(sessionToRow), { onConflict: 'id', ignoreDuplicates: true }),
  );
}

export async function upsertProgress(supabase: SupabaseClient, rows: LessonProgress[], ignoreDuplicates = false) {
  if (rows.length === 0) return;
  check(
    await supabase
      .from('learning_progress')
      .upsert(rows.map(progressToRow), { onConflict: 'user_id,item_id', ignoreDuplicates }),
  );
}

export async function upsertSettings(supabase: SupabaseClient, settings: SyncedSettings, userId: string) {
  check(
    await supabase
      .from('learning_settings')
      .upsert({ user_id: userId, ...settingsToRow(settings) }, { onConflict: 'user_id' }),
  );
}

export async function upsertReviews(supabase: SupabaseClient, reviews: ReviewItem[], ignoreDuplicates = false) {
  if (reviews.length === 0) return;
  check(await supabase.from('review_items').upsert(reviews.map(reviewToRow), { onConflict: 'id', ignoreDuplicates }));
}

export async function deleteReviewRow(supabase: SupabaseClient, id: string) {
  check(await supabase.from('review_items').delete().eq('id', id));
}

/** Menghapus seluruh progres milik pengguna yang login (RLS membatasi ke barisnya sendiri). */
export async function deleteAllProgress(supabase: SupabaseClient, userId: string) {
  for (const table of ['learning_sessions', 'learning_progress', 'review_items'] as const) {
    check(await supabase.from(table).delete().eq('user_id', userId));
  }
}
