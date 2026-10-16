import 'server-only';
import { getAuthenticatedUserId } from '@/lib/supabase/server';
import { getClientIp } from './rate-limit';

/**
 * Login bersifat opsional — jika pengguna belum login, dikembalikan ID tamu
 * berbasis IP agar semua fitur (termasuk AI) tetap bisa dipakai.
 * Kode auth Supabase tidak disentuh; login tetap berfungsi penuh.
 */
export async function requireUser(
  request?: Request,
): Promise<{ userId: string; isGuest: boolean } | { response: Response }> {
  const userId = await getAuthenticatedUserId();
  if (userId) return { userId, isGuest: false };

  // Tamu: gunakan IP sebagai kunci unik (hanya untuk rate-limit, tidak disimpan ke DB).
  const ip = request ? getClientIp(request) : 'guest';
  return { userId: `guest:${ip}`, isGuest: true };
}
