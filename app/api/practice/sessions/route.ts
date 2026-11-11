import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  PRACTICE_KIND_IDS,
  practiceScore,
  practiceSessionSchema,
  type PracticeKind,
  type PracticeSessionSummary,
} from '@/lib/practice';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { mistakesFromPractice } from '@/lib/mistake-extract';
import { RESOLVE_SCORE } from '@/lib/mistakes';
import { resolvePattern, saveMistakes } from '@/lib/server/mistakes';
import { applyVocabResults } from '@/lib/server/vocab-progress';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Riwayat latihan (tabel practice_sessions).
 * GET ?kinds=grammar,sentence: daftar sesi terbaru + total. POST: simpan sesi yang selesai;
 * hasil soal kosakata ikut menggeser jadwal pengulangan (lib/srs.ts), dan jawaban salah masuk
 * Buku kesalahan (lib/server/mistakes.ts).
 */

const LIST_LIMIT = 30;

interface SessionRow {
  id: string;
  kind: PracticeKind;
  title: string;
  lesson_id: string | null;
  total: number;
  correct: number;
  score: number;
  created_at: string;
}

const kindsSchema = z.array(z.enum(PRACTICE_KIND_IDS)).min(1).max(PRACTICE_KIND_IDS.length);

function logStoreError(action: string, error: { message: string; code?: string }) {
  console.warn(`[api/practice/sessions] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

const empty = (storage: string) => ({ sessions: [], totals: { sessions: 0, items: 0, correct: 0 }, storage });

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const kinds = kindsSchema.safeParse((new URL(req.url).searchParams.get('kinds') ?? '').split(',').filter(Boolean));
  if (!kinds.success) return jsonError(400, 'Jenis latihan tidak valid.');
  if (auth.isGuest) return NextResponse.json(empty('guest'));

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json(empty('unavailable'));

  const [list, all] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('id, kind, title, lesson_id, total, correct, score, created_at')
      .in('kind', kinds.data)
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT),
    supabase.from('practice_sessions').select('total, correct').in('kind', kinds.data),
  ]);
  const error = list.error ?? all.error;
  if (error) {
    logStoreError('membaca riwayat', error);
    return NextResponse.json(empty('unavailable'));
  }
  const totals = (all.data as { total: number; correct: number }[]).reduce(
    (acc, r) => ({ sessions: acc.sessions + 1, items: acc.items + r.total, correct: acc.correct + r.correct }),
    { sessions: 0, items: 0, correct: 0 },
  );
  const sessions: PracticeSessionSummary[] = (list.data as SessionRow[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    lessonId: r.lesson_id,
    total: r.total,
    correct: r.correct,
    score: r.score,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ sessions, totals, storage: 'saved' });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return jsonError(401, 'Login untuk menyimpan riwayat.');

  const body = await readJsonBody(req, practiceSessionSchema, 256 * 1024);
  if (!body.ok) return body.response;
  const supabase = await createServerSupabase();
  if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

  const { kind, title, lessonId, pattern, items } = body.data;
  const { correct, score } = practiceScore(items);
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('practice_sessions')
    .insert({ kind, title, lesson_id: lessonId, pattern, total: items.length, correct, score, items })
    .select('id')
    .single();
  if (error) {
    logStoreError('menyimpan sesi', error);
    return jsonError(503, 'Riwayat tidak dapat disimpan. Pastikan migrasi practice_sessions sudah dijalankan.');
  }

  const vocabAnswers = items.flatMap((i) => (i.vocab ? [{ ...i.vocab, correct: i.correct }] : []));
  if (vocabAnswers.length) await applyVocabResults(supabase, vocabAnswers, Date.now());

  // Buku kesalahan: latihan pola yang berhasil menandai kesalahan lama pola itu teratasi,
  // lalu jawaban salah di sesi ini dicatat sebagai kesalahan baru.
  const resolved = kind === 'mistakes' && pattern !== null && score >= RESOLVE_SCORE;
  if (resolved) await resolvePattern(supabase, pattern, startedAt);
  const mistakes = await saveMistakes(supabase, mistakesFromPractice(data.id, kind, items));
  return NextResponse.json({ id: data.id, correct, score, mistakes, resolved });
}
