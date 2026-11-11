import { describe, expect, it } from 'vitest';
import { COLLOCATION_GROUPS, COLLOCATIONS } from '@/data/collocations/items';
import {
  parseAiRecallQuestions,
  pickRecallItems,
  questionTypeFor,
  recallSessionSchema,
  scoreRecall,
  type RecallPoolItem,
} from './recall';

const ox = (item: string, learned = true, due = false): RecallPoolItem => ({ item, source: 'oxford', learned, due, hint: '' });
const co = (item: string, learned = true, due = false): RecallPoolItem => ({ item, source: 'collocation', learned, due, hint: '' });

describe('daftar collocation', () => {
  it('berisi 1.000 item unik di semua kelompok', () => {
    expect(COLLOCATIONS).toHaveLength(1000);
    expect(new Set(COLLOCATIONS.map((c) => c.text.toLowerCase())).size).toBe(1000);
    for (const g of COLLOCATION_GROUPS) expect(COLLOCATIONS.some((c) => c.group === g.id)).toBe(true);
  });
});

describe('pickRecallItems', () => {
  it('mengambil yang jatuh tempo dulu, lalu yang sudah dipelajari, lalu cadangan, tanpa duplikat', () => {
    const due = [ox('cup', true, true)];
    const learned = [ox('big'), co('make a decision')];
    const fallback = [ox('big', false), ox('small', false), ox('house', false), co('heavy rain', false)];
    const picked = pickRecallItems([due, learned, fallback], 4, 1);
    expect(picked).toHaveLength(4);
    expect(picked[0].item).toBe('cup');
    expect(picked.slice(1, 3).every((p) => p.learned && !p.due)).toBe(true);
    expect(picked.filter((p) => p.item === 'big')).toHaveLength(1);
  });

  it('menyelang-seling sumber oxford dan collocation', () => {
    const picked = pickRecallItems([[ox('a'), ox('b'), co('c d'), co('e f')]], 4, 3);
    expect(picked.map((p) => p.source)).toEqual(['oxford', 'collocation', 'oxford', 'collocation']);
  });
});

describe('parseAiRecallQuestions', () => {
  const pool = [ox('big'), ox('house')];
  it('membuang soal rusak, memvalidasi soal isian, dan menjaga kunci jawaban setelah opsi diacak', () => {
    const raw = {
      questions: [
        { item: 'big', prompt: 'Apa arti "big"?', options: ['besar', 'kecil', 'cepat', 'lambat'], answer: 0, explanation: 'big = besar' },
        { item: 'house', prompt: 'Pilih kata yang tepat', sentence: 'I live in a house.', options: ['house', 'eat', 'run', 'blue'], answer: 0 },
      ],
    };
    expect(questionTypeFor(pool[1], 1)).toBe('fill');
    const questions = parseAiRecallQuestions(raw, pool, 5);
    // Soal kedua tipe "fill" tanpa "___" dibuang.
    expect(questions).toHaveLength(1);
    expect(questions[0].options[questions[0].answer]).toBe('besar');
    expect(questions[0]).toMatchObject({ item: 'big', type: 'meaning', sentence: '', learned: true });
  });

  it('menolak opsi ganda', () => {
    const raw = { questions: [{ item: 'big', prompt: 'p', options: ['a', 'A', 'b', 'c'], answer: 0 }] };
    expect(parseAiRecallQuestions(raw, pool, 1)).toEqual([]);
  });
});

describe('sesi recall', () => {
  it('menghitung skor dan mewajibkan jawaban saat disimpan', () => {
    expect(scoreRecall([{ answer: 1, chosen: 1 }, { answer: 2, chosen: 0 }])).toBe(1);
    const q = { item: 'big', source: 'oxford', type: 'meaning', prompt: 'p', sentence: '', options: ['a', 'b', 'c', 'd'], answer: 0, explanation: '', learned: true };
    expect(recallSessionSchema.safeParse({ source: 'mix', questions: [{ ...q, chosen: 2 }] }).success).toBe(true);
    expect(recallSessionSchema.safeParse({ source: 'mix', questions: [q] }).success).toBe(false);
  });
});
