import type { Metadata } from 'next';
import { CoachView } from '@/features/ai-coach/coach-view';

export const metadata: Metadata = { title: 'Percakapan AI' };

export default function PercakapanPage() {
  return <CoachView />;
}
