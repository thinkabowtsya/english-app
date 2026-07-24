import { NextRequest, NextResponse } from 'next/server';
import { groq, MAIN_MODEL } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const { text, userLevel = 'Intermediate' } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
    }

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

    const completion = await groq.chat.completions.create({
      model: MAIN_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    let data;
    try {
      data = JSON.parse(rawContent);
    } catch {
      const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Groq Correction API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze text';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
