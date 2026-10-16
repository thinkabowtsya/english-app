import type { SupabaseClient } from '@supabase/supabase-js';
import { minutesToMs } from '@/lib/date';
import { createId, createUuid, isUuid } from '@/lib/id';
import { getBrowserSupabase } from '@/lib/supabase/client';
import {
  HEARTBEAT_INTERVAL_MS,
  createTimer,
  finalizeTimer,
  pauseTimer,
  reconcileTimer,
  resumeTimer,
  shouldRecordSession,
  touchTimer,
} from '@/lib/timer';
import type { AppData, LearningSession, LessonProgress, ReviewItem, Settings } from '@/types/learning';
import { addToOutbox, clearOutbox, readOutbox, removeFromOutbox } from './outbox';
import { LEGACY_DATA_KEY, loadPrefs, savePrefs, type LocalPrefs } from './prefs';
import {
  buildAppData,
  deleteAllProgress,
  deleteReviewRow,
  fetchCloudData,
  insertSessions,
  isValidSessionForCloud,
  rowToSettings,
  upsertProgress,
  upsertReviews,
  upsertSettings,
  type SyncedSettings,
} from './remote';
import { migrateData, DEFAULT_SETTINGS } from './schema';
import {
  getActiveTimer,
  getCloudState,
  getData,
  setActiveTimer,
  setCloudState,
  setData,
  setLastFinished,
  updateData,
} from './store';

const DAY_MS = 86_400_000;

/* ------------------------------ Sinkronisasi ----------------------------- */

const SYNC_ERROR =
  'Sebagian perubahan gagal disimpan ke cloud. Muat ulang data untuk melihat kondisi yang benar-benar tersimpan.';

let inflightWrites = 0;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Menyimpan perubahan: ke Supabase bila login, ke localStorage bila tamu (tamu tidak
 * pernah menghubungi Supabase). Kegagalan cloud ditampilkan ke pengguna, tidak disembunyikan.
 */
async function cloudWrite(label: string, write: (sb: SupabaseClient) => Promise<void>): Promise<boolean> {
  if (getCloudState().userId === null) return persistGuestData();
  inflightWrites++;
  try {
    await write(getBrowserSupabase());
    return true;
  } catch (error) {
    console.error(`[sync] ${label}:`, errorMessage(error));
    setCloudState({ syncError: SYNC_ERROR });
    return false;
  } finally {
    inflightWrites--;
  }
}

export function hasInflightWrites() {
  return inflightWrites > 0;
}

/** Memuat seluruh data belajar pengguna dari Supabase (dipanggil saat app dibuka / tab aktif lagi). */
export async function loadCloudData(userId: string) {
  const previous = getCloudState();
  if (previous.userId !== userId) setData(null);
  setCloudState({ userId, status: getData() ? 'ready' : 'loading', loadError: null });
  try {
    const remote = await fetchCloudData(getBrowserSupabase());
    const outbox = readOutbox(userId);
    const savedIds = new Set(remote.sessions.map((s) => s.id));
    const alreadySaved = outbox.filter((s) => savedIds.has(s.id)).map((s) => s.id);
    if (alreadySaved.length) removeFromOutbox(userId, alreadySaved);
    const pending = outbox.filter((s) => !savedIds.has(s.id));

    setData(
      buildAppData({
        sessions: remote.sessions,
        pendingSessions: pending,
        progress: remote.progress,
        reviews: remote.reviews,
        settings: { ...rowToSettings(remote.settings), ...loadPrefs() },
        now: Date.now(),
      }),
    );
    setCloudState({ status: 'ready', pendingSessions: pending.length, syncError: null });
    if (pending.length) void flushOutbox();
  } catch (error) {
    console.error('[sync] load:', errorMessage(error));
    setCloudState({
      status: getData() ? 'ready' : 'error',
      loadError: 'Gagal memuat data dari cloud. Periksa koneksi internet lalu coba lagi.',
    });
  }
}

let flushing: Promise<void> | null = null;

