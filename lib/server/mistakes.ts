import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import type { MistakeDraft } from '@/lib/mistake-extract';
import { PATTERN_PROMPT_LIST, isMistakePattern, type MistakePatternId } from '@/lib/mistakes';

/**
 * Menyimpan kesalahan ke Buku kesalahan (tabel mistakes). Kesalahan tanpa pola yang valid
 * (mis. dari riwayat lama) diklasifikasi AI dalam satu panggilan; bila gagal, masuk "other".
 */

const CLASSIFY_BATCH = 60;

const clip = (s: string | undefined, max: number) => (s ? s.trim().slice(0, max) : null);

function logError(action: string, error: { message: string; code?: string }) {
  console.warn(`[mistakes] ${action} gagal (${error.code ?? 'unknown'}): ${error.message}`);
}

async function classify(drafts: MistakeDraft[]): Promise<Map<number, MistakePatternId>> {
  const result = new Map<number, MistakePatternId>();
  if (!drafts.length || !isGroqConfigured()) return result;
  for (let start = 0; start < drafts.length; start += CLASSIFY_BATCH) {
    const batch = drafts.slice(start, start + CLASSIFY_BATCH);
    const spec = batch.map((d, i) => ({ i: start + i, wrong: d.wrong, correct: d.correct, note: d.explanation ?? '' }));
    try {
      const completion = await getGroq().chat.completions.create({
        model: MAIN_MODEL,
        messages: [
          {
            role: 'system',
            content: `Classify each English learner mistake (wrong → correct) by the grammar rule it breaks.
PATTERNS:
${PATTERN_PROMPT_LIST}
Mistakes (JSON):
${JSON.stringify(spec)}
Return ONLY a JSON object: {"patterns": [{"i": number, "pattern": string (pattern id)}]}`,
          },
          { role: 'user', content: 'Classify now.' },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
        ...modelOptions(),
      });
      const raw = JSON.parse(completion.choices[0]?.message?.content || '{}') as { patterns?: { i?: unknown; pattern?: unknown }[] };
      for (const p of raw.patterns ?? []) if (typeof p.i === 'number' && isMistakePattern(p.pattern)) result.set(p.i, p.pattern);
    } catch (error) {
      console.warn('[mistakes] klasifikasi gagal:', error instanceof Error ? error.message : error);
    }
  }
  return result;
}

/** Simpan draf kesalahan; yang sudah pernah disimpan (source_ref + ref_key sama) dilewati. Mengembalikan jumlah draf. */
export async function saveMistakes(supabase: SupabaseClient, drafts: MistakeDraft[]): Promise<number> {
  if (drafts.length === 0) return 0;
  const missing = drafts.flatMap((d, i) => (isMistakePattern(d.pattern) ? [] : [{ d, i }]));
  const classified = await classify(missing.map((m) => m.d));
  const patternOf = new Map<number, MistakePatternId>();
  missing.forEach((m, k) => patternOf.set(m.i, classified.get(k) ?? 'other'));

  const rows = drafts.map((d, i) => ({
    source: d.source,
    source_ref: d.sourceRef,
    ref_key: d.refKey.slice(0, 40),
    pattern: isMistakePattern(d.pattern) ? d.pattern : patternOf.get(i) ?? 'other',
    wrong: d.wrong.trim().slice(0, 500),
    correct: d.correct.trim().slice(0, 500),
    explanation: clip(d.explanation, 800),
    context: clip(d.context, 600),
  }));
  const { error } = await supabase
    .from('mistakes')
    .upsert(rows, { onConflict: 'user_id,source_ref,ref_key', ignoreDuplicates: true });
  if (error) {
    logError('menyimpan kesalahan', error);
    return 0;
  }
  return rows.length;
}

/**
 * Latihan pola berhasil (skor ≥ batas): kesalahan terbuka pola itu yang tercatat sebelum `before`
 * ditandai teratasi. Kesalahan baru (termasuk dari sesi ini) tetap terbuka.
 */
export async function resolvePattern(supabase: SupabaseClient, pattern: MistakePatternId, before: string): Promise<void> {
  const { error } = await supabase
    .from('mistakes')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('pattern', pattern)
    .eq('status', 'open')
    .lt('created_at', before);
  if (error) logError('menandai pola teratasi', error);
}
