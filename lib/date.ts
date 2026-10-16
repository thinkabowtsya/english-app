import type { LocalDateKey } from '@/types/learning';

const pad = (n: number) => String(n).padStart(2, '0');

/** Kunci tanggal lokal (zona waktu browser), mis. "2026-10-16". */
export function toLocalDateKey(time: number | Date): LocalDateKey {
  const d = typeof time === 'number' ? new Date(time) : time;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Mengubah kunci tanggal kembali menjadi Date pada pukul 00:00 waktu lokal. */
export function fromLocalDateKey(key: LocalDateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Menggeser kunci tanggal sejumlah hari kalender (aman terhadap DST). */
export function addDaysToKey(key: LocalDateKey, days: number): LocalDateKey {
  const d = fromLocalDateKey(key);
  d.setDate(d.getDate() + days);
  return toLocalDateKey(d);
}

/** Selisih hari kalender antara dua kunci tanggal (b - a). */
export function diffDays(a: LocalDateKey, b: LocalDateKey): number {
  const da = fromLocalDateKey(a);
  const db = fromLocalDateKey(b);
  const utcA = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const utcB = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

/** Daftar `count` kunci tanggal terakhir, berakhir di `endKey` (urut lama → baru). */
export function lastNDays(endKey: LocalDateKey, count: number): LocalDateKey[] {
  return Array.from({ length: count }, (_, i) => addDaysToKey(endKey, i - (count - 1)));
}

/** Format milidetik menjadi mm:ss atau h:mm:ss untuk tampilan timer. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Format durasi untuk ringkasan, mis. "1 j 5 mnt", "12 mnt", "45 dtk". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds === 0) return '0 mnt';
  if (totalSeconds < 60) return `${totalSeconds} dtk`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} mnt`;
  return m === 0 ? `${h} j` : `${h} j ${m} mnt`;
}

export const MINUTE_MS = 60_000;

export function minutesToMs(minutes: number): number {
  return Math.round(minutes * MINUTE_MS);
}
