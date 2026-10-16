import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAIN_MODEL, getGroq, isGroqConfigured, modelOptions } from '@/lib/groq';
import { jsonError, readJsonBody } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { enforceAiRateLimit } from '@/lib/server/rate-limit';
import { toPlainText } from '@/services/ai/format';

/** Endpoint lama untuk /practice dan /call. Format respons dipertahankan. */

const CONTEXT_MESSAGES = 30;

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.string().max(20),
        content: z.string().max(4_000),
      }),
    )
    .min(1)
    .max(200),
  scenarioPrompt: z.string().max(1_000).optional(),
  userLevel: z.string().max(40).default('Intermediate'),
  action: z.enum(['chat', 'translate']).default('chat'),
  /** true: balasan dikirim bertahap (text/plain) agar panggilan suara bisa bicara per kalimat. */
  stream: z.boolean().default(false),
});

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if ('response' in auth) return auth.response;
  const limited = enforceAiRateLimit(req, auth.userId);
  if (limited) return limited;

  const body = await readJsonBody(req, schema, 128 * 1024);
  if (!body.ok) return body.response;
  if (!isGroqConfigured()) return jsonError(503, 'AI belum dikonfigurasi di server.');

  const { messages, scenarioPrompt, userLevel, action, stream } = body.data;
  const groq = getGroq();

  try {
    if (action === 'translate') {
      const lastMessage = messages[messages.length - 1]?.content ?? '';
      const completion = await groq.chat.completions.create({
        model: MAIN_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an accurate English to Indonesian translator. Translate the given English sentence into natural, fluent Indonesian. Provide ONLY the direct translation without extra commentary.',
          },
          { role: 'user', content: lastMessage },
        ],
        temperature: 0.2,
        ...modelOptions(),
      });
      return NextResponse.json({ translation: toPlainText(completion.choices[0]?.message?.content || '') });
    }

    const systemInstruction = `You are "My Journey English Coach", an empathetic, highly engaging, native English conversational tutor.
Your user is an Indonesian learner practicing English at ${userLevel} level.
Scenario Context: ${scenarioPrompt || 'Casual conversational practice.'}

Guidelines:
1. Act naturally according to the roleplay scenario. Keep responses conversational, warm, concise (2-4 sentences max per response) so the conversation flows smoothly.
2. Adapt vocabulary and grammar complexity to the user's level (${userLevel}).
3. Ask open-ended questions to encourage the user to speak/write more.
4. Do NOT explicitly correct grammar inside your conversational reply unless asked; grammar analysis will be handled separately in the UI. Focus on keeping the conversation engaging.`;

    const chatMessages = [
      { role: 'system' as const, content: systemInstruction },
      ...messages
        .filter((m) => m.content.trim().length > 0)
        .slice(-CONTEXT_MESSAGES)
        .map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    if (stream) {
      const completionStream = await groq.chat.completions.create({
        model: MAIN_MODEL,
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 800,
        stream: true,
        ...modelOptions(),
      });
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for await (const chunk of completionStream) {
              // Teks untuk diucapkan: tanpa tanda markdown.
              const text = (chunk.choices[0]?.delta?.content ?? '').replace(/[*#`_]/g, '');
              if (text) controller.enqueue(encoder.encode(text));
            }
          } catch (error) {
            console.error('[api/chat stream]', error instanceof Error ? error.message : error);
          } finally {
            controller.close();
          }
        },
        cancel() {
          // Pengguna memotong AI: hentikan stream ke Groq.
          completionStream.controller.abort();
        },
      });
      return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    const completion = await groq.chat.completions.create({
      model: MAIN_MODEL,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 800,
      ...modelOptions(),
    });

    const aiReply = completion.choices[0]?.message?.content || "That's interesting! Tell me more about it.";
    return NextResponse.json({ reply: toPlainText(aiReply) });
  } catch (error: unknown) {
    console.error('[api/chat]', error instanceof Error ? error.message : error);
    return jsonError(502, 'Layanan AI sedang tidak dapat dihubungi. Coba lagi nanti.');
  }
}
