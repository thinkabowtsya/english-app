import type { Metadata } from 'next';
import { KosakataView } from '@/features/kosakata/kosakata-view';

export const metadata: Metadata = { title: 'Kosakata saya' };

export default function KosakataPage() {
  return <KosakataView />;
}
