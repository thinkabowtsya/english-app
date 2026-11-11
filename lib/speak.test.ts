import { describe, expect, it } from 'vitest';
import { SPEAK_TOPICS } from '@/data/speak/topics';
import { scoreSpoken, speakFeedbackSchema, speakTurnSchema, validGoals } from './speak';

describe('scoreSpoken', () => {
  it('ucapan sama persis (tanpa tanda baca & huruf besar) = 100', () => {
    const r = scoreSpoken('Nice to meet you.', 'nice to meet you');
    expect(r.score).toBe(100);
    expect(r.words.every((w) => w.ok)).toBe(true);
  });

  it('singkatan dan bentuk panjang dianggap sama', () => {
    expect(scoreSpoken("I'm from Bandung.", 'I am from Bandung').score).toBe(100);
    expect(scoreSpoken('I am ready.', "I'm ready").score).toBe(100);
  });

  it('kata yang terlewat ditandai dan menurunkan skor', () => {
    const r = scoreSpoken('I go to the office by motorbike.', 'I go office by motorbike');
    expect(r.score).toBe(71);
    expect(r.words.filter((w) => !w.ok).map((w) => w.word)).toEqual(['to', 'the']);
  });

  it('ucapan kosong = 0', () => {
    expect(scoreSpoken('Thank you.', '').score).toBe(0);
  });
});

describe('skema respons AI', () => {
  it('giliran role-play: goals & tip opsional', () => {
    const t = speakTurnSchema.parse({ reply: 'Nice to meet you!', goalsMet: ['name'], tip: null });
    expect(t.goalsMet).toEqual(['name']);
    expect(speakTurnSchema.parse({ reply: 'Hi' }).goalsMet).toEqual([]);
  });

  it('umpan balik: nilai rusak diganti 0, perbaikan maksimal 4', () => {
    const f = speakFeedbackSchema.parse({ score: 80, fluency: 'x', summary: 'Bagus', improvements: [] });
    expect(f.fluency).toBe(0);
    expect(f.score).toBe(80);
  });

  it('hanya ID misi yang ada di topik yang diterima', () => {
    expect(validGoals(['name', 'fake', 'name', 'job'], ['name', 'job', 'origin'])).toEqual(['name', 'job']);
  });
});

describe('data topik', () => {
  it('ID unik, tiap topik punya 6 frasa dan 3–4 misi dengan ID unik', () => {
    expect(new Set(SPEAK_TOPICS.map((t) => t.id)).size).toBe(SPEAK_TOPICS.length);
    for (const t of SPEAK_TOPICS) {
      expect(t.phrases, t.id).toHaveLength(6);
      expect(t.goals.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.goals.length, t.id).toBeLessThanOrEqual(4);
      expect(new Set(t.goals.map((g) => g.id)).size, t.id).toBe(t.goals.length);
    }
  });
});
