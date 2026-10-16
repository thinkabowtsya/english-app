import { addDaysToKey, lastNDays, minutesToMs } from '@/lib/date';
import type { LearningSession, LocalDateKey, ReviewItem } from '@/types/learning';

/** Minimal waktu aktif dalam sehari agar hari itu dihitung sebagai hari belajar/streak. */
export const MIN_ACTIVE_DAY_MS = 60_000;

export function getTotalsByDate(sessions: LearningSession[]): Map<LocalDateKey, number> {
  const totals = new Map<LocalDateKey, number>();
  for (const s of sessions) {
    totals.set(s.localDate, (totals.get(s.localDate) ?? 0) + s.actualMs);
  }
  return totals;
}

export function getDailyTotalMs(sessions: LearningSession[], dateKey: LocalDateKey): number {
  return sessions.reduce((sum, s) => (s.localDate === dateKey ? sum + s.actualMs : sum), 0);
}

/** Hari-hari dengan waktu belajar nyata (bukan sekadar membuka aplikasi). Urut naik. */
export function getActiveDays(sessions: LearningSession[]): LocalDateKey[] {
  return [...getTotalsByDate(sessions)]
    .filter(([, ms]) => ms >= MIN_ACTIVE_DAY_MS)
    .map(([key]) => key)
    .sort();
}

export interface StreakInfo {
  current: number;
  longest: number;
  activeToday: boolean;
}

/**
 * Streak dihitung dari sesi belajar yang tercatat saja. Jika hari ini belum belajar,
 * streak dari kemarin tetap berlaku sampai hari berganti.
 */
export function getStreak(sessions: LearningSession[], todayKey: LocalDateKey): StreakInfo {
  const active = new Set(getActiveDays(sessions));
  const activeToday = active.has(todayKey);

  let current = 0;
  let cursor = activeToday ? todayKey : addDaysToKey(todayKey, -1);
  while (active.has(cursor)) {
    current++;
    cursor = addDaysToKey(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prev: LocalDateKey | null = null;
  for (const day of [...active].sort()) {
    run = prev !== null && addDaysToKey(prev, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }

  return { current, longest, activeToday };
}

export interface DayActivity {
  date: LocalDateKey;
  totalMs: number;
}

export function getRecentActivity(
  sessions: LearningSession[],
  todayKey: LocalDateKey,
  days = 7,
): DayActivity[] {
  const totals = getTotalsByDate(sessions);
  return lastNDays(todayKey, days).map((date) => ({ date, totalMs: totals.get(date) ?? 0 }));
}

export interface GoalProgress {
  goalMs: number;
  doneMs: number;
  remainingMs: number;
  percent: number;
  reached: boolean;
}

export function getGoalProgress(doneMs: number, goalMinutes: number): GoalProgress {
  const goalMs = minutesToMs(goalMinutes);
  const remainingMs = Math.max(0, goalMs - doneMs);
  const percent = goalMs === 0 ? 100 : Math.min(100, Math.floor((doneMs / goalMs) * 100));
  return { goalMs, doneMs, remainingMs, percent, reached: doneMs >= goalMs };
}

export interface SessionTotals {
  totalMs: number;
  sessionCount: number;
  completedCount: number;
}

export function getSessionTotals(sessions: LearningSession[]): SessionTotals {
  return {
    totalMs: sessions.reduce((sum, s) => sum + s.actualMs, 0),
    sessionCount: sessions.length,
    completedCount: sessions.filter((s) => s.status === 'completed').length,
  };
}

export function getOpenReviews(reviews: ReviewItem[]): ReviewItem[] {
  return reviews.filter((r) => r.resolvedAt === null);
}

export function getDueReviews(reviews: ReviewItem[], now: number): ReviewItem[] {
  return getOpenReviews(reviews).filter((r) => r.nextReviewAt === null || r.nextReviewAt <= now);
}
