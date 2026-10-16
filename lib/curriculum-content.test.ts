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

  it('materi placeholder tidak punya isi', () => {
    expect(getLessonContent('level-1-m2-l2')).toBeNull();
  });
});

describe('isi materi Modul 2', () => {
  const lessons = flattenLessons(CURRICULUM).filter((r) => r.module.id === 'level-1-m2');

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
});
