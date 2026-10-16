import type { Settings, ThemePreference } from '@/types/learning';

/**
 * Preferensi UI per perangkat (tidak disinkronkan ke cloud): tema, suara, notifikasi.
 * Disimpan di localStorage; aman hilang karena hanya preferensi tampilan.
 */

export const PREFS_KEY = 'english-app:prefs';
/** Kunci data lokal versi lama (sebelum Supabase). Dibaca untuk impor & migrasi preferensi. */
export const LEGACY_DATA_KEY = 'english-app:data';

export type LocalPrefs = Pick<Settings, 'theme' | 'soundOnFinish' | 'browserNotification'>;

export const DEFAULT_PREFS: LocalPrefs = { theme: 'system', soundOnFinish: true, browserNotification: false };

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

function sanitize(raw: unknown): LocalPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    theme: THEMES.includes(r.theme as ThemePreference) ? (r.theme as ThemePreference) : DEFAULT_PREFS.theme,
    soundOnFinish: typeof r.soundOnFinish === 'boolean' ? r.soundOnFinish : DEFAULT_PREFS.soundOnFinish,
    browserNotification:
      typeof r.browserNotification === 'boolean' ? r.browserNotification : DEFAULT_PREFS.browserNotification,
  };
}

export function loadPrefs(): LocalPrefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) return sanitize(JSON.parse(raw));
    // Pertama kali: ambil dari pengaturan versi lokal lama bila ada.
    const legacy = window.localStorage.getItem(LEGACY_DATA_KEY);
    if (legacy) return sanitize((JSON.parse(legacy) as { settings?: unknown }).settings);
  } catch {
    // abaikan: pakai default
  }
  return { ...DEFAULT_PREFS };
}

export function savePrefs(prefs: LocalPrefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Penyimpanan diblokir: preferensi hanya bertahan selama halaman terbuka.
  }
}
