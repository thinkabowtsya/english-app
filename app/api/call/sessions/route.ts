import { NextResponse } from 'next/server';
import {
  callSessionSchema,
  parseAiAssessment,
  type CallAssessment,
  type CallSessionSummary,
} from '@/lib/call-assessment';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';
import { mistakesFromCall } from '@/lib/mistake-extract';
import { saveMistakes } from '@/lib/server/mistakes';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Riwayat Telepon AI (tabel call_sessions).
 * GET: daftar panggilan terbaru. POST: nilai panggilan yang baru selesai dengan AI, lalu simpan.
 */

const LIST_LIMIT = 30;
/** Transkrip yang dikirim ke AI dibatasi agar prompt tetap kecil. */
const TRANSCRIPT_CHARS = 12_000;

interface SessionRow {
  id: string;
  topic: string;
  duration_seconds: number;
  user_turns: number;
  overall_score: number | null;
  created_at: string;
}

function logStoreError(action: string, error: { message: string; code?: string }) {
  console.warn(`[api/call/sessions] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return NextResponse.json({ sessions: [], storage: 'guest' });

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ sessions: [], storage: 'unavailable' });

  const { data, error } = await supabase
    .from('call_sessions')
    .select('id, topic, duration_seconds, user_turns, overall_score, created_at')
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (error) {
    logStoreError('membaca riwayat', error);
    return NextResponse.json({ sessions: [], storage: 'unavailable' });
  }
  const sessions: CallSessionSummary[] = (data as SessionRow[]).map((r) => ({
    id: r.id,
    topic: r.topic,
    durationSeconds: r.duration_seconds,
    userTurns: r.user_turns,
    overallScore: r.overall_score,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ sessions, storage: 'saved' });
}

async function assess(topic: string, transcript: string): Promise<CallAssessment | null> {
  if (!isGroqConfigured()) return null;
  const systemPrompt = `You are an expert English speaking examiner for Indonesian learners.
Assess the LEARNER's speaking in this phone-call transcript (topic: ${topic}). Lines starting with "Learner:" are the learner; "AI:" lines are the tutor and are NOT assessed.

The learner's lines come from automatic speech recognition:
- IGNORE capitalization and punctuation completely; they are never mistakes.
- Judge only grammar, word choice, fluency (sentence length, complete ideas, natural flow), and interaction (answering questions, asking back, keeping the conversation going).
- Be fair and encouraging but honest. Very short answers should lower fluency and interaction.

Return ONLY a JSON object:
{
  "overall": number (0-100),
  "fluency": number (0-100),
  "grammar": number (0-100),
  "vocabulary": number (0-100),
  "interaction": number (0-100),
  "level": string (estimated CEFR level, e.g. "A2", "B1"),
  "summary": string (2-3 sentences in simple Indonesian),
  "strengths": [string] (2-3 points in Indonesian),
  "improvements": [string] (2-3 concrete, actionable points in Indonesian),
  "betterPhrases": [ { "said": string (what the learner said), "better": string (a more natural native version), "note": string (short reason in Indonesian about grammar or word choice only) } ] (up to 4, only where the wording or grammar can really be improved)
}
Never mention capitalization, punctuation, commas, periods, or semicolons anywhere in the output.
DO NOT include markdown or extra text.`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      ...modelOptions(),
    });
    return parseAiAssessment(JSON.parse(completion.choices[0]?.message?.content || '{}'));
  } catch (error: unknown) {
    console.error('[api/call/sessions] penilaian gagal:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, callSessionSchema, 600 * 1024);
  if (!body.ok) return body.response;
  const { topic, durationSeconds, lines } = body.data;
  const userTurns = lines.filter((l) => l.role === 'user').length;
  if (userTurns === 0) return jsonError(400, 'Belum ada ucapan untuk dinilai.');

  const transcript = lines
    .map((l) => `${l.role === 'user' ? 'Learner' : 'AI'}: ${l.text}`)
    .join('\n')
    .slice(-TRANSCRIPT_CHARS);
  const assessment = await assess(topic, transcript);

  // Tamu tetap mendapat penilaian, tapi tidak disimpan.
  if (auth.isGuest) return NextResponse.json({ id: null, assessment, storage: 'guest' });
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ id: null, assessment, storage: 'unavailable' });

  const { data, error } = await supabase
    .from('call_sessions')
    .insert({
      topic,
      duration_seconds: durationSeconds,
      user_turns: userTurns,
      overall_score: assessment?.overall ?? null,
      lines,
      assessment,
    })
    .select('id')
    .single();
  if (error) {
    logStoreError('menyimpan panggilan', error);
    return NextResponse.json({ id: null, assessment, storage: 'unavailable' });
  }
  // Koreksi per kalimat masuk Buku kesalahan.
  await saveMistakes(supabase, mistakesFromCall(data.id, lines));
  return NextResponse.json({ id: data.id, assessment, storage: 'saved' });
}
