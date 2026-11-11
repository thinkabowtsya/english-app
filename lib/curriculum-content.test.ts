import { describe, expect, it } from 'vitest';
import { CURRICULUM } from '@/data/curriculum';
import { flattenLessons } from './curriculum';
import { getLessonContent } from './curriculum-content';

describe('isi materi Modul 1', () => {
  const lessons = flattenLessons(CURRICULUM).filter((r) => r.module.id === 'level-1-m1');

  it('setiap materi Modul 1 punya isi', () => {
    expect(lessons).toHaveLength(8);
    for (const ref of lessons) expect(getLessonContent(ref.lesson.id)).not.toBeNull();
  });

  it('setiap materi punya bank soal isi kosong, susun kalimat, dan produksi yang bisa diacak', () => {
    for (const ref of lessons) {
      const acts = getLessonContent(ref.lesson.id)!.activities ?? [];
      const byTitle = (t: string) => acts.find((a) => a.title === t);
      for (const title of ['Isi bagian kosong', 'Susun kalimat', 'Latihan produksi kalimat']) {
        const a = byTitle(title);
        expect(a, `${ref.lesson.id}: ${title}`).toBeDefined();
        expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
      }
      expect(byTitle('Latihan produksi kalimat')!.open).toBe(true);
      expect(new Set(acts.map((a) => a.id)).size).toBe(acts.length);
    }
  });

  it('materi yang tidak ada tidak punya isi', () => {
    expect(getLessonContent('level-1-m3-l1')).toBeNull();
  });
});

describe('isi materi Modul 2', () => {
  const lessons = flattenLessons(CURRICULUM).filter((r) => r.module.id === 'level-1-m2');

  it('semua 10 materi Modul 2 sudah siap', () => {
    expect(lessons.every((r) => r.lesson.contentStatus === 'ready')).toBe(true);
  });

  it('urutan dan status materi sesuai kurikulum', () => {
    expect(lessons.map((r) => r.lesson.id)).toEqual(Array.from({ length: 10 }, (_, i) => `level-1-m2-l${i + 1}`));
    for (const ref of lessons) {
      const content = getLessonContent(ref.lesson.id);
      expect(ref.lesson.contentStatus === 'ready', ref.lesson.id).toBe(content !== null);
    }
  });

  it('materi yang siap punya latihan aktif, produksi terbuka, recall, dan evaluasi', () => {
    for (const ref of lessons.filter((r) => r.lesson.contentStatus === 'ready')) {
      const acts = getLessonContent(ref.lesson.id)!.activities ?? [];
      expect(new Set(acts.map((a) => a.id)).size).toBe(acts.length);
      expect(acts.some((a) => a.type === 'exercise' && a.open)).toBe(true);
      expect(acts.some((a) => a.type === 'recall')).toBe(true);
      expect(acts.some((a) => a.type === 'evaluation')).toBe(true);
      for (const a of acts) {
        expect(a.items?.length, `${ref.lesson.id}/${a.id}`).toBeGreaterThan(0);
        if (a.pickCount) expect(a.items!.length).toBeGreaterThan(a.pickCount);
      }
    }
  });

  it('ID aktivitas berprefiks sesuai nomor materi', () => {
    for (const ref of lessons.filter((r) => r.lesson.contentStatus === 'ready')) {
      const prefix = `m2-l${ref.lesson.id.split('-l').pop()}-`;
      for (const a of getLessonContent(ref.lesson.id)!.activities ?? []) expect(a.id.startsWith(prefix), a.id).toBe(true);
    }
  });

  it('materi 2.2 Nouns siap dengan bank soal countable/uncountable dan plural', () => {
    const acts = getLessonContent('level-1-m2-l2')!.activities!;
    for (const id of ['m2-l2-countable', 'm2-l2-plural', 'm2-l2-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });

  it('materi 2.3 Pronouns siap dengan bank soal jenis pronoun, pilihan, dan ganti noun', () => {
    const acts = getLessonContent('level-1-m2-l3')!.activities!;
    for (const id of ['m2-l3-identify', 'm2-l3-choose', 'm2-l3-replace', 'm2-l3-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });

  it('materi 2.4 Verbs siap dengan bank soal action/be, bentuk verb, dan verb + preposition', () => {
    const acts = getLessonContent('level-1-m2-l4')!.activities!;
    for (const id of ['m2-l4-identify', 'm2-l4-choose', 'm2-l4-prep', 'm2-l4-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });

  it('materi 2.5 Adjectives siap dengan bank soal posisi, -ed/-ing, dan adjective + preposition', () => {
    const acts = getLessonContent('level-1-m2-l5')!.activities!;
    for (const id of ['m2-l5-position', 'm2-l5-edging', 'm2-l5-prep', 'm2-l5-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });
  it('materi 2.6 Adverbs siap dengan bank soal bentuk adverb, frekuensi, dan penguat', () => {
    const acts = getLessonContent('level-1-m2-l6')!.activities!;
    for (const id of ['m2-l6-form', 'm2-l6-freq', 'm2-l6-place', 'm2-l6-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });

  it('materi 2.7 Prepositions siap dengan bank soal waktu, tempat & arah, dan cara/alat', () => {
    const acts = getLessonContent('level-1-m2-l7')!.activities!;
    for (const id of ['m2-l7-time', 'm2-l7-place', 'm2-l7-other', 'm2-l7-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });

  it('materi 2.8 Conjunctions siap dengan bank soal kata sambung, because/because of, dan klausa waktu/syarat', () => {
    const acts = getLessonContent('level-1-m2-l8')!.activities!;
    for (const id of ['m2-l8-choose', 'm2-l8-because', 'm2-l8-clause', 'm2-l8-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });

  it('materi 2.9 Articles & Determiners siap dengan bank soal article, this/these & possessive, dan jumlah', () => {
    const acts = getLessonContent('level-1-m2-l9')!.activities!;
    for (const id of ['m2-l9-article', 'm2-l9-demo', 'm2-l9-quantity', 'm2-l9-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });

  it('materi 2.10 Fungsi Kata siap dengan bank soal identifikasi, kata sama beda fungsi, dan bentuk kata', () => {
    const acts = getLessonContent('level-1-m2-l10')!.activities!;
    for (const id of ['m2-l10-identify', 'm2-l10-same', 'm2-l10-form', 'm2-l10-prod']) {
      const a = acts.find((x) => x.id === id);
      expect(a, id).toBeDefined();
      expect(a!.items!.length).toBeGreaterThan(a!.pickCount!);
    }
  });
});
