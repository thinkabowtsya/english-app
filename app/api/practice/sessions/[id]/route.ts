import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { createServerSupabase } from '@/lib/supabase/server';

/** Detail satu sesi latihan: semua soal, jawaban pengguna, dan hasil pemeriksaannya. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return jsonError(401, 'Login untuk melihat riwayat.');

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, 'ID sesi tidak valid.');

  const supabase = await createServerSupabase();
  if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('id, kind, title, lesson_id, total, correct, score, created_at, items')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.warn(`[api/practice/sessions/id] membaca sesi gagal (${error.code ?? 'unknown'}): ${error.message}`);
    return jsonError(503, 'Sesi tidak dapat dimuat.');
  }
  if (!data) return jsonError(404, 'Sesi tidak ditemukan.');
  return NextResponse.json({
    id: data.id,
    kind: data.kind,
    title: data.title,
    lessonId: data.lesson_id,
    total: data.total,
    correct: data.correct,
    score: data.score,
    createdAt: data.created_at,
    items: data.items,
  });
}
