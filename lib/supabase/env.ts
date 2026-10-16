/**
 * Konfigurasi publik Supabase. Publishable key aman di browser HANYA karena seluruh tabel
 * memakai Row Level Security (lihat supabase/migrations). Jangan pernah memakai secret/
 * service-role key di sini.
 */
export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** Path tujuan setelah login: hanya path relatif internal (cegah open redirect). */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}
