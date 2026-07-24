export type Role = 'user' | 'assistant' | 'system';

export interface GrammarMistake {
  type: 'grammar' | 'vocabulary' | 'spelling' | 'phrasing' | 'punctuation';
  original: string;
  correction: string;
  explanation: string;
  explanationId?: string;
}

export interface Correction {
  originalText: string;
  correctedText: string;
  isCorrect: boolean;
  score: number; // 0 - 100
  summary: string;
  mistakes: GrammarMistake[];
  nativeSuggestions: string[];
  grammarTip?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  correction?: Correction | null;
  audioState?: 'idle' | 'playing' | 'paused';
  translation?: string;
}

export interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  description: string;
  aiRole: string;
  userRole: string;
  systemPrompt: string;
  level: 'Beginner (A1-A2)' | 'Intermediate (B1-B2)' | 'Advanced (C1-C2)';
  badgeColor: string;
  initialMessage: string;
  suggestedPrompts: string[];
}

export interface VocabCard {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definitionEn: string;
  definitionId: string;
  exampleEn: string;
  exampleId: string;
  cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: 'Daily' | 'Business' | 'Travel' | 'Academic' | 'Idioms & Slang';
  collocations: string[];
  audioText?: string;
}

export interface PronunciationChallenge {
  id: string;
  text: string;
  translation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  phonetics: string;
  focusArea: string; // e.g. "TH sound & Vowel contrasts"
  tips: string;
}
