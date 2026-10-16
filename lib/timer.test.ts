import { describe, expect, it } from 'vitest';
import {
  MAX_SILENT_GAP_MS,
  createTimer,
  finalizeTimer,
  getElapsedMs,
  getRemainingMs,
  pauseTimer,
  reconcileTimer,
  resumeTimer,
  touchTimer,
} from './timer';

const MIN = 60_000;
// Tanggal lokal (tidak bergantung zona waktu mesin uji).
const T0 = new Date(2026, 9, 16, 10, 0, 0).getTime();

function newTimer(minutes = 25, now = T0) {
  return createTimer({ id: 's1', targetMs: minutes * MIN, lessonId: null, now });
}

describe('timer berbasis timestamp', () => {
  it('menghitung waktu dari selisih timestamp, bukan jumlah tick', () => {
    const t = newTimer();
    expect(getElapsedMs(t, T0)).toBe(0);
    expect(getElapsedMs(t, T0 + 90_000)).toBe(90_000);
    expect(getRemainingMs(t, T0 + 90_000)).toBe(25 * MIN - 90_000);
  });

  it('tidak menghitung waktu selama pause', () => {
    let t = newTimer();
    t = pauseTimer(t, T0 + 5 * MIN);
    expect(getElapsedMs(t, T0 + 50 * MIN)).toBe(5 * MIN);
    t = resumeTimer(t, T0 + 50 * MIN);
    expect(getElapsedMs(t, T0 + 52 * MIN)).toBe(7 * MIN);
    expect(getRemainingMs(t, T0 + 52 * MIN)).toBe(18 * MIN);
  });

  it('pause dan resume ganda tidak mengubah hasil', () => {
    let t = newTimer();
    t = pauseTimer(t, T0 + MIN);
    t = pauseTimer(t, T0 + 2 * MIN);
    expect(getElapsedMs(t, T0 + 3 * MIN)).toBe(MIN);
    t = resumeTimer(t, T0 + 4 * MIN);
    t = resumeTimer(t, T0 + 5 * MIN);
    expect(getElapsedMs(t, T0 + 6 * MIN)).toBe(3 * MIN);
  });

  it('elapsed tidak melebihi target', () => {
    const t = newTimer(5);
    expect(getElapsedMs(t, T0 + 60 * MIN)).toBe(5 * MIN);
    expect(getRemainingMs(t, T0 + 60 * MIN)).toBe(0);
  });
});

describe('reconcileTimer', () => {
  it('menyelesaikan sesi tepat saat countdown mencapai nol walau tick terlambat', () => {
    let t = newTimer(10);
    t = touchTimer(t, T0 + 10 * MIN - 1000);
    const result = reconcileTimer(t, T0 + 10 * MIN + 30_000);
    expect(result.kind).toBe('finished');
    if (result.kind !== 'finished') return;
    expect(result.session.status).toBe('completed');
    expect(result.session.actualMs).toBe(10 * MIN);
    expect(result.session.endedAt).toBe(T0 + 10 * MIN);
  });

  it('memperhitungkan pause sebelum menentukan waktu selesai', () => {
    let t = newTimer(10);
    t = pauseTimer(t, T0 + 4 * MIN);
    t = resumeTimer(t, T0 + 20 * MIN);
    const result = reconcileTimer(touchTimer(t, T0 + 26 * MIN - 1000), T0 + 26 * MIN);
    expect(result.kind).toBe('finished');
    if (result.kind !== 'finished') return;
    expect(result.session.endedAt).toBe(T0 + 26 * MIN);
    expect(result.session.actualMs).toBe(10 * MIN);
  });

  it('tetap berjalan untuk refresh singkat', () => {
    const t = touchTimer(newTimer(), T0 + 3 * MIN);
    const result = reconcileTimer(t, T0 + 3 * MIN + 4000);
    expect(result).toEqual({ kind: 'active', timer: t, changed: false });
  });

  it('tidak menghitung waktu saat browser tertutup: dijeda otomatis di lastSeenAt', () => {
    const t = touchTimer(newTimer(25), T0 + 8 * MIN);
    const reopenedAt = T0 + 8 * MIN + MAX_SILENT_GAP_MS + 60_000;
    const result = reconcileTimer(t, reopenedAt);
    expect(result.kind).toBe('active');
    if (result.kind !== 'active') return;
    expect(result.changed).toBe(true);
    expect(result.timer.status).toBe('paused');
    expect(result.timer.pauseReason).toBe('inactive');
    expect(result.timer.pausedAt).toBe(T0 + 8 * MIN);
    expect(getElapsedMs(result.timer, reopenedAt + 10 * MIN)).toBe(8 * MIN);
  });

  it('sesi yang target-nya tercapai sebelum browser ditutup tetap completed', () => {
    const t = touchTimer(newTimer(5), T0 + 6 * MIN);
    const result = reconcileTimer(t, T0 + 2 * 60 * MIN);
    expect(result.kind).toBe('finished');
    if (result.kind !== 'finished') return;
    expect(result.session.status).toBe('completed');
    expect(result.session.endedAt).toBe(T0 + 5 * MIN);
  });

  it('sesi paused yang berganti hari diakhiri sebagai interrupted', () => {
    const t = pauseTimer(newTimer(25), T0 + 7 * MIN);
    const nextDay = new Date(2026, 9, 17, 9, 0, 0).getTime();
    const result = reconcileTimer(t, nextDay);
    expect(result.kind).toBe('finished');
    if (result.kind !== 'finished') return;
    expect(result.session.status).toBe('interrupted');
    expect(result.session.actualMs).toBe(7 * MIN);
    expect(result.session.endedAt).toBe(T0 + 7 * MIN);
    expect(result.session.localDate).toBe('2026-10-16');
  });

  it('browser ditutup lalu dibuka besok: dihitung sampai lastSeenAt dan interrupted', () => {
    const t = touchTimer(newTimer(25), T0 + 12 * MIN);
    const nextDay = new Date(2026, 9, 17, 8, 0, 0).getTime();
    const result = reconcileTimer(t, nextDay);
    expect(result.kind).toBe('finished');
    if (result.kind !== 'finished') return;
    expect(result.session.status).toBe('interrupted');
    expect(result.session.actualMs).toBe(12 * MIN);
  });
});

describe('finalizeTimer', () => {
  it('berhenti lebih awal mencatat durasi aktual, bukan target', () => {
    const t = newTimer(25);
    const session = finalizeTimer(t, T0 + 7 * MIN, 'stopped');
    expect(session.status).toBe('stopped');
    expect(session.actualMs).toBe(7 * MIN);
    expect(session.targetMs).toBe(25 * MIN);
    expect(session.endedAt).toBe(T0 + 7 * MIN);
  });

  it('berhenti saat paused memakai waktu pause sebagai waktu selesai', () => {
    const t = pauseTimer(newTimer(25), T0 + 4 * MIN);
    const session = finalizeTimer(t, T0 + 30 * MIN, 'stopped');
    expect(session.actualMs).toBe(4 * MIN);
    expect(session.endedAt).toBe(T0 + 4 * MIN);
  });
});
