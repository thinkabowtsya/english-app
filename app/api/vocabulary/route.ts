import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';

/** Endpoint lama untuk /vocabulary. Format respons dipertahankan. */

const schema = z.object({
  category: z.enum(['Daily', 'Business', 'Travel', 'Academic', 'Idioms & Slang']).default('Daily'),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).default('B2'),
  count: z.number().int().min(1).max(12).default(6),
});

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 2 * 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

  const { category, level, count } = body.data;

  const systemPrompt = `You are a curriculum developer for English vocabulary learning.
Generate ${count} essential English vocabulary words or idioms for Indonesian learners.
Target Category: ${category}
Target CEFR Level: ${level}

Return ONLY a JSON object formatted as follows:
{
  "items": [
    {
      "id": string (unique slug/id),
      "word": string,
      "phonetic": string (IPA phonetic transcription),
      "partOfSpeech": string (noun, verb, adjective, phrase, idiom, etc.),
      "definitionEn": string (clear definition in simple English),
      "definitionId": string (Indonesian translation of definition),
      "exampleEn": string (natural example sentence in English),
      "exampleId": string (Indonesian translation of example sentence),
      "cefr": "${level}",
      "category": "${category}",
      "collocations": [string, string, string]
    }
  ]
}

DO NOT include markdown code blocks or extra text. Output ONLY valid JSON.`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${count} items now.` },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
      ...modelOptions(),
    });

    const content = completion.choices[0]?.message?.content || '{"items":[]}';
    return NextResponse.json(JSON.parse(content));
  } catch (error: unknown) {
    console.error('[api/vocabulary]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Gagal membuat daftar kosakata. Coba lagi nanti.');
  }
}
