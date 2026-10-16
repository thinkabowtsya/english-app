import { describe, expect, it } from 'vitest';
import type { LearningSession } from '@/types/learning';
import {
  getActiveDays,
  getDailyTotalMs,
  getGoalProgress,
  getRecentActivity,
  getSessionTotals,
  getStreak,
} from './progress';

const MIN = 60_000;
let seq = 0;

function session(localDate: string, minutes: number, status: LearningSession['status'] = 'completed'): LearningSession {
  seq++;
  return {
    id: `s${seq}`,
    localDate,
    startedAt: 0,
    endedAt: 0,
    targetMs: 25 * MIN,
    actualMs: minutes * MIN,
    status,
    lessonId: null,
  };
}

describe('agregasi durasi harian', () => {
  it('menjumlahkan durasi aktual per tanggal lokal', () => {
    const sessions = [
      session('2026-10-16', 20),
      session('2026-10-16', 7.5, 'stopped'),
      session('2026-10-15', 30),
    ];
    expect(getDailyTotalMs(sessions, '2026-10-16')).toBe(27.5 * MIN);
    expect(getDailyTotalMs(sessions, '2026-10-14')).toBe(0);
  });

  it('contoh target: 20 dari 30 menit → sisa 10 menit', () => {
    const goal = getGoalProgress(20 * MIN, 30);
    expect(goal).toEqual({
      goalMs: 30 * MIN,
      doneMs: 20 * MIN,
      remainingMs: 10 * MIN,
      percent: 66,
      reached: false,
    });
  });

  it('target tercapai dibatasi 100%', () => {
    const goal = getGoalProgress(45 * MIN, 30);
    expect(goal.percent).toBe(100);
    expect(goal.remainingMs).toBe(0);
    expect(goal.reached).toBe(true);
  });

  it('aktivitas 7 hari terakhir termasuk hari kosong', () => {
    const activity = getRecentActivity([session('2026-10-16', 10), session('2026-10-12', 5)], '2026-10-16');
    expect(activity.map((d) => d.date)).toEqual([
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
    expect(activity[2].totalMs).toBe(5 * MIN);
    expect(activity[6].totalMs).toBe(10 * MIN);
  });

  it('melintasi pergantian bulan dan tahun', () => {
    const activity = getRecentActivity([], '2027-01-02', 3);
    expect(activity.map((d) => d.date)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('total sesi dan sesi selesai', () => {
    const totals = getSessionTotals([session('2026-10-16', 25), session('2026-10-16', 3, 'stopped')]);
    expect(totals).toEqual({ totalMs: 28 * MIN, sessionCount: 2, completedCount: 1 });
  });
});

describe('streak', () => {
  it('nol jika belum ada sesi (membuka dashboard tidak menambah streak)', () => {
    expect(getStreak([], '2026-10-16')).toEqual({ current: 0, longest: 0, activeToday: false });
  });

  it('menghitung hari berturut-turut sampai hari ini', () => {
    const sessions = [session('2026-10-14', 10), session('2026-10-15', 10), session('2026-10-16', 10)];
    expect(getStreak(sessions, '2026-10-16')).toEqual({ current: 3, longest: 3, activeToday: true });
  });

  it('streak kemarin tetap berlaku sebelum belajar hari ini', () => {
    const sessions = [session('2026-10-14', 10), session('2026-10-15', 10)];
    expect(getStreak(sessions, '2026-10-16').current).toBe(2);
  });

  it('putus jika melewatkan satu hari', () => {
    const sessions = [session('2026-10-13', 10), session('2026-10-14', 10)];
    const streak = getStreak(sessions, '2026-10-16');
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(2);
  });

  it('hari dengan total di bawah 1 menit tidak dihitung', () => {
    const sessions = [session('2026-10-15', 10), session('2026-10-16', 0.5)];
    const streak = getStreak(sessions, '2026-10-16');
    expect(streak.activeToday).toBe(false);
    expect(streak.current).toBe(1);
    expect(getActiveDays(sessions)).toEqual(['2026-10-15']);
  });

  it('beberapa sesi pendek dalam sehari dijumlahkan', () => {
    const sessions = [session('2026-10-16', 0.5), session('2026-10-16', 0.5)];
    expect(getStreak(sessions, '2026-10-16').activeToday).toBe(true);
  });

  it('streak terpanjang di tengah riwayat', () => {
    const sessions = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-10', '2026-10-16'].map(
      (d) => session(d, 5),
    );
    expect(getStreak(sessions, '2026-10-16')).toEqual({ current: 1, longest: 4, activeToday: true });
  });
});
