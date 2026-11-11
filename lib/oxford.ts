import { OXFORD_WORDS, type OxfordWord } from '@/data/oxford/words';

const byWord = new Map(OXFORD_WORDS.map((w) => [w.word, w]));

/** Hanya kata dari daftar Oxford 3000 yang diterima API (mencegah prompt AI untuk teks bebas). */
export function findOxfordWord(word: string): OxfordWord | undefined {
  return byWord.get(word);
}

/** Prompt detail kata Oxford untuk /api/oxford/detail (bentuk JSON: StudyDetail tanpa mistake). */
export function oxfordDetailPrompt(entry: OxfordWord): string {
  return `You are an English teacher for Indonesian learners at CEFR level ${entry.level}.
Explain the English word "${entry.word}" (${entry.pos.join(', ')}).

Return ONLY a JSON object:
{
  "meaningId": string (short Indonesian meaning; if it has several common meanings, list them separated by "; "),
  "definitionEn": string (one simple English definition written in your own words, easy to understand at ${entry.level} level),
  "examples": [ { "en": string, "id": string } ] (exactly 3 short, natural everyday sentences using "${entry.word}", covering its common uses${entry.pos.length > 1 ? ` as ${entry.pos.join(' and ')}` : ''}, each with an Indonesian translation),
  "similar": [ { "word": string, "note": string } ] (3 to 4 similar or related English words a learner might confuse with or use instead of "${entry.word}"; "note" explains the difference briefly in simple Indonesian)
}

Use only common, correct, natural English. DO NOT include markdown or extra text.`;
}
