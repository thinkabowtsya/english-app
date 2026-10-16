import type { CurriculumModule } from '@/types/curriculum';

/** Katalog Modul 1 (ringan: tanpa isi materi). Isi lengkap ada di content/module-1.ts (server-only). */
const MODULE_ID = 'level-1-m1';

export const module1: CurriculumModule = {
  id: MODULE_ID,
  levelId: 'level-1',
  title: 'Modul 1 — Grammar Dasar Sederhana',
  description:
    'Fondasi untuk menyusun kalimat sendiri: pola kalimat, kata ganti, be, Simple Present, negatif & pertanyaan, artikel, preposisi, dan kata sambung.',
  lessons: [
    { id: `${MODULE_ID}-l1`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Struktur Kalimat Sederhana',
      summary: 'Pola Subject + Verb, Subject + Verb + Object, dan Subject + be + Complement.' },
    { id: `${MODULE_ID}-l2`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 20,
      title: 'Subject dan Kata Ganti',
      summary: 'I, you, we, they, he, she, it sebagai subject, dan pengaruhnya pada verb.' },
    { id: `${MODULE_ID}-l3`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Am, Is, dan Are',
      summary: 'Menyatakan kondisi, identitas, pekerjaan, dan lokasi; bentuk negatif dan pertanyaan.' },
    { id: `${MODULE_ID}-l4`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 30,
      title: 'Simple Present Tense',
      summary: 'Kebiasaan, rutinitas, dan fakta: verb dasar, -s/-es, do/does.' },
    { id: `${MODULE_ID}-l5`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 20,
      title: 'Kalimat Negatif dan Pertanyaan',
      summary: 'Membandingkan pola be dan verb biasa saat membuat negatif dan pertanyaan.' },
    { id: `${MODULE_ID}-l6`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 20,
      title: 'A, An, dan The',
      summary: 'Artikel dasar: memperkenalkan sesuatu vs membicarakan yang sudah spesifik.' },
    { id: `${MODULE_ID}-l7`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 25,
      title: 'Preposisi Dasar: In, On, At, To, For',
      summary: 'Tempat, waktu, arah, dan tujuan dalam konteks sehari-hari dan kerja.' },
    { id: `${MODULE_ID}-l8`, moduleId: MODULE_ID, contentStatus: 'ready', estimatedMinutes: 20,
      title: 'Menghubungkan Kalimat: And, But, Because, So',
      summary: 'Menyampaikan maksud lebih lengkap dengan kata sambung sederhana.' },
  ],
};
