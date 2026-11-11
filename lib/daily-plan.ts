import { diffDays, fromLocalDateKey, minutesToMs, toLocalDateKey } from '@/lib/date';
import { getNextLesson, type LessonRef } from '@/lib/curriculum';
import { getTotalsByDate } from '@/lib/progress';
import type { AppData, LocalDateKey } from '@/types/learning';

/**
 * Rencana belajar harian ±30 menit untuk menu Kalender. Murni (tanpa React/storage) agar bisa dites.
 *
 * Tugas: Materi (10) · Review (5) · Kosakata (5) · Bicara (10) + target waktu timer.
 * Materi, Review, dan target waktu dicentang OTOMATIS dari data belajar (tersinkron ke cloud);
 * Kosakata & Bicara dicentang manual oleh pengguna (lihat lib/daily-checks.ts).
 */

export type PlanTaskId = 'timer' | 'lesson' | 'review' | 'vocab' | 'speaking';

export interface PlanTask {
  id: PlanTaskId;
  title: string;
  detail: string;
  minutes: number;
  href: string;
  /** Selesai menurut data belajar (tidak bisa dibatalkan manual). */
  autoDone: boolean;
  /** Boleh dicentang manual. */
  manual: boolean;
}

export interface DayPlan {
  date: LocalDateKey;
  when: 'past' | 'today' | 'future';
  tasks: PlanTask[];
  studiedMs: number;
  goalMs: number;
}

const SPEAKING: { title: string; detail: string; href: string }[] = [
  // Indeks = getDay(): 0 Minggu … 6 Sabtu.
  { title: 'Ulang Buku kesalahan', detail: 'Baca ulang 5 kesalahan, ucapkan versi yang benar.', href: '/kesalahan' },
  { title: 'Telepon AI', detail: 'Ngobrol 10 menit dengan AI, jawab dengan kalimat lengkap.', href: '/call' },
  { title: 'Percakapan AI (role-play)', detail: 'Latihan situasi kerja: stand-up, menjelaskan bug.', href: '/percakapan' },
  { title: 'Telepon AI', detail: 'Ceritakan pekerjaanmu hari ini selama 10 menit.', href: '/call' },
  { title: 'Latihan kalimat', detail: 'Buat dan perbaiki kalimat sendiri dengan bantuan AI.', href: '/latihan/kalimat' },
  { title: 'Telepon AI', detail: 'Jelaskan satu masalah teknis: masalah → tindakan → hasil.', href: '/call' },
  { title: 'Recall', detail: 'Ingat & ucapkan ulang materi minggu ini tanpa melihat.', href: '/latihan/recall' },
];

/** Hari ganjil: kata baru Oxford 3000; hari genap: ulang kartu Kosakata. */
function vocabTask(date: LocalDateKey) {
  const day = fromLocalDateKey(date).getDate();
  return day % 2 === 1
    ? { title: 'Oxford 3000: 5 kata baru', detail: 'Buka 5 kata, dengar, lalu buat 1 kalimat per kata.', href: '/oxford' }
    : { title: 'Ulang kartu Kosakata', detail: 'Ulang kartu yang jatuh tempo, ucapkan contohnya.', href: '/kosakata' };
}

const isPassed = (status: string | undefined) => status === 'completed' || status === 'needs_review';

/**
 * Materi yang dijadwalkan per tanggal: hari lalu = materi yang benar-benar diselesaikan hari itu;
 * hari ini & ke depan = materi berikutnya berurutan (satu per hari), mulai dari materi yang belum selesai.
 */
export function scheduleLessons(
  refs: LessonRef[],
  data: Pick<AppData, 'lessons'>,
  todayKey: LocalDateKey,
): { completedOn: Map<LocalDateKey, LessonRef[]>; upcoming: LessonRef[]; doneToday: boolean } {
  const completedOn = new Map<LocalDateKey, LessonRef[]>();
  for (const ref of refs) {
    const p = data.lessons[ref.lesson.id];
    if (!p?.completedAt) continue;
    const key = toLocalDateKey(p.completedAt);
    completedOn.set(key, [...(completedOn.get(key) ?? []), ref]);
  }

  const next = getNextLesson(refs, data.lessons);
  const upcoming = next
    ? refs
        .slice(next.index)
        .filter((r) => r.lesson.contentStatus === 'ready' && !isPassed(data.lessons[r.lesson.id]?.status))
    : [];
  return { completedOn, upcoming, doneToday: (completedOn.get(todayKey)?.length ?? 0) > 0 };
}

