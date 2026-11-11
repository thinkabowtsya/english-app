import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findSpeakTopic } from '@/data/speak/topics';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { speakTurnSchema, validGoals } from '@/lib/speak';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';

/**
 * Satu giliran role-play menu Speak: AI membalas sesuai perannya, menilai misi yang sudah dicapai
 * pengguna, dan memberi satu tips koreksi singkat bila kalimat terakhir pengguna jelas salah.
 */

const schema = z.object({
  topicId: z.string().min(1).max(60),
  lines: z
    .array(z.object({ role: z.enum(['ai', 'user']), text: z.string().trim().min(1).max(800) }))
    .min(1)
    .max(40),
  goalsMet: z.array(z.string().max(40)).max(10).default([]),
});

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 48 * 1024);
  if (!body.ok) return body.response;
  const topic = findSpeakTopic(body.data.topicId);
  if (!topic) return jsonError(400, 'Topik tidak ditemukan.');
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

  const goalIds = topic.goals.map((g) => g.id);
  const alreadyMet = validGoals(body.data.goalsMet, goalIds);
  const remaining = topic.goals.filter((g) => !alreadyMet.includes(g.id));

  const system = `You are ${topic.aiRole} in a speaking practice role-play for an Indonesian learner of English (CEFR ${topic.level}, works as a programmer).
Scene: ${topic.scene}

Stay in character. Reply naturally in simple, correct, spoken English: 1-3 short sentences, then usually ONE question that helps the learner continue.
${remaining.length > 0 ? `Gently steer the conversation so the learner can do these remaining tasks (do not list them, do not mention "tasks"):\n${remaining.map((g) => `- ${g.check}`).join('\n')}` : 'All tasks are done: respond warmly and bring the conversation to a natural close.'}
The learner's words come from speech recognition: ignore capitalization and punctuation completely, and never mention them in "tip".

Learner tasks (id: description):
${topic.goals.map((g) => `- ${g.id}: ${g.check}`).join('\n')}

Return ONLY a JSON object:
{
  "reply": string (your in-character reply),
  "goalsMet": string[] (ids of ALL tasks the LEARNER has clearly completed so far in the whole conversation, including earlier turns),
  "tip": null or { "wrong": string (the learner's last sentence or the wrong part), "better": string (a natural corrected version), "note": string (very short explanation in Indonesian) } — only if the learner's LAST message has a clear grammar or word-choice mistake; otherwise null
}`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: system },
        ...body.data.lines.slice(-20).map((l) => ({
          role: l.role === 'ai' ? ('assistant' as const) : ('user' as const),
          content: l.text,
        })),
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' },
      ...modelOptions(),
    });
    const parsed = speakTurnSchema.safeParse(JSON.parse(completion.choices[0]?.message?.content || '{}'));
    if (!parsed.success) return jsonError(502, 'Balasan AI tidak lengkap. Coba lagi.');
    // Misi yang sudah tercapai tidak pernah hilang lagi.
    const goalsMet = validGoals([...alreadyMet, ...parsed.data.goalsMet], goalIds);
    return NextResponse.json({ reply: parsed.data.reply, goalsMet, tip: parsed.data.tip ?? null });
  } catch (error: unknown) {
    console.error('[api/speak/turn]', error instanceof Error ? error.message : error);
    return jsonError(502, 'AI sedang tidak bisa membalas. Coba lagi sebentar.');
  }
}
