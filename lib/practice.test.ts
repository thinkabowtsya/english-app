import { describe, expect, it } from 'vitest';
import {
  arrangeTokens,
  checkLocally,
  dictationSimilarity,
  parsePracticeItems,
  practiceScore,
  practiceSessionSchema,
  type PracticeItem,
} from './practice';

const base = { prompt: 'p', explanation: '' };

describe('parsePracticeItems', () => {
  it('memvalidasi tiap tipe soal dan membuang yang rusak', () => {
    const raw = {
      items: [
        { ...base, type: 'choice', text: '___ he work here?', options: ['Do', 'Does', 'Is', 'Are'], answer: 'Does' },
        { ...base, type: 'choice', text: 'x', options: ['a', 'A', 'b', 'c'], answer: 'a' }, // opsi ganda
        { ...base, type: 'choice', text: 'x', options: ['a', 'b', 'c', 'd'], answer: 'e' }, // kunci di luar opsi
        { ...base, type: 'fill', text: 'He ___ bugs.', answer: 'fixes' },
        { ...base, type: 'fill', text: 'He fixes bugs.', answer: 'fixes' }, // tanpa ___
        { ...base, type: 'fix', text: 'She don’t know.', answer: "She doesn't know." },
        { ...base, type: 'fix', text: 'She knows.', answer: 'She knows' }, // tidak ada yang salah
        { ...base, type: 'arrange', text: 'Saya developer.', answer: 'I am a developer.' },
        { ...base, type: 'arrange', text: 'x', answer: 'Hi' }, // terlalu pendek
        { ...base, type: 'translate', text: 'Saya lapar.', answer: 'I am hungry.' },
        { ...base, type: 'dictation', text: 'bocoran', answer: 'I usually start work at nine.' },
        { ...base, type: 'write', text: 'arti', answer: 'I made a decision.' }, // tanpa vocab
        { ...base, type: 'unknown', answer: 'x' },
      ],
    };
    const items = parsePracticeItems(raw, 3, ['choice', 'fill', 'fix', 'arrange', 'translate', 'dictation', 'write']);
    expect(items.map((i) => i.type)).toEqual(['choice', 'fill', 'fix', 'arrange', 'translate', 'dictation']);
    expect(items[0].options).toHaveLength(4);
    expect(items[0].options).toContain('Does');
    expect([...items[3].tokens!].sort()).toEqual(['I', 'a', 'am', 'developer']);
    expect(items[5].text).toBe('');
  });

  it('membuang tipe yang tidak diminta dan petunjuk susun kalimat yang membocorkan jawaban', () => {
    const items = parsePracticeItems(
      {
        items: [
          { ...base, type: 'fill', text: 'He ___ bugs.', answer: 'fixes' },
          { ...base, type: 'arrange', text: '(developer / a / am / I)', answer: 'I am a developer' },
        ],
      },
      1,
      ['arrange'],
    );
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('');
  });
});

describe('arrangeTokens', () => {
  it('mengacak tanpa tanda baca akhir dan tidak sama dengan urutan jawaban', () => {
    const tokens = arrangeTokens('The code works well.', 1);
    expect([...tokens].sort()).toEqual(['The', 'code', 'well', 'works']);
    expect(tokens.join(' ')).not.toBe('The code works well');
  });
});

describe('pemeriksaan jawaban', () => {
  const item = (over: Partial<PracticeItem>): PracticeItem => ({ type: 'fill', prompt: 'p', text: 'x ___', answer: 'does not', explanation: '', ...over });

  it('isian: kapital, tanda baca, dan bentuk singkat diabaikan', () => {
    expect(checkLocally(item({}), "Doesn't")).toEqual({ correct: true });
    expect(checkLocally(item({}), 'do')).toEqual({ correct: false });
    expect(checkLocally(item({}), '  ')).toMatchObject({ correct: false });
  });

  it('susun kalimat: urutan kata yang sama dianggap benar walau tanpa titik/kapital', () => {
    expect(checkLocally(item({ type: 'arrange', answer: 'I am a developer.' }), 'i am a developer')).toEqual({ correct: true });
    expect(checkLocally(item({ type: 'arrange', answer: 'I am a developer.' }), 'a developer I am')).toEqual({ correct: false });
  });

  it('jawaban bebas yang tidak cocok kunci diserahkan ke AI (null)', () => {
    expect(checkLocally(item({ type: 'translate', answer: 'I am hungry.' }), "I'm hungry")).toEqual({ correct: true });
    expect(checkLocally(item({ type: 'translate', answer: 'I am hungry.' }), 'I feel hungry')).toBeNull();
    expect(checkLocally(item({ type: 'write', answer: 'x' }), 'anything')).toBeNull();
  });

  it('dikte memakai kemiripan kata', () => {
    expect(dictationSimilarity('i usually start work at nine', 'I usually start work at nine.')).toBe(1);
    expect(dictationSimilarity('I start work at nine', 'I usually start work at nine.')).toBeCloseTo(5 / 6);
    const d = item({ type: 'dictation', answer: 'I usually start work at nine o clock every day' });
    expect(checkLocally(d, 'I usually start work at nine o clock every day')?.correct).toBe(true);
    expect(checkLocally(d, 'I start at nine')?.correct).toBe(false);
  });
});

describe('sesi latihan', () => {
  it('menghitung skor dan memvalidasi sesi yang disimpan', () => {
    expect(practiceScore([{ correct: true }, { correct: false }, { correct: true }])).toEqual({ correct: 2, score: 67 });
    const it1 = { type: 'fill', prompt: 'p', text: 'a ___', answer: 'b', explanation: '', response: 'b', correct: true };
    expect(practiceSessionSchema.safeParse({ kind: 'grammar', title: 'Simple Present', items: [it1] }).success).toBe(true);
    expect(practiceSessionSchema.safeParse({ kind: 'grammar', title: 'x', items: [{ ...it1, correct: undefined }] }).success).toBe(false);
    expect(practiceSessionSchema.safeParse({ kind: 'nope', title: 'x', items: [it1] }).success).toBe(false);
  });
});
