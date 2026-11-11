import type { Metadata } from 'next';
import { SpeakHome } from '@/features/speak/speak-home';

export const metadata: Metadata = { title: 'Speak' };

export default function SpeakPage() {
  return <SpeakHome />;
}
