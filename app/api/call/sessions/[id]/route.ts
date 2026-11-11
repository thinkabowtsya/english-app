import { NextResponse } from 'next/server';
import type { CallSessionDetail } from '@/lib/call-assessment';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { createServerSupabase } from '@/lib/supabase/server';

/** Detail satu panggilan: transkrip, koreksi per kalimat, dan penilaian. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return jsonError(401, 'Login untuk melihat riwayat.');

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, 'ID panggilan tidak valid.');

  const supabase = await createServerSupabase();
  if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

  const { data, error } = await supabase
    .from('call_sessions')
    .select('id, topic, duration_seconds, user_turns, overall_score, created_at, lines, assessment')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn(`[api/call/sessions/id] membaca panggilan gagal (${error.code ?? 'unknown'}): ${error.message}`);
    return jsonError(503, 'Panggilan tidak dapat dimuat.');
  }
  if (!data) return jsonError(404, 'Panggilan tidak ditemukan.');
  return NextResponse.json({
    id: data.id,
    topic: data.topic,
    durationSeconds: data.duration_seconds,
    userTurns: data.user_turns,
    overallScore: data.overall_score,
    createdAt: data.created_at,
    lines: data.lines,
    assessment: data.assessment,
  } satisfies CallSessionDetail);
}
