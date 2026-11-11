import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHECKS_KEY,
  applyOp,
  checksToOps,
  getDailyChecks,
  loadDailyChecks,
  mergePending,
  resetDailyChecks,
  rowsToChecks,
  sanitizeChecks,
  toggleDailyCheck,
  type CheckOp,
  type ChecksRemote,
} from './daily-checks';

/** Supabase tiruan: menyimpan baris di memori, bisa dibuat gagal (offline). */
function fakeRemote(initial: { date: string; id: CheckOp['id'] }[] = []) {
  const rows = new Map(initial.map((r) => [`${r.date}|${r.id}`, r]));
  const state = { offline: false, applied: [] as CheckOp[] };
  const api: ChecksRemote = {
    async fetch() {
      if (state.offline) throw new Error('offline');
      return [...rows.values()];
    },
    async apply(ops) {
      if (state.offline) throw new Error('offline');
      for (const o of ops) {
        state.applied.push(o);
        if (o.checked) rows.set(`${o.date}|${o.id}`, { date: o.date, id: o.id });
        else rows.delete(`${o.date}|${o.id}`);
      }
    },
  };
  return { api, rows, state };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

describe('fungsi murni centang kalender', () => {
  it('sanitize membuang tanggal & tugas tidak valid', () => {
    expect(sanitizeChecks({ '2026-11-11': ['vocab', 'x', 'vocab'], bad: ['vocab'], '2026-11-12': 'vocab' })).toEqual({
      '2026-11-11': ['vocab'],
    });
  });

  it('applyOp menambah & menghapus; tanggal kosong dibuang', () => {
    const a = applyOp({}, { date: '2026-11-11', id: 'vocab', checked: true });
    expect(a).toEqual({ '2026-11-11': ['vocab'] });
    expect(applyOp(a, { date: '2026-11-11', id: 'vocab', checked: false })).toEqual({});
  });

  it('antrean menyimpan perubahan terakhir per tanggal+tugas', () => {
    let q: CheckOp[] = [];
    q = mergePending(q, { date: '2026-11-11', id: 'vocab', checked: true });
    q = mergePending(q, { date: '2026-11-11', id: 'speaking', checked: true });
    q = mergePending(q, { date: '2026-11-11', id: 'vocab', checked: false });
    expect(q).toEqual([
      { date: '2026-11-11', id: 'speaking', checked: true },
      { date: '2026-11-11', id: 'vocab', checked: false },
    ]);
  });

  it('baris cloud ↔ peta centang', () => {
    const checks = rowsToChecks([
      { date: '2026-11-10', id: 'review' },
      { date: '2026-11-11', id: 'vocab' },
    ]);
    expect(checks).toEqual({ '2026-11-10': ['review'], '2026-11-11': ['vocab'] });
    expect(checksToOps(checks)).toHaveLength(2);
  });
});

describe('sinkron ke Supabase', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage(), addEventListener: () => {}, removeEventListener: () => {} });
    resetDailyChecks();
  });

  it('memuat centang dari cloud dan menyimpan centang baru ke cloud', async () => {
    const { api, rows } = fakeRemote([{ date: '2026-11-10', id: 'review' }]);
    await loadDailyChecks('u1', api, '2025-01-01');
    expect(getDailyChecks()).toEqual({ '2026-11-10': ['review'] });

    toggleDailyCheck('2026-11-11', 'vocab');
    await flush();
    expect(rows.has('2026-11-11|vocab')).toBe(true);

    toggleDailyCheck('2026-11-11', 'vocab');
    await flush();
    expect(rows.has('2026-11-11|vocab')).toBe(false);
  });

  it('centang tamu lama dipindahkan ke akun satu kali', async () => {
    window.localStorage.setItem(CHECKS_KEY, JSON.stringify({ '2026-11-09': ['speaking'] }));
    const { api, rows, state } = fakeRemote();
    await loadDailyChecks('u1', api, '2025-01-01');
    expect(rows.has('2026-11-09|speaking')).toBe(true);
    expect(getDailyChecks()).toEqual({ '2026-11-09': ['speaking'] });

    state.applied = [];
    await loadDailyChecks('u1', api, '2025-01-01');
    expect(state.applied).toHaveLength(0);
  });

  it('offline: centang tetap terlihat, lalu terkirim saat dimuat ulang', async () => {
    const { api, rows, state } = fakeRemote();
    await loadDailyChecks('u1', api, '2025-01-01');
    state.offline = true;
    toggleDailyCheck('2026-11-11', 'speaking');
    await flush();
    expect(getDailyChecks()).toEqual({ '2026-11-11': ['speaking'] });
    expect(rows.size).toBe(0);

    state.offline = false;
    await loadDailyChecks('u1', api, '2025-01-01');
    expect(rows.has('2026-11-11|speaking')).toBe(true);
    expect(getDailyChecks()).toEqual({ '2026-11-11': ['speaking'] });
  });

  it('centang yang dibatalkan di perangkat lain ikut hilang saat dimuat', async () => {
    const { api, rows } = fakeRemote([{ date: '2026-11-10', id: 'vocab' }]);
    await loadDailyChecks('u1', api, '2025-01-01');
    rows.delete('2026-11-10|vocab');
    await loadDailyChecks('u1', api, '2025-01-01');
    expect(getDailyChecks()).toEqual({});
  });
});
