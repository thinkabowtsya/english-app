import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';

/** Endpoint lama untuk koreksi grammar di /practice dan /call. Format respons dipertahankan. */

const schema = z.object({
  text: z.string().trim().min(1).max(2_000),
  userLevel: z.string().max(40).default('Intermediate'),
});

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 16 * 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

  const { text, userLevel } = body.data;

  const systemPrompt = `You are an expert English Language Assessor and Grammar Coach for Indonesian learners.
Analyze the user's spoken or written English input and provide constructive feedback in JSON format.
Target Level: ${userLevel}

JSON Schema format required:
{
  "originalText": string,
  "correctedText": string,
  "isCorrect": boolean,
  "score": number (0 to 100 based on accuracy, vocabulary, and grammar),
  "summary": string (Brief 1-sentence assessment in Indonesian),
  "mistakes": [
    {
      "type": "grammar" | "vocabulary" | "spelling" | "phrasing" | "punctuation",
      "original": string (the exact snippet with mistake),
      "correction": string (the fix),
      "explanation": string (clear explanation in Indonesian)
    }
  ],
  "nativeSuggestions": [
    string (2 to 3 natural ways a native speaker would say this sentence)
  ],
  "grammarTip": string (1 concise actionable rule or tip in Indonesian)
}

IMPORTANT:
- If the text is completely correct, set isCorrect: true, score: 95-100, mistakes: [].
- Explanations must be easy to understand for an Indonesian student.
- Return ONLY raw JSON without markdown formatting or code blocks (\`\`\`json).`;

  try {
    const completion = await getGroq().chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      ...modelOptions(),
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    let data: unknown;
    try {
      data = JSON.parse(rawContent);
    } catch {
      data = JSON.parse(rawContent.replace(/```json/g, '').replace(/```/g, '').trim());
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[api/correction]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Analisis grammar gagal. Coba lagi nanti.');
  }
}
