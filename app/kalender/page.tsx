import type { Metadata } from 'next';
import { CalendarView } from '@/features/calendar/calendar-view';

export const metadata: Metadata = { title: 'Kalender Belajar' };

export default function KalenderPage() {
  return <CalendarView />;
}
