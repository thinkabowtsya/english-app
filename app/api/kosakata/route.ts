import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { readLearnedProgress } from '@/lib/server/vocab-progress';
import { createServerSupabase } from '@/lib/supabase/server';
import type { VocabProgress } from '@/lib/vocab-progress';

/** Progres kosakata (Oxford 3000 & collocation) + jadwal pengulangan, untuk Kosakata saya & Dashboard. */
export async function GET(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return NextResponse.json({ oxford: [], collocation: [], storage: 'guest' } satisfies VocabProgress);

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.json({ oxford: [], collocation: [], storage: 'unavailable' } satisfies VocabProgress);

  const [oxford, collocation] = await Promise.all([
    readLearnedProgress(supabase, 'oxford'),
    readLearnedProgress(supabase, 'collocation'),
  ]);
  if (!oxford || !collocation) {
    return NextResponse.json({ oxford: [], collocation: [], storage: 'unavailable' } satisfies VocabProgress);
  }
  return NextResponse.json({ oxford, collocation, storage: 'saved' } satisfies VocabProgress);
}
