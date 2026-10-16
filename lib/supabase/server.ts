import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';

/** Klien Supabase untuk Server Components, Server Actions, dan Route Handlers. */
export async function createServerSupabase() {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Dipanggil dari Server Component (cookie read-only); proxy.ts yang memperbarui sesi.
        }
      },
    },
  });
}

/** Pengguna terverifikasi (JWT diverifikasi lewat getClaims), atau null. */
export async function getAuthenticatedUser(): Promise<{ id: string; email: string | null } | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const email = data.claims.email;
  return { id: sub, email: typeof email === 'string' ? email : null };
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  return (await getAuthenticatedUser())?.id ?? null;
}
