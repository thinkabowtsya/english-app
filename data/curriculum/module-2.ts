import type { CurriculumModule, Lesson } from '@/types/curriculum';

/**
 * Katalog Modul 2 (ringan: tanpa isi materi). Isi lengkap ada di content/module-2.ts (server-only).
 * Materi ditambahkan satu unit per hari sesuai urutan kurikulum; yang belum dibuat berstatus placeholder.
 */
const MODULE_ID = 'level-1-m2';

function planned(no: number, title: string, summary: string): Lesson {
  return { id: `${MODULE_ID}-l${no}`, moduleId: MODULE_ID, contentStatus: 'placeholder', estimatedMinutes: 25, title, summary };
}

export const module2: CurriculumModule = {
  id: MODULE_ID,
  levelId: 'level-1',
  title: 'Modul 2 — Parts of Speech',
  description:
    'Memahami fungsi kata dan cara kata bekerja bersama dalam kalimat: noun, pronoun, verb, adjective, adverb, preposition, conjunction, article & determiner.',
  lessons: [
    { id: `${MODULE_ID}-l1`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Pengenalan Parts of Speech',
      summary: 'Delapan jenis kata, posisinya dalam kalimat, dan satu kata yang bisa punya dua fungsi.' },
    { id: `${MODULE_ID}-l2`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Nouns',
      summary: 'Kata benda: countable/uncountable, bentuk jamak, dan posisinya dalam kalimat.' },
    { id: `${MODULE_ID}-l3`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Pronouns',
      summary: 'Kata ganti subject, object, dan possessive dalam konteks kerja.' },
    { id: `${MODULE_ID}-l4`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Verbs',
      summary: 'Action verbs, be, dan verb + object dalam kalimat sehari-hari.' },
    { id: `${MODULE_ID}-l5`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Adjectives',
      summary: 'Kata sifat: posisi sebelum noun dan setelah be.' },
    planned(6, 'Adverbs', 'Kata keterangan: cara, waktu, frekuensi, dan posisinya.'),
    planned(7, 'Prepositions', 'Preposisi tempat, waktu, dan arah dalam konteks yang lebih luas.'),
    planned(8, 'Conjunctions', 'Kata sambung untuk menambah, mengontraskan, memberi alasan, dan akibat.'),
    planned(9, 'Articles dan Determiners', 'A/an/the, this/that, some/any, dan kata penentu lainnya.'),
    planned(10, 'Mengidentifikasi Fungsi Kata', 'Membaca kalimat nyata dan mengenali fungsi setiap kata.'),
  ],
};
