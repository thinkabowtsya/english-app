import type { Metadata } from 'next';
import { OxfordView } from '@/features/oxford/oxford-view';

export const metadata: Metadata = { title: 'Oxford 3000' };

export default function OxfordPage() {
  return <OxfordView />;
}
