import type { CurriculumModule } from '@/types/curriculum';

/**
 * Katalog Modul 2 (ringan: tanpa isi materi). Isi lengkap ada di content/module-2.ts (server-only).
 * Semua materi (2.1–2.10) sudah berisi; ditambahkan berurutan sesuai kurikulum.
 */
const MODULE_ID = 'level-1-m2';

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
    { id: `${MODULE_ID}-l6`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Adverbs',
      summary: 'Kata keterangan: cara (-ly, well), frekuensi, waktu & tempat, serta posisinya.' },
    { id: `${MODULE_ID}-l7`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Prepositions',
      summary: 'Preposisi waktu (until, by, for, during), tempat & arah dalam sistem, serta cara dan alat.' },
    { id: `${MODULE_ID}-l8`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Conjunctions',
      summary: 'Kata sambung untuk menambah, mengontraskan, memberi alasan, akibat, waktu, dan syarat.' },
    { id: `${MODULE_ID}-l9`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Articles dan Determiners',
      summary: 'A/an/the atau tanpa article, this/that, some/any, much/many, every, dan possessive.' },
    { id: `${MODULE_ID}-l10`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Mengidentifikasi Fungsi Kata',
      summary: 'Membaca kalimat nyata dan mengenali fungsi setiap kata dari posisi dan akhirannya.' },
  ],
};
