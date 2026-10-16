'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeNextPath } from '@/lib/supabase/env';
import { createServerSupabase } from '@/lib/supabase/server';

export interface LoginState {
  error: string | null;
  email: string;
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Format email tidak valid.').max(254),
  password: z.string().min(1, 'Password wajib diisi.').max(200),
});

function messageFor(error: { message?: string; status?: number; code?: string }): string {
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message ?? '')) {
    return 'Email atau password salah.';
  }
  if (error.code === 'email_not_confirmed') {
    return 'Email belum dikonfirmasi. Konfirmasi lewat Supabase Dashboard (Authentication → Users).';
  }
  if (error.status === 429) return 'Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.';
  return 'Login gagal. Periksa koneksi lalu coba lagi.';
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = { email: String(formData.get('email') ?? ''), password: String(formData.get('password') ?? '') };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Input tidak valid.', email: raw.email };

  const supabase = await createServerSupabase();
  if (!supabase) return { error: 'Supabase belum dikonfigurasi di server.', email: raw.email };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Jangan log password/email; cukup kode error.
    console.error('[login]', error.code ?? error.status ?? 'unknown');
    return { error: messageFor(error), email: parsed.data.email };
  }

  redirect(safeNextPath(String(formData.get('next') ?? '/')));
}

export async function logout() {
  const supabase = await createServerSupabase();
  await supabase?.auth.signOut();
  redirect('/login');
}