/** Mengirim sesi yang tertunda. Aman dipanggil berulang (idempoten berdasarkan ID sesi). */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const userId = getCloudState().userId;
    if (!userId) return;
    const pending = readOutbox(userId);
    if (pending.length === 0) {
      setCloudState({ pendingSessions: 0 });
      return;
    }
    const valid = pending.filter(isValidSessionForCloud);
    if (valid.length !== pending.length) {
      console.warn('[sync] sesi tidak valid dibuang dari antrean:', pending.length - valid.length);
    }
    try {
      await insertSessions(getBrowserSupabase(), valid);
      removeFromOutbox(
        userId,
        pending.map((s) => s.id),
      );
      setCloudState({ pendingSessions: 0 });
    } catch (error) {
      console.error('[sync] sessions:', errorMessage(error));
      setCloudState({ pendingSessions: pending.length });
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Membersihkan state di memori saat logout (data cloud tetap aman di Supabase). */
export function clearClientState() {
  setActiveTimer(null);
  setLastFinished(null);
  setData(null);
  setCloudState({ status: 'idle', userId: null, loadError: null, syncError: null, pendingSessions: 0 });
}

/* ----------------------------- Mode Tamu ----------------------------- */

export const GUEST_DATA_KEY = 'english-app:guest-data';

/** Menyimpan seluruh data tamu ke localStorage. Mengembalikan false bila gagal. */
function persistGuestData(): boolean {
  const current = getData();
  if (!current || getCloudState().userId !== null) return false;
  try {
    window.localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(current));
    return true;
  } catch {
    setCloudState({ syncError: 'Data tidak dapat disimpan di browser ini (penyimpanan penuh atau diblokir).' });
    return false;
  }
}

/**
 * Memuat data belajar dari localStorage untuk pengguna tamu (tanpa login).
 * Dipanggil oleh GuestDataLoader saat tidak ada userId.
 */
export function loadLocalData() {
  if (getData()) return; // sudah dimuat
  setCloudState({ status: 'loading', userId: null, loadError: null });
  try {
    // Data tamu; jika belum ada, lanjutkan dari data lokal versi lama (sebelum login ada).
    const raw =
      typeof window !== 'undefined'
        ? (window.localStorage.getItem(GUEST_DATA_KEY) ?? window.localStorage.getItem(LEGACY_DATA_KEY))
        : null;
    const now = Date.now();
    let appData;
    if (raw) {
      const result = migrateData(JSON.parse(raw), now);
      appData = result.ok
        ? { ...result.data, settings: { ...result.data.settings, ...loadPrefs() } }
        : buildGuestDefaults(now);
    } else {
      appData = buildGuestDefaults(now);
    }
    setData(appData);
    setCloudState({ status: 'ready' });
  } catch {
    setData(buildGuestDefaults(Date.now()));
    setCloudState({ status: 'ready' });
  }
}

function buildGuestDefaults(now: number): AppData {
  const prefs = typeof window !== 'undefined' ? loadPrefs() : DEFAULT_SETTINGS;
  return {
    schemaVersion: 1,
    createdAt: now,
    settings: { ...DEFAULT_SETTINGS, ...prefs },
    sessions: [],
    lessons: {},
    reviews: [],
    evaluations: [],
    lastLessonId: null,
  };
}

/* ----------------------------- Sesi & timer ----------------------------- */

/** Menambahkan sesi ke riwayat. Idempoten berdasarkan ID sesi (aman dari klik ganda). */
export function addSessionToData(data: AppData, session: LearningSession): AppData {
  if (!shouldRecordSession(session)) return data;
  if (data.sessions.some((s) => s.id === session.id)) return data;

  let lessons = data.lessons;
  if (session.lessonId && lessons[session.lessonId]) {
    const prev = lessons[session.lessonId];
    lessons = {
      ...lessons,
      [session.lessonId]: {
        ...prev,
        timeSpentMs: prev.timeSpentMs + session.actualMs,
        lastStudiedAt: Math.max(prev.lastStudiedAt ?? 0, session.endedAt),
      },
    };
  }
  return { ...data, sessions: [...data.sessions, session], lessons };
}

function finishTimer(session: LearningSession) {
  setActiveTimer(null);
  if (!shouldRecordSession(session)) {
    setLastFinished(null);
    return;
  }
  const userId = getCloudState().userId;
  if (userId) {
    // Simpan dulu ke antrean lokal agar tidak hilang bila jaringan gagal, lalu kirim.
    addToOutbox(userId, session);
    setCloudState({ pendingSessions: readOutbox(userId).length });
  }
  updateData((data) => addSessionToData(data, session));
  if (!userId) persistGuestData();
  setLastFinished(session);
  void flushOutbox();
}

export function startTimer(minutes: number, lessonId: string | null, now = Date.now()) {
  if (getActiveTimer()) return null;
  const timer = createTimer({ id: createUuid(), targetMs: minutesToMs(minutes), lessonId, now });
  setActiveTimer(timer);
  setLastFinished(null);
  return timer;
}

export function pauseActiveTimer(now = Date.now()) {
  const timer = getActiveTimer();
  if (timer) setActiveTimer(pauseTimer(timer, now));
}

