'use client';

import { OXFORD_LEVELS, OXFORD_WORDS, type OxfordLevel } from '@/data/oxford/words';
import { StudyListView, type StudyGroup, type StudyItem } from '@/features/study-list/study-list-view';

const LEVEL_INFO: Record<OxfordLevel, string> = {
  A1: 'Pemula — kata dasar sehari-hari',
  A2: 'Dasar — situasi rutin dan sederhana',
  B1: 'Menengah — kerja, sekolah, perjalanan',
  B2: 'Menengah atas — diskusi dan opini',
};

const GROUPS: StudyGroup[] = OXFORD_LEVELS.map((l) => ({ id: l, label: l, info: LEVEL_INFO[l] }));

const ITEMS: StudyItem[] = OXFORD_WORDS.map((w) => ({
  key: w.word,
  group: w.level,
  tag: `/${w.ipa}/`,
  sub: w.pos.join(', '),
}));

export function OxfordView() {
  return (
    <StudyListView
      title="Oxford 3000"
      description="Kata paling penting per level CEFR. Buka kata untuk melihat arti, contoh penggunaan, dan kata serupa, lalu simpan setelah dipelajari."
      groups={GROUPS}
      items={ITEMS}
      apiBase="/api/oxford"
      groupStorageKey="oxford-level"
      table="oxford_words"
      unit="kata"
      similarLabel="Kata serupa"
      groupGridClassName="grid-cols-2 sm:grid-cols-4"
    />
  );
}
