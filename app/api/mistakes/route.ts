import { NextResponse } from 'next/server';
import { mistakesFromCall, mistakesFromPractice, type MistakeDraft } from '@/lib/mistake-extract';
import type { MistakeEntry } from '@/lib/mistakes';
import type { PracticeItem, PracticeKind } from '@/lib/practice';
import { requireUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { saveMistakes } from '@/lib/server/mistakes';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Buku kesalahan (tabel mistakes).
 * GET: kesalahan terbuka & teratasi (terbaru dulu). POST: pindai riwayat Telepon AI & latihan yang
 * belum pernah dikumpulkan (aman diulang; yang sudah ada tidak dobel).
 */

const LIST_LIMIT = 500;
/** Sesi terbaru yang dipindai per sumber. */
const SCAN_LIMIT = 60;

interface MistakeRow {
  id: string;
  source: 'call' | 'practice';
  pattern: MistakeEntry['pattern'];
  wrong: string;
  correct: string;
  explanation: string | null;
  context: string | null;
  status: MistakeEntry['status'];
  created_at: string;
}

function logStoreError(action: string, error: { message: string; code?: string }) {
  console.warn(`[api/mistakes] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return NextResponse.json({ entries: [], storage: 'guest' });

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ entries: [], storage: 'unavailable' });

  const { data, error } = await supabase
    .from('mistakes')
    .select('id, source, pattern, wrong, correct, explanation, context, status, created_at')
    .in('status', ['open', 'resolved'])
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (error) {
    logStoreError('membaca', error);
    return NextResponse.json({ entries: [], storage: 'unavailable' });
  }
  const entries: MistakeEntry[] = (data as MistakeRow[]).map((r) => ({
    id: r.id,
    source: r.source,
    pattern: r.pattern,
    wrong: r.wrong,
    correct: r.correct,
    explanation: r.explanation,
    context: r.context,
    status: r.status,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ entries, storage: 'saved' });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return jsonError(401, 'Login untuk memakai Buku kesalahan.');
  const supabase = await createServerSupabase();
  if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

  const [known, calls, practices] = await Promise.all([
    supabase.from('mistakes').select('source_ref').limit(10_000),
    supabase.from('call_sessions').select('id, lines').order('created_at', { ascending: false }).limit(SCAN_LIMIT),
    supabase
      .from('practice_sessions')
      .select('id, kind, items')
      .order('created_at', { ascending: false })
      .limit(SCAN_LIMIT),
  ]);
  const error = known.error ?? calls.error ?? practices.error;
  if (error) {
    logStoreError('memindai riwayat', error);
    return jsonError(503, 'Riwayat tidak dapat dipindai.');
  }

  const seen = new Set((known.data as { source_ref: string }[]).map((r) => r.source_ref));
  const drafts: MistakeDraft[] = [
    ...(calls.data as { id: string; lines: { role: string; text: string; correction?: unknown }[] }[])
      .filter((c) => !seen.has(c.id))
      .flatMap((c) => mistakesFromCall(c.id, Array.isArray(c.lines) ? c.lines : [])),
    ...(practices.data as { id: string; kind: PracticeKind; items: PracticeItem[] }[])
      .filter((p) => !seen.has(p.id))
      .flatMap((p) => mistakesFromPractice(p.id, p.kind, Array.isArray(p.items) ? p.items : [])),
  ];
  const added = await saveMistakes(supabase, drafts);
  return NextResponse.json({ added });
}
