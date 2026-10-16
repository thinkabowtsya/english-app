import 'server-only';
import { jsonError } from './http';

/**
 * Rate limiter sliding-window di memori proses.
 *
 * Cukup untuk aplikasi personal di satu server/instance. Pada hosting serverless (mis.
 * Netlify/Vercel) setiap instance punya memori sendiri, jadi batas ini hanya perkiraan —
 * gunakan store terpusat (mis. Upstash Redis) sebelum aplikasi dipublikasikan luas.
 */

const buckets = new Map<string, number[]>();
const MAX_KEYS = 5_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }

  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= windowStart)) buckets.delete(k);
    }
  }
  return { allowed: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'local';
}

/** Batas gabungan untuk semua endpoint AI: 30 permintaan per menit per pengguna (atau IP). */
export const AI_RATE_LIMIT = { limit: 30, windowMs: 60_000 };

/** Mengembalikan respons 429 jika batas terlampaui, atau null jika boleh lanjut. */
export function enforceAiRateLimit(request: Request, userId?: string) {
  const key = userId ? `ai:user:${userId}` : `ai:ip:${getClientIp(request)}`;
  const result = checkRateLimit(key, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs);
  if (result.allowed) return null;
  return jsonError(429, 'Terlalu banyak permintaan ke AI. Coba lagi sebentar lagi.', {
    'Retry-After': String(result.retryAfterSeconds),
  });
}
