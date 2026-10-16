import { createId } from '@/lib/id';
import {
  HEARTBEAT_INTERVAL_MS,
  createTimer,
  finalizeTimer,
  pauseTimer,
  reconcileTimer,
  resumeTimer,
  shouldRecordSession,
  touchTimer,
} from '@/lib/timer';
import { minutesToMs } from '@/lib/date';
import type {
  AppData,
  LearningSession,
  LessonProgress,
  ReviewItem,
  Settings,
} from '@/types/learning';
import { createDefaultData } from './schema';
import {
  getActiveTimer,
  replaceData,
  setActiveTimer,
  setLastFinished,
  updateData,
} from './store';

const DAY_MS = 86_400_000;

/* ----------------------------- Sesi & timer ----------------------------- */

/** Menambahkan sesi ke riwayat. Idempoten berdasarkan ID sesi (aman dari klik ganda). */
export function addSessionToData(data: AppData, session: LearningSession): AppData {
  if (!shouldRecordSession(session)) return data;
  if (data.sessions.some((s) => s.id === session.id)) return data;

  let lessons = data.lessons;
  if (session.lessonId && lessons[session.lessonId]) {
    const prev = lessons[session.lessonId];
    lessons = {
      ...lessons,
      [session.lessonId]: {
        ...prev,
        timeSpentMs: prev.timeSpentMs + session.actualMs,
        lastStudiedAt: Math.max(prev.lastStudiedAt ?? 0, session.endedAt),
      },
    };
  }
  return { ...data, sessions: [...data.sessions, session], lessons };
}

function finishTimer(session: LearningSession) {
  setActiveTimer(null);
  updateData((data) => addSessionToData(data, session));
  setLastFinished(shouldRecordSession(session) ? session : null);
}

export function startTimer(minutes: number, lessonId: string | null, now = Date.now()) {
  if (getActiveTimer()) return null;
  const timer = createTimer({ id: createId('s'), targetMs: minutesToMs(minutes), lessonId, now });
  setActiveTimer(timer);
  setLastFinished(null);
  return timer;
}

export function pauseActiveTimer(now = Date.now()) {
  const timer = getActiveTimer();
  if (timer) setActiveTimer(pauseTimer(timer, now));
}

export function resumeActiveTimer(now = Date.now()) {
  const timer = getActiveTimer();
  if (timer) setActiveTimer(resumeTimer(timer, now));
}

export function linkActiveTimerToLesson(lessonId: string | null) {
  const timer = getActiveTimer();
  if (timer) setActiveTimer({ ...timer, lessonId });
}

/**
 * Menghentikan sesi lebih awal. Jika ternyata waktunya sudah habis, sesi dicatat sebagai
 * `completed`. Mengembalikan sesi yang tercatat (atau null jika tidak ada sesi aktif).
 */
export function stopActiveTimer(now = Date.now()): LearningSession | null {
  const timer = getActiveTimer();
  if (!timer) return null;
  const reconciled = reconcileTimer(timer, now);
  const session =
    reconciled.kind === 'finished'
      ? reconciled.session
      : finalizeTimer(reconciled.timer, now, 'stopped');
  finishTimer(session);
  return session;
}

/** Tick periodik: menyelesaikan timer yang habis dan memperbarui heartbeat. */
export function reconcileActiveTimer(now = Date.now()): LearningSession | null {
  const timer = getActiveTimer();
  if (!timer) return null;
  const result = reconcileTimer(timer, now);
  if (result.kind === 'finished') {
    finishTimer(result.session);
    return result.session;
  }
  if (result.changed) {
    setActiveTimer(result.timer);
  } else if (timer.status === 'running' && now - timer.lastSeenAt >= HEARTBEAT_INTERVAL_MS) {
    setActiveTimer(touchTimer(timer, now));
  }
  return null;
}

/** Dipanggil saat tab disembunyikan/ditutup agar waktu aktif terakhir tercatat. */
export function touchActiveTimer(now = Date.now()) {
  const timer = getActiveTimer();
  if (timer?.status === 'running') setActiveTimer(touchTimer(timer, now));
}

/* ------------------------------- Materi -------------------------------- */

function upsertLesson(
  data: AppData,
  lessonId: string,
  moduleId: string,
  patch: (prev: LessonProgress) => LessonProgress,
): AppData {
  const prev: LessonProgress = data.lessons[lessonId] ?? {
    lessonId,
    moduleId,
    status: 'in_progress',
    timeSpentMs: 0,
    lastScore: null,
    lastStudiedAt: null,
    completedAt: null,
  };
  return { ...data, lessons: { ...data.lessons, [lessonId]: patch(prev) } };
}

