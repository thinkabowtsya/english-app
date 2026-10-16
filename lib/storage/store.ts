import type { ActiveTimer, AppData, LearningSession } from '@/types/learning';
import { activeTimerSchema, createDefaultData, migrateData } from './schema';

/**
 * Penyimpanan lokal (localStorage) untuk aplikasi personal single-user.
 * localStorage BUKAN penyimpanan aman: jangan simpan secret atau data sensitif di sini.
 *
 * Data dibaca secara lazy di browser (tidak saat render server) dan diekspos lewat
 * pola subscribe/getSnapshot agar bisa dipakai dengan useSyncExternalStore.
 */

export const DATA_KEY = 'english-app:data';
export const TIMER_KEY = 'english-app:active-timer';
const BACKUP_PREFIX = 'english-app:backup:';

type Listener = () => void;

let dataCache: AppData | null = null;
let timerCache: ActiveTimer | null | undefined;
let lastFinished: LearningSession | null = null;
let storageWarning: string | null = null;
const listeners = new Set<Listener>();
let storageListenerAttached = false;

function emit() {
  for (const listener of listeners) listener();
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null): boolean {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch {
    storageWarning =
      'Progres tidak dapat disimpan di browser ini (penyimpanan penuh atau diblokir). Data hanya bertahan sampai halaman ditutup.';
    return false;
  }
}

function backupRaw(raw: string) {
  safeSet(`${BACKUP_PREFIX}${Date.now()}`, raw);
  storageWarning =
    'Data progres lama tidak dapat dibaca dan telah dicadangkan. Aplikasi memulai dengan data baru.';
}

function loadData(): AppData {
  const now = Date.now();
  const raw = safeGet(DATA_KEY);
  if (!raw) return createDefaultData(now);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    backupRaw(raw);
    return createDefaultData(now);
  }
  const result = migrateData(parsed, now);
  if (result.ok) return result.data;
  backupRaw(raw);
  return createDefaultData(now);
}

function loadTimer(): ActiveTimer | null {
  const raw = safeGet(TIMER_KEY);
  if (!raw) return null;
  try {
    const parsed = activeTimerSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function attachStorageListener() {
  if (storageListenerAttached || typeof window === 'undefined') return;
  storageListenerAttached = true;
  // Sinkronisasi antar-tab: invalidasi cache ketika tab lain mengubah data.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === DATA_KEY) dataCache = null;
    if (event.key === null || event.key === TIMER_KEY) timerCache = undefined;
    emit();
  });
}

export function subscribe(listener: Listener): () => void {
  attachStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getData(): AppData {
  if (dataCache === null) dataCache = loadData();
  return dataCache;
}

export function updateData(updater: (current: AppData) => AppData): AppData {
  // Perubahan dari tab lain sudah menginvalidasi cache lewat event `storage`.
  const current = getData();
  const next = updater(current);
  if (next === current) return current;
  dataCache = next;
  safeSet(DATA_KEY, JSON.stringify(next));
  emit();
  return next;
}

export function getActiveTimer(): ActiveTimer | null {
  if (timerCache === undefined) timerCache = loadTimer();
  return timerCache;
}

export function setActiveTimer(timer: ActiveTimer | null) {
  timerCache = timer;
  safeSet(TIMER_KEY, timer ? JSON.stringify(timer) : null);
  emit();
}

/** Ringkasan sesi terakhir yang selesai (hanya di memori, untuk dialog ringkasan). */
export function getLastFinished(): LearningSession | null {
  return lastFinished;
}

export function setLastFinished(session: LearningSession | null) {
  lastFinished = session;
  emit();
}

export function getStorageWarning(): string | null {
  return storageWarning;
}

export function dismissStorageWarning() {
  storageWarning = null;
  emit();
}

/** Menulis ulang seluruh data (dipakai oleh reset progres). */
export function replaceData(next: AppData) {
  dataCache = next;
  safeSet(DATA_KEY, JSON.stringify(next));
  emit();
}
