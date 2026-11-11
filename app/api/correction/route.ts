import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';
import { ignoreSpeechFormatting } from '@/lib/correction-filter';
import { PATTERN_PROMPT_LIST } from '@/lib/mistakes';
import type { Correction } from '@/lib/types';

function isCorrection(data: unknown): data is Correction {
  const d = data as Partial<Correction> | null;
  return !!d && typeof d.score === 'number' && Array.isArray(d.mistakes) && typeof d.originalText === 'string' && typeof d.correctedText === 'string';
}

/**
 * Endpoint lama untuk koreksi grammar di /practice dan /call. Format respons dipertahankan.
 * /call mengirim mode 'speech' agar huruf kapital & tanda baca dari pengenalan suara tidak dinilai.
 */

const schema = z.object({
  text: z.string().trim().min(1).max(2_000),
  userLevel: z.string().max(40).default('Intermediate'),
  /** 'speech': teks hasil pengenalan suara — huruf kapital & tanda baca tidak dinilai. */
  mode: z.enum(['text', 'speech']).default('text'),
});

const SPEECH_RULES = `
The input is an automatic speech-to-text transcript of the learner SPEAKING, not typed text.
- IGNORE capitalization completely (e.g. a lowercase first letter or lowercase "i" is NOT a mistake).
- IGNORE punctuation completely (missing periods, commas, question marks, apostrophes are NOT mistakes).
- Do not report spelling of words that are clearly transcription artifacts; judge only what was said: grammar, word choice, and naturalness.
- Never mention capitalization or punctuation in "summary", "mistakes", or "grammarTip".`;

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 16 * 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

  const { text, userLevel, mode } = body.data;

  const systemPrompt = `You are an expert English Language Assessor and Grammar Coach for Indonesian learners.
Analyze the user's spoken or written English input and provide constructive feedback in JSON format.
Target Level: ${userLevel}
${mode === 'speech' ? SPEECH_RULES : ''}

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
      "explanation": string (clear explanation in Indonesian),
      "pattern": string (one id from the PATTERNS list below)
    }
  ],
  "nativeSuggestions": [
    string (2 to 3 natural ways a native speaker would say this sentence)
  ],
  "grammarTip": string (1 concise actionable rule or tip in Indonesian)
}

PATTERNS (use the id of the rule the mistake breaks):
${PATTERN_PROMPT_LIST}

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
    // Pengaman tambahan: buang "kesalahan" yang hanya beda kapital/tanda baca untuk ucapan.
    if (mode === 'speech' && isCorrection(data)) data = ignoreSpeechFormatting(data);
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[api/correction]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Analisis grammar gagal. Coba lagi nanti.');
  }
}
