import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/server/auth';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { createServerSupabase } from '@/lib/supabase/server';

/** Ubah status satu kesalahan: 'dismissed' (bukan kesalahan / abaikan) atau kembali 'open'. */

const schema = z.object({ status: z.enum(['open', 'dismissed']) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  if (auth.isGuest) return jsonError(401, 'Login untuk memakai Buku kesalahan.');

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, 'ID tidak valid.');
  const body = await readJsonBody(req, schema, 512);
  if (!body.ok) return body.response;

  const supabase = await createServerSupabase();
  if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

  const { status } = body.data;
  const { error } = await supabase
    .from('mistakes')
    .update({ status, resolved_at: status === 'open' ? null : new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.warn(`[api/mistakes/id] memperbarui gagal (${error.code ?? 'unknown'}): ${error.message}`);
    return jsonError(503, 'Kesalahan tidak dapat diperbarui.');
  }
  return NextResponse.json({ id, status });
}
