import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findSpeakTopic } from '@/data/speak/topics';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { speakFeedbackSchema, validGoals } from '@/lib/speak';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';

/** Umpan balik akhir satu percakapan menu Speak: skor, ringkasan, dan contoh kalimat yang lebih baik. */

const schema = z.object({
  topicId: z.string().min(1).max(60),
  lines: z
    .array(z.object({ role: z.enum(['ai', 'user']), text: z.string().trim().min(1).max(800) }))
    .min(2)
    .max(60),
  goalsMet: z.array(z.string().max(40)).max(10).default([]),
});

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 64 * 1024);
  if (!body.ok) return body.response;
  const topic = findSpeakTopic(body.data.topicId);
  if (!topic) return jsonError(400, 'Topik tidak ditemukan.');
  if (!body.data.lines.some((l) => l.role === 'user')) return jsonError(400, 'Belum ada ucapanmu untuk dinilai.');
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

  const met = validGoals(body.data.goalsMet, topic.goals.map((g) => g.id));
  const transcript = body.data.lines.map((l) => `${l.role === 'ai' ? 'Partner' : 'Learner'}: ${l.text}`).join('\n');

  const system = `You are a friendly English speaking coach for an Indonesian learner (CEFR ${topic.level}).
They just did a spoken role-play: "${topic.titleEn}". Scene: ${topic.scene}
Tasks completed: ${met.length}/${topic.goals.length} (${topic.goals.map((g) => `${g.id}${met.includes(g.id) ? ' ✓' : ' ✗'}`).join(', ')}).
The learner's words come from speech recognition, so they have NO capitalization or punctuation by design.
NEVER mention or judge capitalization, punctuation, commas, spelling, "kapitalisasi", or "tanda baca" anywhere (not in "why", "summary", or "nextTip"). Judge only spoken grammar, word choice, and completeness.

Evaluate only the Learner's lines. Return ONLY a JSON object:
{
  "score": number 0-100 (overall; weigh task completion, clarity, grammar, and range),
  "fluency": number 0-100 (complete, connected sentences vs. single words),
  "grammar": number 0-100,
  "vocabulary": number 0-100 (range and naturalness for the situation),
  "task": number 0-100 (how well they completed the tasks),
  "summary": string (2-3 short, encouraging sentences in Indonesian: what went well and the main thing to improve),
  "improvements": [ { "you": string (an exact sentence the learner said), "better": string (a more natural/correct version), "why": string (very short, Indonesian) } ] (2-3 items, choose the most useful ones; if everything is correct, show more natural alternatives),
  "nextTip": string (one concrete tip in Indonesian for the next attempt)
}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: transcript },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      ...modelOptions('medium'),
    });
    const parsed = speakFeedbackSchema.safeParse(JSON.parse(completion.choices[0]?.message?.content || '{}'));
    if (!parsed.success) return jsonError(502, 'Penilaian AI tidak lengkap. Coba lagi.');
    return NextResponse.json({ feedback: { ...parsed.data, score: Math.round(parsed.data.score) } });
  } catch (error: unknown) {
    console.error('[api/speak/feedback]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Gagal menilai percakapan. Coba lagi sebentar.');
  }
}
