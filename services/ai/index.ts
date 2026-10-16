import 'server-only';
import { isGroqConfigured } from '@/lib/groq';
import { GroqCoachService } from './groq';
import { MockCoachService } from './mock';
import type { AiCoachService } from './types';

/**
 * Memilih implementasi AI Coach:
 * - AI_PROVIDER=mock → selalu mock.
 * - GROQ_API_KEY tersedia → Groq.
 * - Selain itu → mock (UI menampilkan penanda mode mock).
 */
export function getCoachService(): AiCoachService {
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (preferred !== 'mock' && isGroqConfigured()) return new GroqCoachService();
  return new MockCoachService();
}

export { AiProviderError } from './types';
export type { AiCoachService } from './types';
