import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findSpeakTopic } from '@/data/speak/topics';
import type { SpeakProgress } from '@/lib/speak';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Progres menu Speak (tabel speak_progress). GET: semua topik. POST: catat satu hasil percakapan
 * (skor terbaik dihitung di server). Tamu menyimpan progres di browser (storage: 'guest').
 */

interface Row {
  topic_id: string;
  best_score: number;
  last_score: number;
  attempts: number;
  last_at: string;
}

const toProgress = (r: Row): SpeakProgress => ({
  topicId: r.topic_id,
  bestScore: r.best_score,
  attempts: r.attempts,
  lastAt: new Date(r.last_at).getTime(),
});

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return NextResponse.json({ progress: [], storage: 'guest' });
  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ progress: [], storage: 'unavailable' });

  const { data, error } = await supabase
    .from('speak_progress')
    .select('topic_id, best_score, last_score, attempts, last_at');
  if (error) {
    console.warn('[api/speak/progress] baca:', error.message);
    return NextResponse.json({ progress: [], storage: 'unavailable' });
  }
  return NextResponse.json({ progress: (data as Row[]).map(toProgress), storage: 'saved' });
}

const postSchema = z.object({ topicId: z.string().min(1).max(60), score: z.number().int().min(0).max(100) });

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const body = await readJsonBody(req, postSchema, 1024);
  if (!body.ok) return body.response;
  if (!findSpeakTopic(body.data.topicId)) return jsonError(400, 'Topik tidak ditemukan.');
  if (auth.isGuest) return NextResponse.json({ storage: 'guest' });

  const supabase = await createServerSupabase();
  if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

  const { topicId, score } = body.data;
  const { data: existing, error: readError } = await supabase
    .from('speak_progress')
    .select('topic_id, best_score, last_score, attempts, last_at')
    .eq('topic_id', topicId)
    .maybeSingle<Row>();
  if (readError) {
    console.warn('[api/speak/progress] baca:', readError.message);
    return jsonError(503, 'Progres tidak dapat disimpan. Pastikan migrasi speak_progress sudah dijalankan.');
  }

  const row = {
    topic_id: topicId,
    best_score: Math.max(score, existing?.best_score ?? 0),
    last_score: score,
    attempts: (existing?.attempts ?? 0) + 1,
    last_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('speak_progress').upsert(row, { onConflict: 'user_id,topic_id' });
  if (error) {
    console.warn('[api/speak/progress] simpan:', error.message);
    return jsonError(503, 'Progres tidak dapat disimpan. Pastikan migrasi speak_progress sudah dijalankan.');
  }
  return NextResponse.json({ progress: toProgress(row), storage: 'saved' });
}
