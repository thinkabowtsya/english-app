import 'server-only';
import { APIError } from 'groq-sdk';
import { MAIN_MODEL, getGroq, modelOptions } from '@/lib/groq';
import type { CoachRequest } from '@/types/ai';
import { tidyCheckFeedback, toPlainText } from './format';
import {
  buildCheckSystemPrompt,
  buildCheckUserMessage,
  buildExplainSystemPrompt,
  buildReplySystemPrompt,
  buildTutorSystemPrompt,
} from './prompts';
import { AiProviderError, type AiCoachService } from './types';

/** Jumlah pesan terakhir yang dikirim sebagai konteks percakapan. */
const CONTEXT_MESSAGES = 20;

export class GroqCoachService implements AiCoachService {
  readonly provider = 'groq' as const;
  readonly model = MAIN_MODEL;

  async respond(request: CoachRequest): Promise<string> {
    const messages =
      request.action === 'check'
        ? [
            { role: 'system' as const, content: buildCheckSystemPrompt(request.difficulty, request.open) },
            {
              role: 'user' as const,
              content: buildCheckUserMessage(request.question, request.userAnswer, request.reference),
            },
          ]
        : request.action === 'explain'
        ? [
            { role: 'system' as const, content: buildExplainSystemPrompt(request.difficulty) },
            { role: 'user' as const, content: request.target },
          ]
        : request.action === 'tutor'
        ? [
            { role: 'system' as const, content: buildTutorSystemPrompt(request.difficulty) },
            ...request.messages.slice(-CONTEXT_MESSAGES),
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
        temperature: request.action === 'reply' ? 0.6 : request.action === 'tutor' ? 0.4 : 0.2,
        // Jawaban tutor bisa berupa penjelasan panjang.
        // Token reasoning ikut dihitung dalam max_tokens.
        max_tokens: request.action === 'tutor' ? 4_000 : 1_000,
        ...modelOptions(request.action === 'tutor' ? 'medium' : 'low'),
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new AiProviderError('Respons kosong dari Groq', null);
      // Hilangkan **tebal** dan format markdown lain agar mudah dibaca.
      const plain = toPlainText(text);
      return request.action === 'check' ? tidyCheckFeedback(plain) : plain;
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (error instanceof APIError) {
        throw new AiProviderError(`Groq API error: ${error.message}`, error.status ?? null);
      }
      throw new AiProviderError(error instanceof Error ? error.message : 'Unknown Groq error', null);
    }
  }
}
