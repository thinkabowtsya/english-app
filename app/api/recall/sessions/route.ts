import { NextResponse } from 'next/server';
import {
  recallSessionSchema,
  scoreRecall,
  type RecallHistory,
  type RecallQuestion,
  type RecallSessionSummary,
  type RecallSource,
} from '@/lib/recall';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { createServerSupabase } from '@/lib/supabase/server';
import { applyRecallResults } from '@/lib/server/vocab-progress';

/**
 * Riwayat Vocabulary Recall (tabel recall_sessions).
 * GET: daftar sesi terbaru + total soal yang pernah dikerjakan. POST: simpan sesi yang selesai
 * dan perbarui jadwal pengulangan setiap item (lib/srs.ts).
 */

const LIST_LIMIT = 30;
const PREVIEW_ITEMS = 4;

interface SessionRow {
  id: string;
  source: RecallSource;
  total: number;
  correct: number;
  created_at: string;
  questions: Pick<RecallQuestion, 'item'>[];
}

function logStoreError(action: string, error: { message: string; code?: string }) {
  console.warn(`[api/recall/sessions] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

const empty = (storage: RecallHistory['storage']): RecallHistory => ({
  sessions: [],
  totals: { sessions: 0, questions: 0, correct: 0 },
  storage,
});

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return NextResponse.json(empty('guest'));

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json(empty('unavailable'));

  const [list, all] = await Promise.all([
    supabase
      .from('recall_sessions')
      .select('id, source, total, correct, created_at, questions')
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT),
    supabase.from('recall_sessions').select('total, correct'),
  ]);
  const error = list.error ?? all.error;
  if (error) {
    logStoreError('membaca riwayat', error);
    return NextResponse.json(empty('unavailable'));
  }

  const totals = (all.data as { total: number; correct: number }[]).reduce(
    (acc, r) => ({ sessions: acc.sessions + 1, questions: acc.questions + r.total, correct: acc.correct + r.correct }),
    { sessions: 0, questions: 0, correct: 0 },
  );
  const sessions: RecallSessionSummary[] = (list.data as SessionRow[]).map((r) => ({
    id: r.id,
    source: r.source,
    total: r.total,
    correct: r.correct,
    createdAt: r.created_at,
    items: r.questions.slice(0, PREVIEW_ITEMS).map((q) => q.item),
  }));
  return NextResponse.json({ sessions, totals, storage: 'saved' } satisfies RecallHistory);
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return jsonError(401, 'Login untuk menyimpan riwayat.');

  const body = await readJsonBody(req, recallSessionSchema, 64 * 1024);
  if (!body.ok) return body.response;

  const supabase = await createServerSupabase();
  if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

  const { source, questions } = body.data;
  const correct = scoreRecall(questions);
  const { data, error } = await supabase
    .from('recall_sessions')
    .insert({ source, total: questions.length, correct, questions })
    .select('id')
    .single();
  if (error) {
    logStoreError('menyimpan sesi', error);
    return jsonError(503, 'Riwayat tidak dapat disimpan. Pastikan migrasi recall_sessions sudah dijalankan.');
  }
  // Hasil tiap soal menggeser jadwal pengulangan kata/collocation-nya.
  await applyRecallResults(supabase, questions, Date.now());
  return NextResponse.json({ id: data.id, total: questions.length, correct });
}
