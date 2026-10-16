import type { Difficulty } from './learning';

export type CoachMode = 'help-me-say-it' | 'free-conversation' | 'role-play' | 'correct-my-english';
export type AiProviderName = 'groq' | 'mock';

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type CoachRequest =
  | {
      action: 'reply';
      mode: CoachMode;
      difficulty: Difficulty;
      scenario?: string;
      messages: CoachMessage[];
    }
  | {
      /** Tanya Tutor: tanya jawab bebas dengan tutor bahasa Inggris. */
      action: 'tutor';
      difficulty: Difficulty;
      messages: CoachMessage[];
    }
  | {
      action: 'explain';
      difficulty: Difficulty;
      /** Teks yang ingin dijelaskan grammar-nya. */
      target: string;
    }
  | {
      /** Menilai jawaban latihan materi dan menjelaskannya. */
      action: 'check';
      difficulty: Difficulty;
      /** Instruksi + soal. */
      question: string;
      userAnswer: string;
      /** Kunci jawaban / contoh jawaban. */
      reference: string[];
      /** Soal terbuka (produksi kalimat): kunci hanya contoh, bukan satu-satunya jawaban benar. */
      open: boolean;
    };

export interface CoachResponse {
  reply: string;
  provider: AiProviderName;
  model: string | null;
}

export interface CoachStatus {
  provider: AiProviderName;
  model: string | null;
}