export function resumeActiveTimer(now = Date.now()) {
  const timer = getActiveTimer();
  if (timer) setActiveTimer(resumeTimer(timer, now));
}

export function linkActiveTimerToLesson(lessonId: string | null) {
  const timer = getActiveTimer();
  if (timer) setActiveTimer({ ...timer, lessonId });
}

/**
 * Menghentikan sesi lebih awal. Jika ternyata waktunya sudah habis, sesi dicatat sebagai
 * `completed`. Mengembalikan sesi yang tercatat (atau null jika tidak ada sesi aktif).
 */
export function stopActiveTimer(now = Date.now()): LearningSession | null {
  const timer = getActiveTimer();
  if (!timer) return null;
  const reconciled = reconcileTimer(timer, now);
  const session =
    reconciled.kind === 'finished' ? reconciled.session : finalizeTimer(reconciled.timer, now, 'stopped');
  finishTimer(session);
  return session;
}

/** Tick periodik: menyelesaikan timer yang habis dan memperbarui heartbeat. */
export function reconcileActiveTimer(now = Date.now()): LearningSession | null {
  const timer = getActiveTimer();
  if (!timer) return null;
  const result = reconcileTimer(timer, now);
  if (result.kind === 'finished') {
    finishTimer(result.session);
    return result.session;
  }
  if (result.changed) {
    setActiveTimer(result.timer);
  } else if (timer.status === 'running' && now - timer.lastSeenAt >= HEARTBEAT_INTERVAL_MS) {
    setActiveTimer(touchTimer(timer, now));
  }
  return null;
}

/** Dipanggil saat tab disembunyikan/ditutup agar waktu aktif terakhir tercatat. */
export function touchActiveTimer(now = Date.now()) {
  const timer = getActiveTimer();
  if (timer?.status === 'running') setActiveTimer(touchTimer(timer, now));
}

/* ------------------------------- Materi -------------------------------- */

function upsertLesson(
  data: AppData,
  lessonId: string,
  moduleId: string,
  patch: (prev: LessonProgress) => LessonProgress,
): AppData {
  const prev: LessonProgress = data.lessons[lessonId] ?? {
    lessonId,
    moduleId,
    status: 'in_progress',
    timeSpentMs: 0,
    lastScore: null,
    lastStudiedAt: null,
    completedAt: null,
  };
  return { ...data, lessons: { ...data.lessons, [lessonId]: patch(prev) } };
}

function saveLesson(lessonId: string) {
  const progress = getData()?.lessons[lessonId];
  if (progress) void cloudWrite('progress', (sb) => upsertProgress(sb, [progress]));
}

/** Mencatat materi terakhir yang dibuka. Tidak memengaruhi streak atau waktu belajar. */
export function markLessonOpened(lessonId: string, moduleId: string, now = Date.now()) {
  const before = getData();
  if (!before || before.lastLessonId === lessonId) return;
  updateData((data) => ({
    ...upsertLesson(data, lessonId, moduleId, (p) => ({ ...p, lastStudiedAt: now })),
    lastLessonId: lessonId,
  }));
  saveLesson(lessonId);
}

export function setLessonStatus(
  lessonId: string,
  moduleId: string,
  status: LessonProgress['status'],
  lessonTitle: string,
  now = Date.now(),
) {
  const before = getData();
  if (!before) return;
  const after = updateData((data) => {
    let next = upsertLesson(data, lessonId, moduleId, (p) => ({
      ...p,
      status,
      lastStudiedAt: now,
      completedAt: status === 'completed' ? now : p.completedAt,
    }));
    const hasOpenReview = next.reviews.some(
      (r) => r.kind === 'lesson' && r.lessonId === lessonId && r.resolvedAt === null,
    );
    if (status === 'needs_review' && !hasOpenReview) {
      next = addReviewToData(
        next,
        {
          kind: 'lesson',
          label: lessonTitle,
          note: null,
          reason: 'Ditandai perlu diulang',
          lessonId,
          source: 'manual',
          nextReviewAt: now + DAY_MS,
        },
        now,
      );
    }
    if (status === 'completed' && hasOpenReview) {
      next = {
        ...next,
        reviews: next.reviews.map((r) =>
          r.kind === 'lesson' && r.lessonId === lessonId && r.resolvedAt === null ? { ...r, resolvedAt: now } : r,
        ),
      };
    }
    return next;
  });
  if (!after) return;
  const changedReviews = after.reviews.filter((r) => !before.reviews.includes(r));
  saveLesson(lessonId);
  if (changedReviews.length) void cloudWrite('reviews', (sb) => upsertReviews(sb, changedReviews));
}

