import { describe, expect, it } from 'vitest';
import { buildCollocations, datamuseWords, mergeSimilar, planForCollocation, planForWord } from './datamuse';

const rows = (...words: string[]) => words.map((word, i) => ({ word, score: 1000 - i }));

describe('datamuseWords', () => {
  it('membuang kata fungsi, kata itu sendiri, duplikat, dan simbol', () => {
    const raw = rows('to', '.', 'making', 'of', 'Decision', 'makers', 'making', 'the', 'u.s.');
    // "to" dipertahankan: berguna untuk frasa seperti "decision to", "need to".
    expect(datamuseWords(raw, 'decision')).toEqual(['to', 'making', 'of', 'makers']);
  });

  it('respons yang bukan array menghasilkan daftar kosong', () => {
    expect(datamuseWords({ error: 'x' }, 'word')).toEqual([]);
    expect(datamuseWords(null, 'word')).toEqual([]);
  });

  it('preposition setelah verb tetap dipakai', () => {
    expect(datamuseWords(rows('on', 'upon', '.', 'for', 'largely'), 'depend')).toEqual(['on', 'upon', 'for', 'largely']);
  });
});

describe('mergeSimilar', () => {
  it('sinonim lebih dulu, lalu arti mirip; tanpa duplikat, frasa, atau kata yang sudah dijelaskan AI', () => {
    const merged = mergeSimilar(['determination', 'conclusion'], ['conclusion', 'choice', 'make up', 'option'], ['choice']);
    expect(merged).toEqual(['determination', 'conclusion', 'option']);
  });

  it('dibatasi 8 kata', () => {
    const many = Array.from({ length: 20 }, (_, i) => `word${String.fromCharCode(97 + i)}`);
    expect(mergeSimilar(many, [])).toHaveLength(8);
  });
});

describe('rencana query', () => {
  it('noun → adjective yang sering menjelaskannya (final decision)', () => {
    const plan = planForWord('decision', ['noun']);
    expect(plan.similarOf).toBe('decision');
    expect(plan.collocations.map((q) => q.relation)).toEqual(['rel_jjb']);
    expect(plan.collocations[0].phrase('final')).toBe('final decision');
  });

  it('adjective → noun yang dijelaskan; verb → kata setelahnya', () => {
    expect(planForWord('heavy', ['adjective']).collocations[0].phrase('rain')).toBe('heavy rain');
    const verb = planForWord('depend', ['verb']);
    expect(verb.collocations.map((q) => q.relation)).toEqual(['rel_bga']);
    expect(verb.collocations[0].phrase('on')).toBe('depend on');
  });

  it('kata tanpa noun/adjective/verb tetap punya satu query', () => {
    expect(planForWord('about', ['adverb', 'preposition']).collocations).toHaveLength(1);
  });

  it('collocation memakai kata intinya sesuai pola, tanpa kata serupa', () => {
    const vn = planForCollocation('make a decision', 'verb-noun');
    expect(vn.similarOf).toBeNull();
    expect(vn.collocations[0].word).toBe('decision');
    expect(planForCollocation('depend on', 'verb-prep').collocations[0].word).toBe('depend');
    const advAdj = planForCollocation('highly recommended', 'adv-adj').collocations[0];
    expect(advAdj.relation).toBe('rel_bgb');
    expect(advAdj.phrase('strongly')).toBe('strongly recommended');
  });
});

describe('buildCollocations', () => {
  it('kelompok kosong dibuang dan frasa dibatasi', () => {
    const plan = planForWord('decision', ['noun', 'verb']);
    const groups = buildCollocations([
      { query: plan.collocations[0], words: ['final', 'important'] },
      { query: plan.collocations[1], words: [] },
    ]);
    expect(groups).toEqual([{ label: 'Sifat + decision', phrases: ['final decision', 'important decision'] }]);
  });
});
