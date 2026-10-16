import { toLocalDateKey } from '@/lib/date';
import type { ActiveTimer, LearningSession, SessionStatus } from '@/types/learning';

/**
 * Timer belajar berbasis timestamp.
 *
 * Waktu aktif = accumulatedMs + (now - segmentStartedAt) selama status `running`.
 * Tidak ada nilai yang bergantung pada jumlah tick setInterval, sehingga tick yang
 * terlambat (tab di background, render ulang) tidak mengubah hasil.
 */

/** Seberapa sering lastSeenAt diperbarui selama timer berjalan. */
export const HEARTBEAT_INTERVAL_MS = 5_000;

/**
 * Jika timer "running" tidak terlihat aktif lebih lama dari ini (browser ditutup,
 * perangkat tidur), waktu setelah lastSeenAt tidak dihitung sebagai waktu belajar.
 * Nilainya di atas throttling timer tab background (~1 menit) agar tab yang sekadar
 * tidak aktif tetap dihitung.
 */
export const MAX_SILENT_GAP_MS = 150_000;

/** Sesi dengan waktu aktif di bawah ini tidak dicatat. */
export const MIN_RECORDED_MS = 1_000;

export const MIN_SESSION_MINUTES = 1;
export const MAX_SESSION_MINUTES = 180;

export function createTimer(params: {
  id: string;
  targetMs: number;
  lessonId: string | null;
  now: number;
}): ActiveTimer {
  return {
    id: params.id,
    targetMs: params.targetMs,
    startedAt: params.now,
    status: 'running',
    accumulatedMs: 0,
    segmentStartedAt: params.now,
    lastSeenAt: params.now,
    lessonId: params.lessonId,
    pausedAt: null,
    pauseReason: null,
  };
}

export function getElapsedMs(timer: ActiveTimer, now: number): number {
  const running =
    timer.status === 'running' && timer.segmentStartedAt !== null
      ? Math.max(0, now - timer.segmentStartedAt)
      : 0;
  return Math.min(timer.targetMs, timer.accumulatedMs + running);
}

export function getRemainingMs(timer: ActiveTimer, now: number): number {
  return Math.max(0, timer.targetMs - getElapsedMs(timer, now));
}

/** Momen countdown mencapai nol bila timer terus berjalan; null jika sedang dijeda. */
export function getCompletionTime(timer: ActiveTimer): number | null {
  if (timer.status !== 'running' || timer.segmentStartedAt === null) return null;
  return timer.segmentStartedAt + Math.max(0, timer.targetMs - timer.accumulatedMs);
}

export function pauseTimer(
  timer: ActiveTimer,
  now: number,
  reason: 'user' | 'inactive' = 'user',
): ActiveTimer {
  if (timer.status !== 'running') return timer;
  return {
    ...timer,
    status: 'paused',
    accumulatedMs: getElapsedMs(timer, now),
    segmentStartedAt: null,
    lastSeenAt: now,
    pausedAt: now,
    pauseReason: reason,
  };
}

export function resumeTimer(timer: ActiveTimer, now: number): ActiveTimer {
  if (timer.status !== 'paused') return timer;
  return {
    ...timer,
    status: 'running',
    segmentStartedAt: now,
    lastSeenAt: now,
    pausedAt: null,
    pauseReason: null,
  };
}

export function touchTimer(timer: ActiveTimer, now: number): ActiveTimer {
  return { ...timer, lastSeenAt: now };
}

/** Mengakhiri timer menjadi catatan sesi. */
export function finalizeTimer(
  timer: ActiveTimer,
  now: number,
  status: SessionStatus,
): LearningSession {
  const completionTime = getCompletionTime(timer);
  let endedAt: number;
  let actualMs: number;

  if (status === 'completed') {
    actualMs = timer.targetMs;
    endedAt = completionTime ?? timer.pausedAt ?? now;
  } else {
    actualMs = getElapsedMs(timer, now);
    endedAt = timer.status === 'running' ? now : (timer.pausedAt ?? now);
  }

  return {
    id: timer.id,
    localDate: toLocalDateKey(timer.startedAt),
    startedAt: timer.startedAt,
    endedAt: Math.max(timer.startedAt, endedAt),
    targetMs: timer.targetMs,
    actualMs,
    status,
    lessonId: timer.lessonId,
  };
}

export type ReconcileResult =
  | { kind: 'active'; timer: ActiveTimer; changed: boolean }
  | { kind: 'finished'; session: LearningSession };

/**
 * Menyelaraskan timer dengan waktu sekarang. Dipanggil setiap tick, saat tab kembali
 * terlihat, dan saat halaman dimuat ulang.
 *
 * 1. Timer berjalan yang lama tidak terlihat → hanya dihitung sampai lastSeenAt, lalu
 *    dijeda otomatis (atau selesai jika target sudah tercapai sebelum lastSeenAt).
 * 2. Timer berjalan yang melewati target → selesai dengan durasi aktual = target.
 * 3. Timer yang dijeda dan sudah berganti hari → diakhiri sebagai `interrupted`.
 */
export function reconcileTimer(timer: ActiveTimer, now: number): ReconcileResult {
  let current = timer;
  let changed = false;

  if (current.status === 'running') {
    const gap = now - current.lastSeenAt;
    if (gap > MAX_SILENT_GAP_MS) {
      const completionTime = getCompletionTime(current);
      if (completionTime !== null && completionTime <= current.lastSeenAt) {
        return { kind: 'finished', session: finalizeTimer(current, now, 'completed') };
      }
      current = {
        ...pauseTimer(current, current.lastSeenAt, 'inactive'),
        lastSeenAt: now,
      };
      changed = true;
    } else {
      const completionTime = getCompletionTime(current);
      if (completionTime !== null && now >= completionTime) {
        return { kind: 'finished', session: finalizeTimer(current, now, 'completed') };
      }
    }
  }

  if (current.status === 'paused') {
    if (current.accumulatedMs >= current.targetMs) {
      return { kind: 'finished', session: finalizeTimer(current, now, 'completed') };
    }
    if (toLocalDateKey(now) !== toLocalDateKey(current.startedAt)) {
      return { kind: 'finished', session: finalizeTimer(current, now, 'interrupted') };
    }
  }

  return { kind: 'active', timer: current, changed };
}

export function shouldRecordSession(session: LearningSession): boolean {
  return session.actualMs >= MIN_RECORDED_MS;
}
