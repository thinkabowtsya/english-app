import type { PlanTaskId } from '@/lib/daily-plan';
import type { LocalDateKey } from '@/types/learning';

/**
 * Centang manual tugas Kalender (Kosakata, Bicara, Review) per tanggal. Disimpan di localStorage
 * per perangkat; tugas Materi & target waktu dicentang otomatis dari data yang tersinkron ke cloud.
 * Pola subscribe/getSnapshot untuk useSyncExternalStore.
 */

export const CHECKS_KEY = 'english-app:calendar-checks';
const VALID: PlanTaskId[] = ['timer', 'lesson', 'review', 'vocab', 'speaking'];
/** Simpan maksimal ±13 bulan agar data tidak membengkak. */
const MAX_DAYS = 400;

export type DailyChecks = Readonly<Record<LocalDateKey, readonly PlanTaskId[]>>;

const EMPTY: DailyChecks = {};
let cache: DailyChecks | null = null;
const listeners = new Set<() => void>();

function sanitize(raw: unknown): DailyChecks {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const out: Record<LocalDateKey, PlanTaskId[]> = {};
  for (const [date, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Array.isArray(ids)) continue;
    const valid = ids.filter((id): id is PlanTaskId => VALID.includes(id as PlanTaskId));
    if (valid.length > 0) out[date] = [...new Set(valid)];
  }
  return out;
}

function load(): DailyChecks {
  try {
    const raw = window.localStorage.getItem(CHECKS_KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getDailyChecks(): DailyChecks {
  if (typeof window === 'undefined') return EMPTY;
  cache ??= load();
  return cache;
}

export function getServerDailyChecks(): DailyChecks {
  return EMPTY;
}

export function subscribeDailyChecks(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === CHECKS_KEY) {
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

/** Centang / batalkan satu tugas pada satu tanggal. */
export function toggleDailyCheck(date: LocalDateKey, id: PlanTaskId) {
  const current = getDailyChecks();
  const set = new Set(current[date] ?? []);
  if (set.has(id)) set.delete(id);
  else set.add(id);

  const next: Record<LocalDateKey, readonly PlanTaskId[]> = { ...current };
  if (set.size > 0) next[date] = [...set];
  else delete next[date];
  // Buang tanggal tertua bila terlalu banyak.
  const dates = Object.keys(next).sort();
  for (const old of dates.slice(0, Math.max(0, dates.length - MAX_DAYS))) delete next[old];

  cache = next;
  try {
    window.localStorage.setItem(CHECKS_KEY, JSON.stringify(next));
  } catch {
    // Penyimpanan diblokir: centang hanya bertahan selama halaman terbuka.
  }
  for (const l of listeners) l();
}

export function checksFor(checks: DailyChecks, date: LocalDateKey): ReadonlySet<PlanTaskId> {
  return new Set(checks[date] ?? []);
}