/** Untuk evaluasi materi di tahap kurikulum berikutnya (riwayat evaluasi belum disinkronkan). */
export function recordEvaluation(lessonId: string, moduleId: string, score: number, maxScore: number, now = Date.now()) {
  updateData((data) => {
    const next = upsertLesson(data, lessonId, moduleId, (p) => ({ ...p, lastScore: score, lastStudiedAt: now }));
    return {
      ...next,
      evaluations: [...next.evaluations, { id: createId('e'), lessonId, score, maxScore, takenAt: now }],
    };
  });
  saveLesson(lessonId);
}

/* ------------------------------- Review -------------------------------- */

export type NewReview = Pick<ReviewItem, 'kind' | 'label' | 'note' | 'reason' | 'lessonId' | 'source' | 'nextReviewAt'>;

export function addReviewToData(data: AppData, item: NewReview, now: number): AppData {
  const label = item.label.trim();
  const duplicate = data.reviews.some(
    (r) => r.resolvedAt === null && r.kind === item.kind && r.label.toLowerCase() === label.toLowerCase(),
  );
  if (!label || duplicate) return data;
  const review: ReviewItem = { ...item, label, id: createUuid(), createdAt: now, failCount: 0, resolvedAt: null };
  return { ...data, reviews: [...data.reviews, review] };
}

function saveReview(id: string) {
  const review = getData()?.reviews.find((r) => r.id === id);
  if (review) void cloudWrite('review', (sb) => upsertReviews(sb, [review]));
}

/** Mengembalikan false jika item yang sama sudah ada (atau data belum dimuat). */
export function addReview(item: NewReview, now = Date.now()): boolean {
  const before = getData();
  if (!before) return false;
  const after = updateData((data) => addReviewToData(data, item, now));
  if (!after || after === before) return false;
  saveReview(after.reviews[after.reviews.length - 1].id);
  return true;
}

export function resolveReview(id: string, now = Date.now()) {
  updateData((data) => ({
    ...data,
    reviews: data.reviews.map((r) => (r.id === id ? { ...r, resolvedAt: now } : r)),
  }));
  saveReview(id);
}

/** Menghapus item review (mis. bookmark kosakata dibatalkan). Berbeda dengan resolve: bukan "sudah ingat". */
export function removeReview(id: string) {
  updateData((data) => ({ ...data, reviews: data.reviews.filter((r) => r.id !== id) }));
  void cloudWrite('review delete', (sb) => deleteReviewRow(sb, id));
}

/** Gagal recall: tambah hitungan dan jadwalkan ulang besok. */
export function reviewAgain(id: string, now = Date.now()) {
  updateData((data) => ({
    ...data,
    reviews: data.reviews.map((r) =>
      r.id === id ? { ...r, failCount: r.failCount + 1, nextReviewAt: now + DAY_MS } : r,
    ),
  }));
  saveReview(id);
}

/* ------------------------------ Pengaturan ----------------------------- */

const PREF_KEYS: (keyof LocalPrefs)[] = ['theme', 'soundOnFinish', 'browserNotification'];

/** Pengaturan belajar disimpan ke cloud; preferensi tampilan disimpan di perangkat ini. */
export function updateSettings(patch: Partial<Settings>): Promise<boolean> {
  const after = updateData((data) => ({ ...data, settings: { ...data.settings, ...patch } }));
  if (!after) return Promise.resolve(false);
  const s = after.settings;
  savePrefs({ theme: s.theme, soundOnFinish: s.soundOnFinish, browserNotification: s.browserNotification });

  const syncedChanged = Object.keys(patch).some((k) => !PREF_KEYS.includes(k as keyof LocalPrefs));
  const userId = getCloudState().userId;
  if (!userId) return Promise.resolve(persistGuestData());
  if (!syncedChanged) return Promise.resolve(true);
  const synced: SyncedSettings = {
    displayName: s.displayName,
    dailyGoalMinutes: s.dailyGoalMinutes,
    defaultSessionMinutes: s.defaultSessionMinutes,
    coachDifficulty: s.coachDifficulty,
  };
  return cloudWrite('settings', (sb) => upsertSettings(sb, synced, userId));
}

