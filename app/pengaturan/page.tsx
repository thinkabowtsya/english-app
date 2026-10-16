import type { Metadata } from 'next';
import { SettingsView } from '@/features/settings/settings-view';

export const metadata: Metadata = { title: 'Pengaturan' };

export default function PengaturanPage() {
  return <SettingsView />;
}
