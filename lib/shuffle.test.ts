import { describe, expect, it } from 'vitest';
import { pickRound, seededShuffle } from './shuffle';

describe('seededShuffle', () => {
  it('deterministik untuk benih yang sama dan tidak kehilangan elemen', () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6], 42);
    expect(seededShuffle([1, 2, 3, 4, 5, 6], 42)).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('benih berbeda umumnya menghasilkan urutan berbeda', () => {
    expect(seededShuffle([...Array(10).keys()], 1)).not.toEqual(seededShuffle([...Array(10).keys()], 2));
  });
});

describe('pickRound', () => {
  it('putaran berurutan menampilkan soal berbeda sampai bank habis', () => {
    const r0 = pickRound(8, 4, 7, 0);
    const r1 = pickRound(8, 4, 7, 1);
    expect(r0).toHaveLength(4);
    expect(new Set([...r0, ...r1]).size).toBe(8);
    expect(pickRound(8, 4, 7, 2)).toEqual(r0);
  });

  it('putaran terakhir yang kurang dilengkapi tanpa duplikat', () => {
    const last = pickRound(7, 3, 3, 2);
    expect(last).toHaveLength(3);
    expect(new Set(last).size).toBe(3);
  });

  it('bank lebih kecil dari jumlah tampil → semua soal ditampilkan', () => {
    expect(pickRound(2, 4, 5, 0).sort()).toEqual([0, 1]);
  });
});
