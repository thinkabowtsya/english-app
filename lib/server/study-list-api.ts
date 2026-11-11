import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { createServerSupabase } from '@/lib/supabase/server';
import { learnedColumns } from '@/lib/srs';
import { parseAiStudyDetail, type StudyDetail, type StudyStorage } from '@/lib/study-list';
import { lookupPronunciation } from '@/lib/vocab/enrich';
import { requireUser } from './auth';
import { jsonError, readJsonBody } from './http';
import { enforceAiRateLimit } from './rate-limit';

/**
 * Route handler bersama untuk menu daftar belajar (Oxford 3000, Collocation).
 * Tabel Supabase-nya berbentuk sama: (user_id, <column>) sebagai primary key, detail jsonb,
 * learned_at timestamptz — lihat migrasi oxford_words & collocation_progress.
 */
export interface StudyListConfig<T> {
  /** Untuk log server, mis. 'api/oxford'. */
  name: string;
  table: string;
  /** Kolom kunci item (bersama user_id menjadi primary key). */
  column: string;
  /** Pesan untuk item yang tidak ada di daftar. */
  notFound: string;
  find: (item: string) => T | undefined;
  /** Teks item yang disimpan di tabel. */
  keyOf: (entry: T) => string;
  prompt: (entry: T) => string;
  /** Ambil audio asli dari Free Dictionary (hanya berguna untuk satu kata). */
  withAudio?: boolean;
}

const itemSchema = z.object({ item: z.string().min(1).max(120) });
const patchSchema = itemSchema.extend({ learned: z.boolean() });

function logStoreError(name: string, action: string, error: { message: string; code?: string }) {
  console.warn(`[${name}] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

/** GET: daftar item yang sudah dipelajari. PATCH: tandai / batalkan satu item. */
export function createProgressHandlers<T>(config: StudyListConfig<T>) {
  async function GET(req: Request) {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;
    if (auth.isGuest) return NextResponse.json({ learned: [], storage: 'guest' satisfies StudyStorage });

    const supabase = await createServerSupabase();
    if (!supabase) return NextResponse.json({ learned: [], storage: 'unavailable' satisfies StudyStorage });

    const { data, error } = await supabase.from(config.table).select(config.column).not('learned_at', 'is', null);
    if (error) {
      logStoreError(config.name, 'membaca progres', error);
      return NextResponse.json({ learned: [], storage: 'unavailable' satisfies StudyStorage });
    }
    return NextResponse.json({
      learned: (data as unknown as Record<string, string>[]).map((r) => r[config.column]),
      storage: 'saved' satisfies StudyStorage,
    });
  }

  async function PATCH(req: Request) {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const body = await readJsonBody(req, patchSchema, 1024);
    if (!body.ok) return body.response;
    const entry = config.find(body.data.item);
    if (!entry) return jsonError(400, config.notFound);
    if (auth.isGuest) return jsonError(401, 'Login untuk menyimpan progres.');

    const supabase = await createServerSupabase();
    if (!supabase) return jsonError(503, 'Penyimpanan belum dikonfigurasi.');

    const item = config.keyOf(entry);
    const { learned } = body.data;
    const { error } = await supabase
      .from(config.table)
      // Menandai dipelajari juga memulai jadwal pengulangan (ulang besok); membatalkan menghapus jadwal.
      .upsert({ [config.column]: item, ...learnedColumns(learned, Date.now()) }, { onConflict: `user_id,${config.column}` });
    if (error) {
      logStoreError(config.name, 'menyimpan progres', error);
      return jsonError(503, `Progres tidak dapat disimpan. Pastikan migrasi ${config.table} sudah dijalankan.`);
    }
    return NextResponse.json({ item, learned });
  }

  return { GET, PATCH };
}

/**
 * POST: detail satu item. Dibuat AI (Groq) saat pertama kali dibuka, lalu disimpan di kolom
 * detail agar membuka ulang tidak memanggil AI lagi.
 */
export function createDetailHandler<T>(config: StudyListConfig<T>) {
  return async function POST(req: Request) {
    const auth = await requireUser(req);
    if ('response' in auth) return auth.response;

    const body = await readJsonBody(req, itemSchema, 1024);
    if (!body.ok) return body.response;
    const entry = config.find(body.data.item);
    if (!entry) return jsonError(400, config.notFound);
    const item = config.keyOf(entry);

    const supabase = auth.isGuest ? null : await createServerSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from(config.table)
        .select('detail')
        .eq(config.column, item)
        .maybeSingle();
      if (error) logStoreError(config.name, 'membaca detail', error);
      else if (data?.detail) return NextResponse.json({ detail: data.detail as StudyDetail });
    }

    const limited = enforceAiRateLimit(req, auth.userId);
    if (limited) return limited;
    if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

    let detail: StudyDetail | null;
    try {
      const [completion, pron] = await Promise.all([
        getGroq().chat.completions.create({
          model: MAIN_MODEL,
          messages: [
            { role: 'system', content: config.prompt(entry) },
            { role: 'user', content: `Explain "${item}" now.` },
          ],
          temperature: 0.4,
          response_format: { type: 'json_object' },
          ...modelOptions(),
        }),
        config.withAudio ? lookupPronunciation(item) : Promise.resolve({ audioUrl: undefined }),
      ]);
      detail = parseAiStudyDetail(JSON.parse(completion.choices[0]?.message?.content || '{}'), item);
      if (detail && pron.audioUrl) detail.audioUrl = pron.audioUrl;
    } catch (error: unknown) {
      console.error(`[${config.name}]`, error instanceof Error ? error.message : error);
      return jsonError(502, 'Gagal membuat penjelasan. Coba lagi nanti.');
    }
    if (!detail) return jsonError(502, 'Penjelasan dari AI tidak lengkap. Coba lagi.');

    if (supabase) {
      const { error } = await supabase
        .from(config.table)
        .upsert({ [config.column]: item, detail }, { onConflict: `user_id,${config.column}` });
      if (error) logStoreError(config.name, 'menyimpan detail', error);
    }
    return NextResponse.json({ detail });
  };
}
