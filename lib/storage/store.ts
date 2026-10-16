import type { ActiveTimer, AppData, LearningSession } from '@/types/learning';
import { activeTimerSchema } from './schema';

/**
 * Store di memori untuk data belajar. Sumber utama data persisten adalah Supabase
 * (dimuat oleh actions.loadCloudData). localStorage hanya dipakai untuk:
 * - timer yang sedang berjalan (pemulihan saat reload),
 * - antrean sesi yang belum terkirim (outbox.ts),
 * - preferensi UI per perangkat (prefs.ts).
 *
 * Pola subscribe/getSnapshot dipakai bersama useSyncExternalStore.
 */

export const TIMER_KEY = 'english-app:active-timer';

export interface CloudState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  userId: string | null;
  loadError: string | null;
  /** Ada perubahan yang gagal disimpan ke cloud. */
  syncError: string | null;
  /** Jumlah sesi selesai yang masih menunggu terkirim. */
  pendingSessions: number;
}

type Listener = () => void;

let data: AppData | null = null;
let cloud: CloudState = { status: 'idle', userId: null, loadError: null, syncError: null, pendingSessions: 0 };
let timerCache: ActiveTimer | null | undefined;
let lastFinished: LearningSession | null = null;
const listeners = new Set<Listener>();
let storageListenerAttached = false;

function emit() {
  for (const listener of listeners) listener();
}

function attachStorageListener() {
  if (storageListenerAttached || typeof window === 'undefined') return;
  storageListenerAttached = true;
  // Sinkronisasi timer antar-tab di perangkat yang sama.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === TIMER_KEY) {
      timerCache = undefined;
      emit();
    }
  });
}

export function subscribe(listener: Listener): () => void {
  attachStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* --------------------------------- Data --------------------------------- */

/** Data belajar saat ini, atau null bila belum dimuat dari cloud. */
export function getData(): AppData | null {
  return data;
}

export function setData(next: AppData | null) {
  data = next;
  emit();
}

/** Mengubah data di memori. Penyimpanan ke cloud dilakukan oleh actions. */
export function updateData(updater: (current: AppData) => AppData): AppData | null {
  if (!data) return null;
  const next = updater(data);
  if (next !== data) {
    data = next;
    emit();
  }
  return data;
}

export function getCloudState(): CloudState {
  return cloud;
}

export function setCloudState(patch: Partial<CloudState>) {
  cloud = { ...cloud, ...patch };
  emit();
}

/* --------------------------------- Timer -------------------------------- */

function loadTimer(): ActiveTimer | null {
  try {
    const raw = window.localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const parsed = activeTimerSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function getActiveTimer(): ActiveTimer | null {
  if (timerCache === undefined) timerCache = typeof window === 'undefined' ? null : loadTimer();
  return timerCache;
}

export function setActiveTimer(timer: ActiveTimer | null) {
  timerCache = timer;
  try {
    if (timer) window.localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    else window.localStorage.removeItem(TIMER_KEY);
  } catch {
    // Tanpa localStorage, timer tetap berjalan di memori (tidak bisa dipulihkan setelah reload).
  }
  emit();
}

/* ------------------------------ Ringkasan sesi ----------------------------- */

/** Ringkasan sesi terakhir yang selesai (hanya di memori, untuk dialog ringkasan). */
export function getLastFinished(): LearningSession | null {
  return lastFinished;
}

export function setLastFinished(session: LearningSession | null) {
  lastFinished = session;
  emit();
}