export function buildDayPlan(input: {
  date: LocalDateKey;
  todayKey: LocalDateKey;
  refs: LessonRef[];
  data: Pick<AppData, 'lessons' | 'sessions' | 'reviews' | 'settings'>;
  /** Hasil scheduleLessons (hitung sekali untuk satu bulan). */
  schedule?: ReturnType<typeof scheduleLessons>;
  /** Total waktu per tanggal (hitung sekali untuk satu bulan). */
  totals?: Map<LocalDateKey, number>;
}): DayPlan {
  const { date, todayKey, refs, data } = input;
  const offset = diffDays(todayKey, date);
  const when: DayPlan['when'] = offset < 0 ? 'past' : offset === 0 ? 'today' : 'future';
  const schedule = input.schedule ?? scheduleLessons(refs, data, todayKey);
  const totals = input.totals ?? getTotalsByDate(data.sessions);
  const studiedMs = totals.get(date) ?? 0;
  const goalMs = minutesToMs(data.settings.dailyGoalMinutes);

  // Materi
  const completed = schedule.completedOn.get(date) ?? [];
  let lessonTask: PlanTask;
  if (completed.length > 0) {
    lessonTask = {
      id: 'lesson',
      title: `Materi: ${completed.map((r) => r.lesson.title).join(', ')}`,
      detail: 'Materi diselesaikan hari ini.',
      minutes: 10,
      href: `/materi/${completed[0].lesson.id}`,
      autoDone: true,
      manual: false,
    };
  } else if (when === 'past') {
    lessonTask = {
      id: 'lesson',
      title: 'Materi',
      detail: 'Tidak ada materi yang diselesaikan hari itu.',
      minutes: 10,
      href: '/materi',
      autoDone: false,
      manual: false,
    };
  } else {
    // Hari ini (belum selesai) = upcoming[0]; ke depan bergeser satu per hari.
    const index = offset - (schedule.doneToday ? 1 : 0);
    const ref = schedule.upcoming[index];
    lessonTask = ref
      ? {
          id: 'lesson',
          title: `Materi: ${ref.lesson.title}`,
          detail: `${ref.module.title} · tandai "Selesai" di akhir materi.`,
          minutes: 10,
          href: `/materi/${ref.lesson.id}`,
          autoDone: false,
          manual: false,
        }
      : {
          id: 'lesson',
          title: 'Ulang materi',
          detail: 'Materi baru belum tersedia — ulang materi yang perlu diulang.',
          minutes: 10,
          href: '/materi',
          autoDone: false,
          manual: true,
        };
  }

  const reviewedToday = data.reviews.some((r) => r.resolvedAt !== null && toLocalDateKey(r.resolvedAt) === date);
  const weekday = fromLocalDateKey(date).getDay();
  const speaking = SPEAKING[weekday];
  const vocab = vocabTask(date);

  const tasks: PlanTask[] = [
    lessonTask,
    {
      id: 'review',
      title: 'Review',
      detail: 'Ulang pola & frasa yang jatuh tempo di menu Latihan.',
      minutes: 5,
      href: '/latihan',
      autoDone: reviewedToday,
      manual: true,
    },
    { id: 'vocab', ...vocab, minutes: 5, autoDone: false, manual: true },
    { id: 'speaking', ...speaking, minutes: 10, autoDone: false, manual: true },
    {
      id: 'timer',
      title: `Catat ${data.settings.dailyGoalMinutes} menit belajar`,
      detail: 'Nyalakan timer di Dashboard selama belajar.',
      minutes: 0,
      href: '/#timer',
      autoDone: goalMs > 0 && studiedMs >= goalMs,
      manual: false,
    },
  ];

  return { date, when, tasks, studiedMs, goalMs };
}

export function isTaskDone(task: PlanTask, manualDone: ReadonlySet<PlanTaskId>): boolean {
  return task.autoDone || (task.manual && manualDone.has(task.id));
}

/** Jumlah tugas selesai / total untuk satu hari. */
export function dayCompletion(plan: DayPlan, manualDone: ReadonlySet<PlanTaskId>) {
  const done = plan.tasks.filter((t) => isTaskDone(t, manualDone)).length;
  return { done, total: plan.tasks.length, ratio: plan.tasks.length === 0 ? 0 : done / plan.tasks.length };
}

/**
 * Tingkat warna heatmap 0–4 (seperti GitHub): gabungan waktu belajar terhadap target dan
 * proporsi tugas kalender yang selesai — mana yang lebih tinggi.
 */
export function activityLevel(studiedMs: number, goalMs: number, taskRatio = 0): 0 | 1 | 2 | 3 | 4 {
  const timeRatio = goalMs > 0 ? studiedMs / goalMs : 0;
  const score = Math.max(timeRatio, taskRatio);
  if (score <= 0 && studiedMs <= 0) return 0;
  if (score < 0.25) return 1;
  if (score < 0.5) return 2;
  if (score < 1) return 3;
  return 4;
}
