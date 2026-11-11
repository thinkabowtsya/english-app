import { COLLOCATION_GROUPS, COLLOCATIONS, type Collocation } from '@/data/collocations/items';

const byText = new Map(COLLOCATIONS.map((c) => [c.text, c]));

/** Hanya collocation dari daftar yang diterima API (mencegah prompt AI untuk teks bebas). */
export function findCollocation(text: string): Collocation | undefined {
  return byText.get(text);
}

/** Prompt detail collocation untuk /api/collocations/detail (bentuk JSON: StudyDetail). */
export function collocationDetailPrompt(c: Collocation): string {
  const pattern = COLLOCATION_GROUPS.find((g) => g.id === c.group)?.example ?? '';
  return `You are an English teacher for Indonesian learners at CEFR level ${c.level}.
Explain the English collocation "${c.text}" (same pattern as "${pattern}").

Return ONLY a JSON object:
{
  "meaningId": string (short Indonesian meaning of the whole collocation),
  "definitionEn": string (one simple English sentence explaining what it means and when people use it),
  "examples": [ { "en": string, "id": string } ] (exactly 3 short, natural sentences using "${c.text}" in daily life or work, with different tenses/forms where natural, each with an Indonesian translation),
  "similar": [ { "word": string, "note": string } ] (3 to 4 related collocations that are also correct and common, e.g. with the same key word or a similar meaning; "note" explains the difference briefly in simple Indonesian),
  "mistake": { "wrong": string, "note": string } (the most common wrong word combination Indonesian learners use instead, and why it sounds wrong, in simple Indonesian)
}

Use only common, correct, natural English. DO NOT include markdown or extra text.`;
}
