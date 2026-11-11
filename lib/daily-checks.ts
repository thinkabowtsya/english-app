import type { PlanTaskId } from '@/lib/daily-plan';
import type { LocalDateKey } from '@/types/learning';

/**
 * Centang manual tugas Kalender (Review, Kosakata, Bicara) per tanggal.
 *
 * - Tamu: disimpan di localStorage perangkat ini.
 * - Login: sumber utama tabel Supabase `daily_checks` (lihat migrasi 20261111120000). Perubahan
 *   langsung ditulis ke Supabase; bila gagal (offline), masuk antrean dan dikirim ulang saat data
 *   dimuat lagi. Centang tamu di perangkat ini dipindahkan ke akun satu kali.
 *
 * Pola subscribe/getSnapshot untuk useSyncExternalStore.
 */

export const CHECKS_KEY = 'english-app:calendar-checks';
const VALID: PlanTaskId[] = ['timer', 'lesson', 'review', 'vocab', 'speaking'];
/** Simpan maksimal ±13 bulan agar data tidak membengkak. */
const MAX_DAYS = 400;

export type DailyChecks = Readonly<Record<LocalDateKey, readonly PlanTaskId[]>>;
export interface CheckOp {
  date: LocalDateKey;
  id: PlanTaskId;
  checked: boolean;
}

/** Akses ke Supabase (disuntikkan oleh lib/storage/actions agar modul ini bebas dari klien). */
export interface ChecksRemote {
  fetch(sinceDate: LocalDateKey): Promise<{ date: LocalDateKey; id: PlanTaskId }[]>;
  apply(ops: CheckOp[]): Promise<void>;
}

const EMPTY: DailyChecks = {};
let cache: DailyChecks | null = null;
let remote: { userId: string; api: ChecksRemote } | null = null;
const listeners = new Set<() => void>();

const cacheKey = () => (remote ? `${CHECKS_KEY}:${remote.userId}` : CHECKS_KEY);
const pendingKey = (userId: string) => `${CHECKS_KEY}:pending:${userId}`;
const migratedKey = (userId: string) => `${CHECKS_KEY}:migrated:${userId}`;

/* ------------------------------- Murni ---------------------------------- */

export function sanitizeChecks(raw: unknown): DailyChecks {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const out: Record<LocalDateKey, PlanTaskId[]> = {};
  for (const [date, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(ids)) continue;
    const valid = ids.filter((id): id is PlanTaskId => VALID.includes(id as PlanTaskId));
    if (valid.length > 0) out[date] = [...new Set(valid)];
  }
  return out;
}

/** Terapkan satu perubahan ke peta centang (tanpa mengubah aslinya). */
export function applyOp(checks: DailyChecks, op: CheckOp): DailyChecks {
  const set = new Set(checks[op.date] ?? []);
  if (op.checked) set.add(op.id);
  else set.delete(op.id);
  const next: Record<LocalDateKey, readonly PlanTaskId[]> = { ...checks };
  if (set.size > 0) next[op.date] = [...set];
  else delete next[op.date];
  const dates = Object.keys(next).sort();
  for (const old of dates.slice(0, Math.max(0, dates.length - MAX_DAYS))) delete next[old];
  return next;
}

/** Baris Supabase → peta centang. */
export function rowsToChecks(rows: { date: LocalDateKey; id: PlanTaskId }[]): DailyChecks {
  return rows.reduce<DailyChecks>((acc, r) => applyOp(acc, { date: r.date, id: r.id, checked: true }), EMPTY);
}

/** Antrean: perubahan terakhir per (tanggal, tugas) yang menang. */
export function mergePending(pending: CheckOp[], op: CheckOp): CheckOp[] {
  return [...pending.filter((p) => !(p.date === op.date && p.id === op.id)), op];
}

/** Semua centang sebagai operasi "dicentang" (untuk memindahkan centang tamu ke akun). */
export function checksToOps(checks: DailyChecks): CheckOp[] {
  return Object.entries(checks).flatMap(([date, ids]) => ids.map((id) => ({ date, id, checked: true })));
}

/* ------------------------------ Penyimpanan ------------------------------ */

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Penyimpanan diblokir: data hanya bertahan selama halaman terbuka.
  }
}

