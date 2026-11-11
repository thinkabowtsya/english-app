import type { Metadata } from 'next';
import { RecallView } from '@/features/recall/recall-view';

export const metadata: Metadata = { title: 'Vocabulary Recall' };

export default function RecallPage() {
  return <RecallView />;
}
