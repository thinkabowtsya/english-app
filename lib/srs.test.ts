import { describe, expect, it } from 'vitest';
import { formatDue, learnedColumns, reviewColumns, srsStatus, type SrsState } from './srs';
import { summarizeVocab } from './vocab-progress';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-22T08:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

const state = (over: Partial<SrsState> = {}): SrsState => ({
  learnedAt: iso(NOW - 5 * DAY),
  step: 0,
  dueAt: iso(NOW),
  correct: 0,
  wrong: 0,
  lastReviewedAt: null,
  ...over,
});

describe('jadwal pengulangan', () => {
  it('menandai dipelajari memulai jadwal besok, membatalkan menghapus jadwal', () => {
    expect(learnedColumns(true, NOW)).toEqual({ learned_at: iso(NOW), review_step: 0, due_at: iso(NOW + DAY) });
    expect(learnedColumns(false, NOW)).toEqual({ learned_at: null, review_step: 0, due_at: null });
  });

  it('jawaban benar menaikkan step dan memperpanjang jarak ulang', () => {
    const cols = reviewColumns(state({ step: 1, correct: 2 }), true, NOW)!;
    expect(cols).toMatchObject({ review_step: 2, due_at: iso(NOW + 7 * DAY), correct_count: 3, wrong_count: 0 });
    expect(reviewColumns(state({ step: 5 }), true, NOW)!.review_step).toBe(5);
  });

  it('jawaban salah mengembalikan ke step 0 dan diulang besok', () => {
    expect(reviewColumns(state({ step: 4, wrong: 1 }), false, NOW)).toMatchObject({
      review_step: 0,
      due_at: iso(NOW + DAY),
      wrong_count: 2,
    });
  });

  it('item belum dipelajari: benar → langsung dipelajari (step 1), salah → tidak diubah', () => {
    expect(reviewColumns(null, true, NOW)).toMatchObject({ learned_at: iso(NOW), review_step: 1, due_at: iso(NOW + 3 * DAY) });
    expect(reviewColumns(null, false, NOW)).toBeNull();
    expect(reviewColumns(state({ learnedAt: null }), false, NOW)).toBeNull();
  });

  it('status dan teks jadwal', () => {
    expect(srsStatus({ step: 4, dueAt: iso(NOW - 1) }, NOW)).toBe('due');
    expect(srsStatus({ step: 3, dueAt: iso(NOW + DAY) }, NOW)).toBe('mastered');
    expect(srsStatus({ step: 1, dueAt: iso(NOW + DAY) }, NOW)).toBe('learning');
    expect(formatDue(iso(NOW - DAY), NOW)).toBe('hari ini');
    expect(formatDue(iso(NOW + DAY), NOW)).toBe('besok');
    expect(formatDue(iso(NOW + 3 * DAY), NOW)).toBe('3 hari lagi');
    expect(formatDue(null, NOW)).toBe('–');
  });
});

describe('summarizeVocab', () => {
  it('menghitung status, progres Oxford per level, dan mengurutkan yang jatuh tempo dulu', () => {
    const summary = summarizeVocab(
      {
        oxford: [
          { item: 'big', ...state({ step: 3, dueAt: iso(NOW + 10 * DAY) }) },
          { item: 'ability', ...state({ dueAt: iso(NOW - DAY) }) },
        ],
        collocation: [{ item: 'make a decision', ...state({ step: 1, dueAt: iso(NOW + DAY) }) }],
      },
      NOW,
    );
    expect(summary).toMatchObject({ learned: 3, mastered: 1, learning: 1, due: 1 });
    expect(summary.rows[0]).toMatchObject({ item: 'ability', status: 'due', source: 'oxford' });
    expect(summary.oxfordByLevel.A1.learned).toBe(1);
    expect(summary.oxfordByLevel.A2.learned).toBe(1);
    expect(summary.collocation).toEqual({ learned: 1, total: 1000 });
  });
});
