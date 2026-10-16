import { NextResponse } from 'next/server';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';
import { COACH_LIMITS, coachRequestSchema } from '@/lib/validation/coach';
import { AiProviderError, getCoachService } from '@/services/ai';
import type { CoachResponse, CoachStatus } from '@/types/ai';

/** Status penyedia AI untuk UI (tanpa informasi rahasia). */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  const service = getCoachService();
  const status: CoachStatus = { provider: service.provider, model: service.model };
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(request, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(request, coachRequestSchema, COACH_LIMITS.bodyBytes);
  if (!body.ok) return body.response;

  const service = getCoachService();
  try {
    const reply = await service.respond(body.data);
    const payload: CoachResponse = { reply, provider: service.provider, model: service.model };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Detail hanya dicatat di log server, tidak dikirim ke client.
    console.error('[api/coach]', error instanceof Error ? error.message : error);
    if (error instanceof AiProviderError && error.status === 401) {
      return jsonError(503, 'API key Groq tidak valid atau sudah dicabut. Periksa GROQ_API_KEY di server.');
    }
    if (error instanceof AiProviderError && error.status === 429) {
      return jsonError(503, 'Kuota layanan AI sedang penuh. Coba lagi beberapa saat lagi.');
    }
    return jsonError(502, 'Layanan AI sedang tidak dapat dihubungi. Coba lagi nanti.');
  }
}
