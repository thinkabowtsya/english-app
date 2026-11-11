import 'server-only';
import type { Collocation } from '@/data/collocations/items';
import type { OxfordWord } from '@/data/oxford/words';
import { collocationDetailPrompt, findCollocation } from '@/lib/collocations';
import { planForCollocation, planForWord } from '@/lib/datamuse';
import { findOxfordWord, oxfordDetailPrompt } from '@/lib/oxford';
import type { StudyListConfig } from './study-list-api';

export const OXFORD_LIST: StudyListConfig<OxfordWord> = {
  name: 'api/oxford',
  table: 'oxford_words',
  column: 'word',
  notFound: 'Kata tidak ada di daftar Oxford 3000.',
  find: findOxfordWord,
  keyOf: (w) => w.word,
  prompt: oxfordDetailPrompt,
  withAudio: true,
  // Kata serupa dari Datamuse hanya yang juga ada di Oxford 3000 (sesuai level pelajar).
  linkPlan: (w) => ({ ...planForWord(w.word, w.pos), keepSimilar: (x) => findOxfordWord(x) !== undefined }),
};

export const COLLOCATION_LIST: StudyListConfig<Collocation> = {
  name: 'api/collocations',
  table: 'collocation_progress',
  column: 'item',
  notFound: 'Collocation tidak ada di daftar.',
  find: findCollocation,
  keyOf: (c) => c.text,
  prompt: collocationDetailPrompt,
  linkPlan: (c) => planForCollocation(c.text, c.group),
};
