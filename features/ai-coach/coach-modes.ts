import type { CoachMode } from '@/types/ai';

export interface CoachModeInfo {
  id: CoachMode;
  title: string;
  description: string;
  placeholder: string;
  /** Contoh pesan pembuka untuk mencoba mode ini (bukan materi kurikulum). */
  examples: string[];
}

export const COACH_MODES: CoachModeInfo[] = [
  {
    id: 'help-me-say-it',
    title: 'Help Me Say It',
    description: 'Tulis maksudmu (boleh bahasa Indonesia), dapatkan versi bahasa Inggris yang natural.',
    placeholder: 'Mis. "Saya mau bilang fitur ini butuh dua hari lagi"…',
    examples: [
      'Saya sedang mengerjakan fitur login dan butuh dua hari lagi.',
      'Bagaimana cara bilang saya kurang setuju dengan pendapat itu secara sopan?',
    ],
  },
  {
    id: 'free-conversation',
    title: 'Free Conversation',
    description: 'Ngobrol bebas dalam bahasa Inggris tentang topik apa saja.',
    placeholder: 'Write anything in English (or Indonesian)…',
    examples: ['Hi! I just finished work for today.', 'Can we talk about the tech trends this year?'],
  },
  {
    id: 'role-play',
    title: 'Role-play',
    description: 'Latihan situasi nyata, misalnya interview kerja IT atau meeting.',
    placeholder: 'Reply to the character in English…',
    examples: ['Hello, thank you for having me today.', "Hi everyone, here's my update for today."],
  },
  {
    id: 'correct-my-english',
    title: 'Correct My English',
    description: 'Kirim kalimat bahasa Inggris untuk dikoreksi dan dibuat lebih natural.',
    placeholder: 'Paste or write an English sentence to check…',
    examples: ['I am work as backend developer since 2021.', 'Yesterday I go to office and meet with my team.'],
  },
];

export const SCENARIO_SUGGESTIONS = [
  'Interview kerja: software developer di perusahaan internasional',
  'Daily stand-up meeting dengan tim remote',
  'Menjelaskan bug produksi kepada klien',
];

export function getModeInfo(mode: CoachMode): CoachModeInfo {
  return COACH_MODES.find((m) => m.id === mode) ?? COACH_MODES[0];
}
