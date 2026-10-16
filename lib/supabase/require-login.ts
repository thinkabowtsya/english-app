import 'server-only';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from './server';

/** Untuk halaman yang hanya boleh dibuka pengguna login (mis. materi). Tamu diarahkan ke /login. */
export async function requireLoginPage(nextPath: string) {
  const user = await getAuthenticatedUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}
