import type { CoachRequest, CoachResponse, CoachStatus } from '@/types/ai';

/**
 * Klien browser untuk /api/coach. Browser tidak pernah memanggil Groq langsung —
 * semua permintaan lewat Route Handler yang menyimpan API key di server.
 */

export class CoachApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CoachApiError';
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // abaikan
  }
  return res.status === 429 ? 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' : 'Terjadi kesalahan pada server.';
}

export async function sendCoachRequest(request: CoachRequest, signal?: AbortSignal): Promise<CoachResponse> {
  let res: Response;
  try {
    res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new CoachApiError('Tidak dapat terhubung ke server. Periksa koneksi internet.', 0);
  }
  if (!res.ok) throw new CoachApiError(await readError(res), res.status);
  return (await res.json()) as CoachResponse;
}

export async function fetchCoachStatus(signal?: AbortSignal): Promise<CoachStatus> {
  const res = await fetch('/api/coach', { signal, cache: 'no-store' });
  if (!res.ok) throw new CoachApiError(await readError(res), res.status);
  return (await res.json()) as CoachStatus;
}
