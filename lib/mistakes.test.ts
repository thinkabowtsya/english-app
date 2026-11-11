import { describe, expect, it } from 'vitest';
import { mistakesFromCall, mistakesFromPractice } from './mistake-extract';
import { groupMistakes, isMistakePattern, type MistakeEntry } from './mistakes';
import type { PracticeItem } from './practice';

describe('mistakesFromCall', () => {
  it('mengambil kesalahan dari koreksi ucapan pengguna saja, tanpa tanda baca/kapital', () => {
    const drafts = mistakesFromCall('call-1', [
      { role: 'ai', text: 'What did you do?', correction: { mistakes: [{ original: 'x', correction: 'y' }] } },
      {
        role: 'user',
        text: 'yesterday i go to office',
        correction: {
          mistakes: [
            { type: 'grammar', original: 'i go', correction: 'I went', explanation: 'past', pattern: 'past-tense' },
            { type: 'grammar', original: 'to office', correction: 'to the office', pattern: 'article' },
            { type: 'punctuation', original: 'office', correction: 'office.' },
            { type: 'spelling', original: 'i', correction: 'I' },
          ],
        },
      },
      { role: 'user', text: 'ok', correction: null },
    ]);
    expect(drafts.map((d) => [d.refKey, d.pattern, d.wrong, d.correct])).toEqual([
      ['1:0', 'past-tense', 'i go', 'I went'],
      ['1:1', 'article', 'to office', 'to the office'],
    ]);
    expect(drafts[0]).toMatchObject({ source: 'call', sourceRef: 'call-1', context: 'yesterday i go to office' });
  });
});

describe('mistakesFromPractice', () => {
  const item = (over: Partial<PracticeItem>): PracticeItem => ({
    type: 'fill',
    prompt: 'p',
    text: 'He ___ bugs.',
    answer: 'fixes',
    explanation: 'he + -es',
    pattern: 'verb-s',
    response: 'fix',
    correct: false,
    ...over,
  });

  it('jawaban salah jadi kalimat utuh salah vs benar; jawaban benar & kosakata murni dilewati', () => {
    const items = [
      item({}),
      item({ correct: true, response: 'fixes' }),
      item({ type: 'fix', text: 'She dont know.', answer: "She doesn't know.", response: 'She dont knows.', corrected: "She doesn't know.", pattern: 'do-does-did' }),
      item({ type: 'translate', text: 'Saya lapar.', answer: 'I am hungry.', response: '', pattern: 'be-verb' }),
    ];
    const drafts = mistakesFromPractice('ps-1', 'grammar', items);
    expect(drafts.map((d) => [d.refKey, d.pattern, d.wrong, d.correct])).toEqual([
      ['0', 'verb-s', 'He fix bugs.', 'He fixes bugs.'],
      ['2', 'do-does-did', 'She dont knows.', "She doesn't know."],
    ]);
    expect(mistakesFromPractice('ps-2', 'vocab-type', items)).toEqual([]);
  });
});

describe('groupMistakes', () => {
  const entry = (id: string, pattern: string, status: MistakeEntry['status'], createdAt: string): MistakeEntry => ({
    id,
    source: 'call',
    pattern: pattern as MistakeEntry['pattern'],
    wrong: 'w',
    correct: 'c',
    explanation: null,
    context: null,
    status,
    createdAt,
  });

  it('mengelompokkan per pola, terbanyak terbuka di atas, mengabaikan yang dibuang', () => {
    const groups = groupMistakes([
      entry('1', 'article', 'open', '2026-10-01'),
      entry('2', 'verb-s', 'open', '2026-10-02'),
      entry('3', 'verb-s', 'open', '2026-10-03'),
      entry('4', 'verb-s', 'resolved', '2026-09-01'),
      entry('5', 'preposition', 'dismissed', '2026-10-04'),
      entry('6', 'tidak-ada', 'open', '2026-10-05'),
    ]);
    expect(groups.map((g) => [g.id, g.open, g.resolved])).toEqual([
      ['verb-s', 2, 1],
      ['other', 1, 0],
      ['article', 1, 0],
    ]);
    expect(groups[0].entries[0].id).toBe('3');
    expect(isMistakePattern('verb-s')).toBe(true);
    expect(isMistakePattern('nope')).toBe(false);
  });
});
