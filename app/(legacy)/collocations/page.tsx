import type { Metadata } from 'next';
import { CollocationView } from '@/features/collocations/collocation-view';

export const metadata: Metadata = { title: 'Collocation' };

export default function CollocationsPage() {
  return <CollocationView />;
}
