import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { RECALL_COUNTS, parseAiRecallQuestions, questionTypeFor } from '@/lib/recall';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';
import { createSeed } from '@/lib/shuffle';
import { buildVocabPool } from '@/lib/server/vocab-pool';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Membuat soal Vocabulary Recall dari kata Oxford & collocation (tabel oxford_words /
 * collocation_progress). Urutan: yang jatuh tempo diulang → yang sudah dipelajari → bila
 * kurang, yang belum dipelajari dari level/kelompok paling awal.
 */

const schema = z.object({
  source: z.enum(['mix', 'oxford', 'collocation']).default('mix'),
  count: z
    .number()
    .int()
    .refine((n) => (RECALL_COUNTS as readonly number[]).includes(n))
    .default(5),
});

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');
  const { source, count } = body.data;
  const supabase = auth.isGuest ? null : await createServerSupabase();
  const seed = createSeed();
  const { pool, learnedCount, dueCount } = await buildVocabPool(supabase, source, count, seed);
  if (pool.length === 0) return jsonError(400, 'Belum ada kata atau collocation untuk dibuat soal.');

  const spec = pool.map((p, i) => ({ item: p.item, kind: p.source === 'oxford' ? 'word' : 'collocation', info: p.hint, type: questionTypeFor(p, i) }));
  const systemPrompt = `You write vocabulary recall quiz questions for Indonesian learners of English.
Write exactly one multiple-choice question for each entry below, in the same order.

Question types:
- "meaning": prompt (Indonesian) asks what the English item means; 4 options are short Indonesian meanings; exactly one is correct, the others are plausible but clearly wrong.
- "fill": "sentence" is a natural English sentence with the item replaced by "___" (use the right form, e.g. "made a decision"); prompt (Indonesian) asks which option fits; 4 options are English words/phrases of the same kind; only one is natural and correct.
- "pair": prompt (Indonesian) asks which word combination is correct/natural in English; 4 options are English combinations where only the given collocation is correct and the others are common learner mistakes (e.g. "do a decision", "make homework").

Entries (JSON):
${JSON.stringify(spec)}

Return ONLY a JSON object:
{ "questions": [ { "item": string, "prompt": string, "sentence": string ("" unless type is "fill"), "options": [string, string, string, string], "answer": number (0-3, index of the correct option), "explanation": string (1-2 short sentences in simple Indonesian explaining why the answer is right) } ] }

Every question must have exactly one correct answer. Use only natural, correct English. DO NOT include markdown or extra text.`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Write the ${pool.length} questions now.` },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
      ...modelOptions(),
    });
    const questions = parseAiRecallQuestions(JSON.parse(completion.choices[0]?.message?.content || '{}'), pool, seed);
    if (questions.length === 0) return jsonError(502, 'Soal dari AI tidak lengkap. Coba lagi.');
    return NextResponse.json({
      questions,
      learnedCount,
      dueCount,
    });
  } catch (error: unknown) {
    console.error('[api/recall/generate]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Gagal membuat soal. Coba lagi nanti.');
  }
}
