import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

/**
 * Memperbarui cookie sesi Supabase di setiap request. Login bersifat opsional (mode tamu):
 * tamu tetap bisa memakai aplikasi dengan data di localStorage. Keamanan data cloud dijamin
 * RLS di database, bukan oleh proxy ini.
 */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const env = getSupabaseEnv();

  // Tanpa konfigurasi Supabase, biarkan request lewat dalam mode lokal.
  if (!env) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Jangan jalankan kode lain di antara createServerClient dan getClaims (sesi bisa tidak sinkron).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (signedIn && pathname === '/login') {
    return copyCookies(response, NextResponse.redirect(new URL('/', request.url)));
  }

  return response;
}

/** Redirect tetap membawa cookie sesi yang baru diperbarui. */
function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  return to;
}

export const config = {
  // Lewati aset statis & file publik.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
