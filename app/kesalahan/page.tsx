import type { Metadata } from 'next';
import { MistakesView } from '@/features/mistakes/mistakes-view';

export const metadata: Metadata = { title: 'Buku kesalahan' };

export default function MistakesPage() {
  return <MistakesView />;
}
