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
      action: 'explain';
      difficulty: Difficulty;
      /** Teks yang ingin dijelaskan grammar-nya. */
      target: string;
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
