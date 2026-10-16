import type { Metadata } from 'next';
import { TutorView } from '@/features/tutor/tutor-view';

export const metadata: Metadata = { title: 'Tanya Tutor' };

export default function TutorPage() {
  return <TutorView />;
}