/** Mencatat materi terakhir yang dibuka. Tidak memengaruhi streak atau waktu belajar. */
export function markLessonOpened(lessonId: string, moduleId: string, now = Date.now()) {
  updateData((data) => {
    const withLesson = data.lessons[lessonId]
      ? data
      : upsertLesson(data, lessonId, moduleId, (p) => ({ ...p, lastStudiedAt: now }));
    if (withLesson === data && data.lastLessonId === lessonId) return data;
    return { ...withLesson, lastLessonId: lessonId };
  });
}

export function setLessonStatus(
  lessonId: string,
  moduleId: string,
  status: LessonProgress['status'],
  lessonTitle: string,
  now = Date.now(),
) {
  updateData((data) => {
    let next = upsertLesson(data, lessonId, moduleId, (p) => ({
      ...p,
      status,
      lastStudiedAt: now,
      completedAt: status === 'completed' ? now : p.completedAt,
    }));
    const hasOpenReview = next.reviews.some(
      (r) => r.kind === 'lesson' && r.lessonId === lessonId && r.resolvedAt === null,
    );
    if (status === 'needs_review' && !hasOpenReview) {
      next = addReviewToData(next, {
        kind: 'lesson',
        label: lessonTitle,
        note: null,
        reason: 'Ditandai perlu diulang',
        lessonId,
        source: 'manual',
        nextReviewAt: now + DAY_MS,
      }, now);
    }
    if (status === 'completed' && hasOpenReview) {
      next = {
        ...next,
        reviews: next.reviews.map((r) =>
          r.kind === 'lesson' && r.lessonId === lessonId && r.resolvedAt === null
            ? { ...r, resolvedAt: now }
            : r,
        ),
      };
    }
    return next;
  });
}

/** Untuk evaluasi materi di tahap kurikulum berikutnya. */
export function recordEvaluation(
  lessonId: string,
  moduleId: string,
  score: number,
  maxScore: number,
  now = Date.now(),
) {
  updateData((data) => {
    const next = upsertLesson(data, lessonId, moduleId, (p) => ({
      ...p,
      lastScore: score,
      lastStudiedAt: now,
    }));
    return {
      ...next,
      evaluations: [
        ...next.evaluations,
        { id: createId('e'), lessonId, score, maxScore, takenAt: now },
      ],
    };
  });
}

/* ------------------------------- Review -------------------------------- */

export type NewReview = Pick<
  ReviewItem,
  'kind' | 'label' | 'note' | 'reason' | 'lessonId' | 'source' | 'nextReviewAt'
>;

export function addReviewToData(data: AppData, item: NewReview, now: number): AppData {
  const label = item.label.trim();
  const duplicate = data.reviews.some(
    (r) => r.resolvedAt === null && r.kind === item.kind && r.label.toLowerCase() === label.toLowerCase(),
  );
  if (!label || duplicate) return data;
  const review: ReviewItem = {
    ...item,
    label,
    id: createId('r'),
    createdAt: now,
    failCount: 0,
    resolvedAt: null,
  };
  return { ...data, reviews: [...data.reviews, review] };
}

/** Mengembalikan false jika item yang sama sudah ada di daftar review. */
export function addReview(item: NewReview, now = Date.now()): boolean {
  let added = false;
  updateData((data) => {
    const next = addReviewToData(data, item, now);
    added = next !== data;
    return next;
  });
  return added;
}

export function resolveReview(id: string, now = Date.now()) {
  updateData((data) => ({
    ...data,
    reviews: data.reviews.map((r) => (r.id === id ? { ...r, resolvedAt: now } : r)),
  }));
}

/** Gagal recall: tambah hitungan dan jadwalkan ulang besok. */
export function reviewAgain(id: string, now = Date.now()) {
  updateData((data) => ({
    ...data,
    reviews: data.reviews.map((r) =>
      r.id === id ? { ...r, failCount: r.failCount + 1, nextReviewAt: now + DAY_MS } : r,
    ),
  }));
}

/* ------------------------------ Pengaturan ----------------------------- */

export function updateSettings(patch: Partial<Settings>) {
  updateData((data) => ({ ...data, settings: { ...data.settings, ...patch } }));
}

/** Menghapus seluruh progres (pengaturan tetap). Pemanggil wajib meminta konfirmasi. */
export function resetProgress(current: AppData, now = Date.now()) {
  setActiveTimer(null);
  setLastFinished(null);
  replaceData({ ...createDefaultData(now), settings: current.settings });
}
