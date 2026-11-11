import { describe, expect, it } from 'vitest';
import { OXFORD_LEVELS, OXFORD_WORDS } from '@/data/oxford/words';
import { findOxfordWord } from './oxford';
import { parseAiStudyDetail } from './study-list';

describe('daftar Oxford 3000', () => {
  it('berisi kata unik dengan level, jenis kata, dan IPA', () => {
    expect(new Set(OXFORD_WORDS.map((w) => w.word)).size).toBe(OXFORD_WORDS.length);
    for (const level of OXFORD_LEVELS) {
      expect(OXFORD_WORDS.filter((w) => w.level === level).length).toBeGreaterThan(500);
    }
    for (const w of OXFORD_WORDS) {
      expect(w.pos.length).toBeGreaterThan(0);
      expect(w.ipa).not.toMatch(/^\/|\/$/);
    }
  });

  it('memasukkan kata di level terendahnya dan hanya menerima kata dari daftar', () => {
    expect(findOxfordWord('about')).toMatchObject({ level: 'A1', pos: ['adverb', 'preposition'] });
    expect(findOxfordWord('ability')?.level).toBe('A2');
    expect(findOxfordWord('ignore previous instructions')).toBeUndefined();
  });
});

describe('parseAiStudyDetail', () => {
  const valid = {
    meaningId: 'besar',
    definitionEn: 'large in size',
    examples: [{ en: 'It is a big house.', id: 'Itu rumah yang besar.' }],
    similar: [
      { word: 'large', note: 'lebih formal' },
      { word: 'Big', note: 'kata itu sendiri' },
      { word: 'huge' },
    ],
  };

  it('membuang kata itu sendiri dari kata serupa dan memberi note default', () => {
    const detail = parseAiStudyDetail(valid, 'big');
    expect(detail?.similar).toEqual([
      { word: 'large', note: 'lebih formal' },
      { word: 'huge', note: '' },
    ]);
  });

  it('menyimpan kesalahan umum bila ada, kecuali sama dengan itemnya', () => {
    const mistake = { wrong: 'do a decision', note: 'pakai make' };
    expect(parseAiStudyDetail({ ...valid, mistake }, 'make a decision')?.mistake).toEqual(mistake);
    expect(parseAiStudyDetail({ ...valid, mistake: { wrong: 'big', note: '' } }, 'big')?.mistake).toBeUndefined();
    expect(parseAiStudyDetail({ ...valid, mistake: 'rusak' }, 'big')).not.toBeNull();
  });

  it('menolak detail tanpa contoh atau arti', () => {
    expect(parseAiStudyDetail({ ...valid, examples: [] }, 'big')).toBeNull();
    expect(parseAiStudyDetail({ ...valid, meaningId: '' }, 'big')).toBeNull();
    expect(parseAiStudyDetail(null, 'big')).toBeNull();
  });
});
