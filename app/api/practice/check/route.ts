import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';

/**
 * Menilai jawaban bebas yang tidak cocok persis dengan kunci (perbaiki kalimat, terjemahan,
 * buat kalimat sendiri). Huruf kapital, tanda baca, dan bentuk singkat tidak dinilai.
 */

const schema = z.object({
  type: z.enum(['fix', 'translate', 'write']),
  prompt: z.string().trim().min(1).max(300),
  text: z.string().max(400).default(''),
  answer: z.string().trim().min(1).max(400),
  response: z.string().trim().min(1).max(1000),
  vocab: z.string().max(120).optional(),
});

const resultSchema = z.object({
  correct: z.boolean(),
  feedback: z.string().trim().max(800).catch(''),
  corrected: z.string().trim().max(600).catch(''),
});

const TASKS = {
  fix: 'The learner had to correct the mistake in this sentence: "{text}". Reference answer: "{answer}". Mark correct if the learner\'s sentence fixes the mistake and is grammatical with the same meaning.',
  translate: 'The learner had to translate this Indonesian sentence into English: "{text}". Reference answer: "{answer}". Mark correct if the learner\'s English is grammatical, natural enough, and keeps the same meaning (other wordings are fine).',
  write: 'The learner had to write their own English sentence using "{vocab}". Example: "{answer}". Mark correct if the sentence uses "{vocab}" (any correct form) with the right meaning and is grammatical. Small style issues are still correct.',
} as const;

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 4 * 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');
  const { type, text, answer, response, vocab } = body.data;

  const task = TASKS[type]
    .replaceAll('{text}', text)
    .replaceAll('{answer}', answer)
    .replaceAll('{vocab}', vocab ?? answer);
  const system = `You are a fair English teacher for an Indonesian learner. ${task}
IGNORE capitalization, punctuation, and contractions (don't = do not) completely; never mention them.
Return ONLY a JSON object: {"correct": boolean, "feedback": string (1-2 short sentences in simple Indonesian: why it is right or what is wrong), "corrected": string (the learner's sentence corrected and made natural; same as the learner's if already good)}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Learner's answer: "${response}"` },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      ...modelOptions(),
    });
    const parsed = resultSchema.safeParse(JSON.parse(completion.choices[0]?.message?.content || '{}'));
    if (!parsed.success) return jsonError(502, 'Penilaian AI tidak lengkap. Coba lagi.');
    return NextResponse.json(parsed.data);
  } catch (error: unknown) {
    console.error('[api/practice/check]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Penilaian gagal. Coba lagi nanti.');
  }
}
