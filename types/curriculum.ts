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

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  /** ID materi yang harus selesai dulu. Jika kosong, dipakai materi sebelumnya dalam urutan. */
  prerequisites?: string[];
  contentStatus: ContentStatus;
  content: LessonContent | null;
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
