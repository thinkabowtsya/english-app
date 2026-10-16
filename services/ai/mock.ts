import type { CoachMode, CoachRequest } from '@/types/ai';
import type { AiCoachService } from './types';

const NOTICE = '(Respons mock — AI belum terhubung. Isi GROQ_API_KEY untuk jawaban asli.)';

function quote(text: string, max = 120) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

const REPLIES: Record<CoachMode, (last: string) => string> = {
  'help-me-say-it': (last) =>
    `Contoh format jawaban untuk: "${quote(last)}"\n- Casual: [versi bahasa Inggris santai]\n- Professional: [versi bahasa Inggris formal]\nCatatan: [penjelasan singkat pola kalimat dalam bahasa Indonesia]`,
  'free-conversation': (last) =>
    `That sounds interesting! (contoh balasan untuk "${quote(last, 60)}") What made you think about that today?`,
  'role-play': () => `[Karakter role-play membalas di sini.] Could you tell me a bit more about your experience?`,
  'correct-my-english': (last) =>
    `- Corrected: [kalimat yang sudah dikoreksi dari "${quote(last, 80)}"]\n- Mistakes: [daftar kesalahan + penjelasan]\n- More natural: [alternatif yang lebih natural]`,
};

/** Respons tiruan deterministik untuk mengembangkan & menguji UI tanpa API key. */
export class MockCoachService implements AiCoachService {
  readonly provider = 'mock' as const;
  readonly model = null;

  async respond(request: CoachRequest): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (request.action === 'check') {
      return `${NOTICE}

Contoh format penilaian:
Benar / Hampir benar / Belum tepat
[penjelasan singkat untuk jawaban "${quote(request.userAnswer, 80)}"]
Versi yang benar: ${request.reference[0]}`;
    }
    if (request.action === 'tutor') {
      const last = request.messages[request.messages.length - 1]?.content ?? '';
      return `${NOTICE}

Contoh format jawaban tutor untuk: "${quote(last)}"
Intinya:
- [penjelasan konsep dan alasannya]
Contoh:
- "[kalimat dari situasi nyata]"
Kesalahan umum:
- [kesalahan yang sering dibuat]
Latihan:
- [tugas kecil untuk dicoba]`;
    }
    if (request.action === 'explain') {
      return `${NOTICE}\n\nPenjelasan grammar untuk: "${quote(request.target)}"\n- Pola: [pola kalimat]\n- Fungsi: [kapan dipakai]\n- Contoh: [1–2 contoh kalimat]`;
    }
    const last = request.messages[request.messages.length - 1]?.content ?? '';
    return `${NOTICE}\n\n${REPLIES[request.mode](last)}`;
  }
}