function readPending(userId: string): CheckOp[] {
  const raw = readJson(pendingKey(userId));
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (o): o is CheckOp =>
      !!o &&
      typeof o.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
      VALID.includes(o.id) &&
      typeof o.checked === 'boolean',
  );
}

function setCache(next: DailyChecks) {
  cache = next;
  writeJson(cacheKey(), next);
  for (const l of listeners) l();
}

export function getDailyChecks(): DailyChecks {
  if (typeof window === 'undefined') return EMPTY;
  cache ??= sanitizeChecks(readJson(cacheKey()));
  return cache;
}

export function getServerDailyChecks(): DailyChecks {
  return EMPTY;
}

export function subscribeDailyChecks(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === cacheKey()) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/* ------------------------------ Sinkronisasi ------------------------------ */

/** Status sinkron untuk ditampilkan (null = tidak ada masalah). */
let syncError: string | null = null;
export function getChecksSyncError(): string | null {
  return syncError;
}

function setSyncError(message: string | null) {
  if (syncError === message) return;
  syncError = message;
  for (const l of listeners) l();
}

async function sendPending(userId: string, api: ChecksRemote): Promise<boolean> {
  const pending = readPending(userId);
  if (pending.length === 0) return true;
  try {
    await api.apply(pending);
    // Hanya hapus yang sudah terkirim; perubahan baru selama pengiriman tetap di antrean.
    const sent = new Set(pending.map((p) => `${p.date}|${p.id}|${p.checked}`));
    writeJson(
      pendingKey(userId),
      readPending(userId).filter((p) => !sent.has(`${p.date}|${p.id}|${p.checked}`)),
    );
    return true;
  } catch (error) {
    console.warn('[daily-checks] kirim antrean:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Dipanggil setelah data cloud pengguna dimuat. Mengirim antrean, memindahkan centang tamu
 * (sekali per akun), lalu memuat centang dari Supabase sebagai sumber utama.
 */
export async function loadDailyChecks(userId: string, api: ChecksRemote, sinceDate: LocalDateKey) {
  remote = { userId, api };
  cache = null;
  for (const l of listeners) l();

  if (!readJson(migratedKey(userId))) {
    const guest = sanitizeChecks(readJson(CHECKS_KEY));
    let pending = readPending(userId);
    for (const op of checksToOps(guest)) pending = mergePending(pending, op);
    writeJson(pendingKey(userId), pending);
    writeJson(migratedKey(userId), true);
  }

  const sent = await sendPending(userId, api);
  try {
    const rows = await api.fetch(sinceDate);
    if (remote?.userId !== userId) return;
    // Antrean yang belum terkirim tetap terlihat di atas data cloud.
    const merged = readPending(userId).reduce(applyOp, rowsToChecks(rows));
    setCache(merged);
    setSyncError(sent ? null : 'Sebagian centang belum tersimpan ke cloud. Dicoba lagi otomatis.');
  } catch (error) {
    console.warn('[daily-checks] muat:', error instanceof Error ? error.message : error);
    setSyncError('Centang kalender belum bisa dimuat dari cloud. Pastikan migrasi daily_checks sudah dijalankan.');
  }
}

/** Logout: kembali ke mode tamu (centang akun tetap aman di Supabase). */
export function resetDailyChecks() {
  remote = null;
  cache = null;
  setSyncError(null);
  for (const l of listeners) l();
}

/** Centang / batalkan satu tugas pada satu tanggal. */
export function toggleDailyCheck(date: LocalDateKey, id: PlanTaskId) {
  const checked = !(getDailyChecks()[date] ?? []).includes(id);
  const op: CheckOp = { date, id, checked };
  setCache(applyOp(getDailyChecks(), op));

  if (!remote) return;
  const { userId, api } = remote;
  writeJson(pendingKey(userId), mergePending(readPending(userId), op));
  void sendPending(userId, api).then((ok) =>
    setSyncError(ok ? null : 'Centang belum tersimpan ke cloud (offline?). Dicoba lagi otomatis.'),
  );
}

export function checksFor(checks: DailyChecks, date: LocalDateKey): ReadonlySet<PlanTaskId> {
  return new Set(checks[date] ?? []);
}
