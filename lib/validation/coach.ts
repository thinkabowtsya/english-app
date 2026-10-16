import { z } from 'zod';
import type { CoachRequest } from '@/types/ai';

export const COACH_LIMITS = {
  messageChars: 2_000,
  maxMessages: 40,
  scenarioChars: 200,
  /** Batas ukuran body request ke /api/coach. */
  bodyBytes: 64 * 1024,
} as const;

const difficulty = z.enum(['beginner', 'intermediate', 'advanced']);

const message = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(COACH_LIMITS.messageChars),
});

export const coachRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reply'),
    mode: z.enum(['help-me-say-it', 'free-conversation', 'role-play', 'correct-my-english']),
    difficulty,
    scenario: z
      .string()
      .trim()
      .max(COACH_LIMITS.scenarioChars)
      // Skenario masuk ke system prompt: satukan jadi satu baris.
      .transform((s) => s.replace(/\s+/g, ' '))
      .optional(),
    messages: z
      .array(message)
      .min(1)
      .max(COACH_LIMITS.maxMessages)
      .refine((list) => list[list.length - 1]?.role === 'user', 'Pesan terakhir harus dari pengguna'),
  }),
  z.object({
    action: z.literal('explain'),
    difficulty,
    target: z.string().trim().min(1).max(COACH_LIMITS.messageChars),
  }),
]) satisfies z.ZodType<CoachRequest>;
