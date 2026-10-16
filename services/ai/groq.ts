import 'server-only';
import { APIError } from 'groq-sdk';
import { MAIN_MODEL, getGroq, modelOptions } from '@/lib/groq';
import type { CoachRequest } from '@/types/ai';
import { buildExplainSystemPrompt, buildReplySystemPrompt } from './prompts';
import { AiProviderError, type AiCoachService } from './types';

/** Jumlah pesan terakhir yang dikirim sebagai konteks percakapan. */
const CONTEXT_MESSAGES = 20;

export class GroqCoachService implements AiCoachService {
  readonly provider = 'groq' as const;
  readonly model = MAIN_MODEL;

  async respond(request: CoachRequest): Promise<string> {
    const messages =
      request.action === 'explain'
        ? [
            { role: 'system' as const, content: buildExplainSystemPrompt(request.difficulty) },
            { role: 'user' as const, content: request.target },
          ]
        : [
            {
              role: 'system' as const,
              content: buildReplySystemPrompt(request.mode, request.difficulty, request.scenario),
            },
            ...request.messages.slice(-CONTEXT_MESSAGES),
          ];

    try {
      const completion = await getGroq().chat.completions.create({
        model: this.model,
        messages,
        temperature: request.action === 'explain' ? 0.3 : 0.6,
        max_tokens: 1_000,
        ...modelOptions(),
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new AiProviderError('Respons kosong dari Groq', null);
      return text;
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (error instanceof APIError) {
        throw new AiProviderError(`Groq API error: ${error.message}`, error.status ?? null);
      }
      throw new AiProviderError(error instanceof Error ? error.message : 'Unknown Groq error', null);
    }
  }
}
