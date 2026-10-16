import type { Metadata } from 'next';
import { LatihanView } from '@/features/learning/latihan-view';

export const metadata: Metadata = { title: 'Latihan' };

export default function LatihanPage() {
  return <LatihanView />;
}
