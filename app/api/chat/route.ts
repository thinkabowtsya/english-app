import { NextRequest, NextResponse } from 'next/server';
import { groq, MAIN_MODEL } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, scenarioPrompt, userLevel = 'Intermediate', action = 'chat' } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (action === 'translate') {
      const lastMessage = messages[messages.length - 1]?.content;
      const completion = await groq.chat.completions.create({
        model: MAIN_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an accurate English to Indonesian translator. Translate the given English sentence into natural, fluent Indonesian. Provide ONLY the direct translation without extra commentary.'
          },
          { role: 'user', content: lastMessage }
        ],
        temperature: 0.2,
      });

      return NextResponse.json({ translation: completion.choices[0]?.message?.content || '' });
    }

    // Default chat & roleplay handling
    const systemInstruction = `You are "Antigravity English Coach", an empathetic, highly engaging, native English conversational tutor.
Your user is an Indonesian learner practicing English at ${userLevel} level.
Scenario Context: ${scenarioPrompt || 'Casual conversational practice.'}

Guidelines:
1. Act naturally according to the roleplay scenario. Keep responses conversational, warm, concise (2-4 sentences max per response) so the conversation flows smoothly.
2. Adapt vocabulary and grammar complexity to the user's level (${userLevel}).
3. Ask open-ended questions to encourage the user to speak/write more.
4. Do NOT explicitly correct grammar inside your conversational reply unless asked; grammar analysis will be handled separately in the UI. Focus on keeping the conversation engaging.`;

    const groqMessages = [
      { role: 'system' as const, content: systemInstruction },
      ...messages.map((m: { role: string; content: string }) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content
      }))
    ];

    const completion = await groq.chat.completions.create({
      model: MAIN_MODEL,
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const aiReply = completion.choices[0]?.message?.content || "That's interesting! Tell me more about it.";

    return NextResponse.json({ reply: aiReply });
  } catch (error: unknown) {
    console.error('Groq Chat API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to communicate with AI model';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
