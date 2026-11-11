import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '@/data/curriculum';
import { flattenLessons } from '@/lib/curriculum';
import { fromLocalDateKey } from '@/lib/date';
import { DEFAULT_SETTINGS } from '@/lib/storage/schema';
import type { AppData, LessonProgress } from '@/types/learning';
import { activityLevel, buildDayPlan, dayCompletion, scheduleLessons, type PlanTaskId } from './daily-plan';

const MIN = 60_000;
const refs = flattenLessons(CURRICULUM);
const TODAY = '2026-11-11';

function completedOn(lessonId: string, date: string): LessonProgress {
  const at = fromLocalDateKey(date).getTime() + 10 * 60 * MIN;
  return { lessonId, moduleId: lessonId.replace(/-l\d+$/, ''), status: 'completed', timeSpentMs: 0, lastScore: null, lastStudiedAt: at, completedAt: at };
}

function data(partial: Partial<AppData> = {}): Pick<AppData, 'lessons' | 'sessions' | 'reviews' | 'settings'> {
  return { lessons: {}, sessions: [], reviews: [], settings: { ...DEFAULT_SETTINGS, dailyGoalMinutes: 30 }, ...partial };
}

const titleOf = (id: string) => refs.find((r) => r.lesson.id === id)!.lesson.title;

describe('rencana harian', () => {
  it('total ±30 menit dengan 5 tugas', () => {
    const plan = buildDayPlan({ date: TODAY, todayKey: TODAY, refs, data: data() });
    expect(plan.tasks.map((t) => t.id)).toEqual(['lesson', 'review', 'vocab', 'speaking', 'timer']);
    expect(plan.tasks.reduce((s, t) => s + t.minutes, 0)).toBe(30);
    expect(plan.when).toBe('today');
  });

  it('materi hari ini = materi pertama yang belum selesai; besok = berikutnya (berurutan)', () => {
    const d = data({ lessons: { 'level-1-m1-l1': completedOn('level-1-m1-l1', '2026-11-09') } });
    const today = buildDayPlan({ date: TODAY, todayKey: TODAY, refs, data: d });
    const tomorrow = buildDayPlan({ date: '2026-11-12', todayKey: TODAY, refs, data: d });
    expect(today.tasks[0].title).toBe(`Materi: ${titleOf('level-1-m1-l2')}`);
    expect(tomorrow.tasks[0].title).toBe(`Materi: ${titleOf('level-1-m1-l3')}`);
  });

  it('materi yang selesai hari ini tercentang otomatis, dan besok lanjut ke materi berikutnya', () => {
    const d = data({ lessons: { 'level-1-m1-l1': completedOn('level-1-m1-l1', TODAY) } });
    const today = buildDayPlan({ date: TODAY, todayKey: TODAY, refs, data: d });
    const tomorrow = buildDayPlan({ date: '2026-11-12', todayKey: TODAY, refs, data: d });
    expect(today.tasks[0].autoDone).toBe(true);
    expect(tomorrow.tasks[0].title).toBe(`Materi: ${titleOf('level-1-m1-l2')}`);
  });

  it('hari lalu menampilkan materi yang benar-benar diselesaikan', () => {
    const d = data({ lessons: { 'level-1-m1-l1': completedOn('level-1-m1-l1', '2026-11-09') } });
    const past = buildDayPlan({ date: '2026-11-09', todayKey: TODAY, refs, data: d });
    const empty = buildDayPlan({ date: '2026-11-10', todayKey: TODAY, refs, data: d });
    expect(past.when).toBe('past');
    expect(past.tasks[0].autoDone).toBe(true);
    expect(empty.tasks[0].autoDone).toBe(false);
    expect(empty.tasks[0].detail).toMatch(/Tidak ada materi/);
  });

  it('target waktu tercentang otomatis dari sesi timer', () => {
    const session = (minutes: number) => ({
      id: `s${minutes}`, localDate: TODAY, startedAt: 0, endedAt: 0, targetMs: 30 * MIN, actualMs: minutes * MIN,
      status: 'completed' as const, lessonId: null,
    });
    const under = buildDayPlan({ date: TODAY, todayKey: TODAY, refs, data: data({ sessions: [session(20)] }) });
    const over = buildDayPlan({ date: TODAY, todayKey: TODAY, refs, data: data({ sessions: [session(20), session(12)] }) });
    expect(under.tasks.find((t) => t.id === 'timer')!.autoDone).toBe(false);
    expect(over.tasks.find((t) => t.id === 'timer')!.autoDone).toBe(true);
    expect(over.studiedMs).toBe(32 * MIN);
  });

  it('centang manual dihitung untuk tugas manual saja', () => {
    const plan = buildDayPlan({ date: TODAY, todayKey: TODAY, refs, data: data() });
    const manual = new Set<PlanTaskId>(['vocab', 'speaking', 'timer']);
    expect(dayCompletion(plan, manual)).toEqual({ done: 2, total: 5, ratio: 0.4 });
  });

  it('jadwal materi hanya berisi materi siap yang belum selesai, berurutan', () => {
    const s = scheduleLessons(refs, data(), TODAY);
    expect(s.upcoming[0].lesson.id).toBe('level-1-m1-l1');
    const indexes = s.upcoming.map((r) => r.index);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(s.upcoming.every((r) => r.lesson.contentStatus === 'ready')).toBe(true);
  });
});

describe('tingkat warna heatmap', () => {
  it('makin lama belajar makin tinggi (0–4)', () => {
    const goal = 30 * MIN;
    expect(activityLevel(0, goal)).toBe(0);
    expect(activityLevel(5 * MIN, goal)).toBe(1);
    expect(activityLevel(10 * MIN, goal)).toBe(2);
    expect(activityLevel(20 * MIN, goal)).toBe(3);
    expect(activityLevel(30 * MIN, goal)).toBe(4);
    expect(activityLevel(90 * MIN, goal)).toBe(4);
  });

  it('tugas kalender yang selesai ikut menaikkan warna walau timer tidak dipakai', () => {
    expect(activityLevel(0, 30 * MIN, 0.6)).toBe(3);
    expect(activityLevel(0, 30 * MIN, 1)).toBe(4);
  });
});
