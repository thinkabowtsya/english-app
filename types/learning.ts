/** Tanggal lokal pengguna dalam format YYYY-MM-DD. */
export type LocalDateKey = string;

export type SessionStatus = 'completed' | 'stopped' | 'interrupted';

export interface LearningSession {
  id: string;
  /** Tanggal lokal saat sesi dimulai. Seluruh durasi sesi dihitung ke tanggal ini. */
  localDate: LocalDateKey;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms. */
  endedAt: number;
  targetMs: number;
  /** Waktu aktif (tanpa waktu pause). */
  actualMs: number;
  status: SessionStatus;
  lessonId: string | null;
}

export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'needs_review';

/** Progres yang disimpan. Status `locked`/`available` diturunkan dari kurikulum, bukan disimpan. */
export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  status: 'in_progress' | 'completed' | 'needs_review';
  timeSpentMs: number;
  lastScore: number | null;
  lastStudiedAt: number | null;
  completedAt: number | null;
}

export type ReviewKind = 'lesson' | 'pattern' | 'phrase';

export interface ReviewItem {
  id: string;
  kind: ReviewKind;
  /** Teks yang perlu diulang (judul materi, pola kalimat, atau frasa). */
  label: string;
  /** Catatan tambahan, mis. arti atau konteks frasa. */
  note: string | null;
  reason: string;
  lessonId: string | null;
  source: 'manual' | 'evaluation' | 'ai-coach';
  createdAt: number;
  nextReviewAt: number | null;
  failCount: number;
  resolvedAt: number | null;
}

export interface EvaluationResult {
  id: string;
  lessonId: string;
  score: number;
  maxScore: number;
  takenAt: number;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Settings {
  displayName: string;
  dailyGoalMinutes: number;
  defaultSessionMinutes: number;
  theme: ThemePreference;
  soundOnFinish: boolean;
  browserNotification: boolean;
  coachDifficulty: Difficulty;
}

export interface AppData {
  schemaVersion: 1;
  createdAt: number;
  settings: Settings;
  sessions: LearningSession[];
  lessons: Record<string, LessonProgress>;
  reviews: ReviewItem[];
  evaluations: EvaluationResult[];
  lastLessonId: string | null;
}

/** Sesi timer yang sedang berjalan atau dijeda. Disimpan terpisah dari AppData. */
export interface ActiveTimer {
  id: string;
  targetMs: number;
  /** Epoch ms saat tombol mulai pertama kali ditekan. */
  startedAt: number;
  status: 'running' | 'paused';
  /** Waktu aktif yang sudah terkumpul sebelum segmen berjalan saat ini. */
  accumulatedMs: number;
  /** Awal segmen berjalan saat ini (null ketika paused). */
  segmentStartedAt: number | null;
  /** Terakhir kali sesi terlihat aktif di browser. Dipakai untuk rekonsiliasi. */
  lastSeenAt: number;
  lessonId: string | null;
  /** Kapan timer terakhir dijeda (null ketika berjalan). */
  pausedAt: number | null;
  /** `inactive` berarti dijeda otomatis karena browser/perangkat tidak aktif. */
  pauseReason: 'user' | 'inactive' | null;
}
