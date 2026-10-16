import type { Metadata } from 'next';
import { ProgressView } from '@/features/learning/progress-view';

export const metadata: Metadata = { title: 'Progres Saya' };

export default function ProgresPage() {
  return <ProgressView />;
}
