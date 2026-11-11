/**
 * Jadwal pengulangan (spaced repetition) sederhana untuk kata Oxford 3000 & collocation.
 *
 * - Ditandai "sudah dipelajari" → step 0, ulang besok.
 * - Jawaban Recall benar → step naik, jarak ulang makin panjang (1 → 3 → 7 → 14 → 30 → 60 hari).
 * - Jawaban Recall salah → kembali ke step 0, ulang besok.
 * - step >= MASTERED_STEP (jarak ≥ 14 hari) dianggap "dikuasai".
 *
 * Kolomnya ada di oxford_words & collocation_progress (migrasi vocab_spaced_repetition).
 */

export const INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;
export const MASTERED_STEP = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STEP = INTERVAL_DAYS.length - 1;

export interface SrsState {
  learnedAt: string | null;
  step: number;
  dueAt: string | null;
  correct: number;
  wrong: number;
  lastReviewedAt: string | null;
}

export type SrsStatus = 'due' | 'learning' | 'mastered';

/** Kolom tabel yang diisi saat item ditandai / dibatalkan sebagai dipelajari. */
export function learnedColumns(learned: boolean, now: number) {
  return learned
    ? { learned_at: new Date(now).toISOString(), review_step: 0, due_at: new Date(now + DAY_MS).toISOString() }
    : { learned_at: null, review_step: 0, due_at: null };
}

/**
 * Kolom setelah satu jawaban Recall. Item yang belum dipelajari dan dijawab benar langsung
 * dianggap dipelajari (step 1); yang dijawab salah dibiarkan (null = tidak diubah).
 */
export function reviewColumns(state: SrsState | null, correct: boolean, now: number) {
  const learned = state?.learnedAt != null;
  if (!learned && !correct) return null;
  const prevStep = learned ? state!.step : 0;
  const step = correct ? Math.min(prevStep + 1, MAX_STEP) : 0;
  return {
    learned_at: learned ? state!.learnedAt : new Date(now).toISOString(),
    review_step: step,
    due_at: new Date(now + INTERVAL_DAYS[step] * DAY_MS).toISOString(),
    correct_count: (state?.correct ?? 0) + (correct ? 1 : 0),
    wrong_count: (state?.wrong ?? 0) + (correct ? 0 : 1),
    last_reviewed_at: new Date(now).toISOString(),
  };
}

export function srsStatus(state: Pick<SrsState, 'step' | 'dueAt'>, now: number): SrsStatus {
  if (state.dueAt && Date.parse(state.dueAt) <= now) return 'due';
  return state.step >= MASTERED_STEP ? 'mastered' : 'learning';
}

/** "hari ini", "besok", "3 hari lagi" — untuk jadwal ulang berikutnya. */
export function formatDue(dueAt: string | null, now: number): string {
  if (!dueAt) return '–';
  const days = Math.ceil((Date.parse(dueAt) - now) / DAY_MS);
  if (days <= 0) return 'hari ini';
  if (days === 1) return 'besok';
  return `${days} hari lagi`;
}

/** Baris tabel → SrsState (nama kolom snake_case dari Supabase). */
export interface SrsRow {
  learned_at: string | null;
  review_step: number;
  due_at: string | null;
  correct_count: number;
  wrong_count: number;
  last_reviewed_at: string | null;
}

export const SRS_COLUMNS = 'learned_at, review_step, due_at, correct_count, wrong_count, last_reviewed_at';

export function toSrsState(row: SrsRow): SrsState {
  return {
    learnedAt: row.learned_at,
    step: row.review_step,
    dueAt: row.due_at,
    correct: row.correct_count,
    wrong: row.wrong_count,
    lastReviewedAt: row.last_reviewed_at,
  };
}
