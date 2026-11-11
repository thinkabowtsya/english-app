import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { Alert } from '@/components/ui/feedback';
import { getSupabaseEnv, safeNextPath } from '@/lib/supabase/env';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Login' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const configured = getSupabaseEnv() !== null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="text-xl font-semibold text-fg">My Journey</h1>
          <p className="mt-1 text-sm text-muted">Masuk ke workspace belajar pribadimu.</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          {configured ? (
            <LoginForm next={safeNextPath(next)} />
          ) : (
            <Alert tone="warning" title="Supabase belum dikonfigurasi">
              Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Lokal: di .env.local, lalu restart
              dev server. Netlify: di Site configuration → Environment variables, lalu jalankan ulang deploy (Clear
              cache and deploy site) — nilai NEXT_PUBLIC_* ditanam saat build, jadi tanpa deploy ulang tidak berubah.
            </Alert>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Aplikasi pribadi — tidak ada pendaftaran publik. Akun dibuat lewat Supabase Dashboard.
        </p>
      </div>
    </div>
  );
}
