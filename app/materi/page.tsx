import type { Metadata } from 'next';
import { MateriView } from '@/features/learning/materi-view';

export const metadata: Metadata = { title: 'Materi' };

export default function MateriPage() {
  return <MateriView />;
}
