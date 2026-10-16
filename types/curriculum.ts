/**
 * Struktur kurikulum: Level → Modul → Materi → Aktivitas.
 * Konten materi diisi terpisah (lihat data/curriculum) dan tidak di-hardcode di komponen UI.
 */

export type ContentStatus = 'placeholder' | 'draft' | 'ready';

export interface SentencePattern {
  pattern: string;
  meaning?: string;
  examples?: string[];
}

export interface ExampleSentence {
  en: string;
  id?: string;
  note?: string;
}

export interface UsefulExpression {
  phrase: string;
  meaning?: string;
  usage?: string;
}

export interface DialogLine {
  speaker: string;
  text: string;
  translation?: string;
}

/** Perbandingan dua pola/makna yang mudah tertukar. */
export interface Comparison {
  a: ExampleSentence;
  b: ExampleSentence;
  explanation: string;
}

/** Contoh kesalahan umum beserta koreksinya. */
export interface CommonMistake {
  wrong: string;
  correct: string;
  reason: string;
}

/** Satu soal latihan. `answer` adalah jawaban utama; `alternatives` untuk jawaban lain yang juga benar. */
export interface ExerciseItem {
  prompt: string;
  answer: string;
  alternatives?: string[];
  explanation?: string;
}

export type ActivityType = 'exercise' | 'recall' | 'evaluation';

export interface LessonActivity {
  id: string;
  type: ActivityType;
  title: string;
  instructions?: string;
  /** Soal terbuka (mis. produksi kalimat): tidak ada satu jawaban benar; kunci hanya contoh. */
  open?: boolean;
  /** Jumlah soal yang ditampilkan dari bank; sisanya muncul lewat "Soal lain". Default: semua. */
  pickCount?: number;
  items?: ExerciseItem[];
}

export interface LessonContent {
  objectives: string[];
  explanation?: string[];
  patterns?: SentencePattern[];
  examples?: ExampleSentence[];
  expressions?: UsefulExpression[];
  comparisons?: Comparison[];
  mistakes?: CommonMistake[];
  dialog?: { title?: string; lines: DialogLine[] };
  activities?: LessonActivity[];
  summary?: string[];
  reviewRecommendation?: string;
}

/** Isi materi per ID materi. Hanya dimuat di server (lib/curriculum-content.ts). */
export type LessonContentMap = Record<string, LessonContent>;

/** Metadata materi (ringan) — dipakai di seluruh UI. Isi lengkap tidak disertakan. */
export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  /** ID materi yang harus selesai dulu. Jika kosong, dipakai materi sebelumnya dalam urutan. */
  prerequisites?: string[];
  contentStatus: ContentStatus;
}

export interface CurriculumModule {
  id: string;
  levelId: string;
  title: string;
  description: string;
  lessons: Lesson[];
}

export interface CurriculumLevel {
  id: string;
  title: string;
  description: string;
  modules: CurriculumModule[];
}
