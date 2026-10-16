import 'server-only';
import { NextResponse } from 'next/server';
import type { z } from 'zod';

/** Respons error JSON tanpa detail internal (stack trace, pesan SDK, secret). */
export function jsonError(status: number, message: string, headers?: HeadersInit) {
  return NextResponse.json({ error: message }, { status, headers });
}

export type BodyResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Membaca body JSON dengan batas ukuran, lalu memvalidasinya dengan skema Zod.
 * Batas dicek dari Content-Length dan dari panjang body aktual (header bisa tidak ada/palsu).
 */
export async function readJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes: number,
): Promise<BodyResult<T>> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { ok: false, response: jsonError(415, 'Content-Type harus application/json.') };
  }

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, response: jsonError(413, 'Permintaan terlalu besar.') };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, 'Body permintaan tidak dapat dibaca.') };
  }
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, response: jsonError(413, 'Permintaan terlalu besar.') };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, response: jsonError(400, 'Body harus berupa JSON yang valid.') };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` (${issue.path.join('.')})` : '';
    return { ok: false, response: jsonError(400, `Input tidak valid${where}.`) };
  }
  return { ok: true, data: parsed.data };
}
