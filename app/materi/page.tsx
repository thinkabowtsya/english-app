import type { Metadata } from 'next';
import { MateriView } from '@/features/learning/materi-view';
import { requireLoginPage } from '@/lib/supabase/require-login';

export const metadata: Metadata = { title: 'Materi' };

export default async function MateriPage() {
  await requireLoginPage('/materi');
  return <MateriView />;
}