/** Menghapus seluruh progres di cloud (pengaturan tetap). Pemanggil wajib meminta konfirmasi. */
export async function resetProgress(current: AppData): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = getCloudState().userId;
  if (!userId) {
    setActiveTimer(null);
    setLastFinished(null);
    setData(buildGuestDefaults(Date.now()));
    return persistGuestData() ? { ok: true } : { ok: false, error: 'Reset gagal disimpan di browser ini.' };
  }
  try {
    await deleteAllProgress(getBrowserSupabase(), userId);
  } catch (error) {
    console.error('[sync] reset:', errorMessage(error));
    return { ok: false, error: 'Reset gagal: data di cloud tidak berubah. Periksa koneksi lalu coba lagi.' };
  }
  clearOutbox(userId);
  setActiveTimer(null);
  setLastFinished(null);
  setData(
    buildAppData({ sessions: [], pendingSessions: [], progress: [], reviews: [], settings: current.settings, now: Date.now() }),
  );
  setCloudState({ pendingSessions: 0, syncError: null });
  return { ok: true };
}

/* ------------------------- Impor data lokal lama ------------------------ */

const importedKey = (userId: string) => `english-app:legacy-imported:${userId}`;

export interface LegacySummary {
  sessions: number;
  lessons: number;
  reviews: number;
  imported: boolean;
}

/** Ringkasan data versi lokal lama (sebelum Supabase) di browser ini, atau null jika tidak ada. */
export function getLegacySummary(userId: string): LegacySummary | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_DATA_KEY);
    if (!raw) return null;
    const result = migrateData(JSON.parse(raw), Date.now());
    if (!result.ok) return null;
    const d = result.data;
    const counts = { sessions: d.sessions.length, lessons: Object.keys(d.lessons).length, reviews: d.reviews.length };
    if (counts.sessions + counts.lessons + counts.reviews === 0) return null;
    return { ...counts, imported: window.localStorage.getItem(importedKey(userId)) !== null };
  } catch {
    return null;
  }
}

/** ID lama ("s_<uuid>") → uuid; ID non-uuid diturunkan secara deterministik (SHA-256) agar impor ulang tidak menggandakan data. */
async function legacyIdToUuid(id: string): Promise<string | null> {
  const stripped = id.replace(/^[a-z]_/, '');
  if (isUuid(stripped)) return stripped.toLowerCase();
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`legacy:${id}`)));
  hash[6] = (hash[6] & 0x0f) | 0x40;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = [...hash.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Mengimpor data lokal lama ke akun yang sedang login — hanya atas konfirmasi pengguna.
 * Data lokal tidak dihapus. Data cloud tidak ditimpa: sesi/review dengan ID sama dan progres
 * materi yang sudah ada di cloud dilewati.
 */
export async function importLegacyData(): Promise<
  { ok: true; sessions: number; skipped: number } | { ok: false; error: string }
> {
  const userId = getCloudState().userId;
  const current = getData();
  if (!userId || !current) return { ok: false, error: 'Data cloud belum dimuat.' };
  let legacy: AppData;
  try {
    const result = migrateData(JSON.parse(window.localStorage.getItem(LEGACY_DATA_KEY) ?? 'null'), Date.now());
    if (!result.ok) return { ok: false, error: 'Data lokal lama tidak dapat dibaca.' };
    legacy = result.data;
  } catch {
    return { ok: false, error: 'Data lokal lama tidak dapat dibaca.' };
  }

  const sessions: LearningSession[] = [];
  let skipped = 0;
  for (const s of legacy.sessions) {
    const id = await legacyIdToUuid(s.id);
    const mapped = id ? { ...s, id } : null;
    if (mapped && isValidSessionForCloud(mapped)) sessions.push(mapped);
    else skipped++;
  }
  const openLabels = new Set(
    current.reviews.filter((r) => r.resolvedAt === null).map((r) => `${r.kind}:${r.label.toLowerCase()}`),
  );
  const reviews: ReviewItem[] = [];
  for (const r of legacy.reviews) {
    const id = await legacyIdToUuid(r.id);
    if (!id || (r.resolvedAt === null && openLabels.has(`${r.kind}:${r.label.toLowerCase()}`))) {
      skipped++;
      continue;
    }
    reviews.push({ ...r, id });
  }

  try {
    const sb = getBrowserSupabase();
    await insertSessions(sb, sessions);
    await upsertProgress(sb, Object.values(legacy.lessons), true);
    await upsertReviews(sb, reviews, true);
  } catch (error) {
    console.error('[sync] import:', errorMessage(error));
    return { ok: false, error: 'Impor gagal. Sebagian data mungkin sudah terkirim; impor ulang aman (tidak menggandakan).' };
  }
  try {
    window.localStorage.setItem(importedKey(userId), String(Date.now()));
  } catch {
    // abaikan
  }
  await loadCloudData(userId);
  return { ok: true, sessions: sessions.length, skipped };
}
