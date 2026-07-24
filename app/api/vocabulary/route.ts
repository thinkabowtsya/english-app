import { NextRequest, NextResponse } from 'next/server';
import { groq, MAIN_MODEL } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const { category = 'Daily', level = 'B2', count = 6 } = await req.json();

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

    const completion = await groq.chat.completions.create({
      model: MAIN_MODEL,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{"items":[]}';
    const parsed = JSON.parse(content);

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error('Groq Vocabulary API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate vocabulary';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
