'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

let client: SupabaseClient | null = null;

/** Klien Supabase untuk browser (sesi dibaca dari cookie yang dikelola @supabase/ssr). */
export function getBrowserSupabase(): SupabaseClient {
  if (client) return client;
  const env = getSupabaseEnv();
  if (!env) throw new Error('Supabase belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
  client = createBrowserClient(env.url, env.publishableKey);
  return client;
}
