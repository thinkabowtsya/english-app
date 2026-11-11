import {
  BookMarked,
  BookOpen,
  CalendarDays,
  ChartLine,
  Dumbbell,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Mic,
  MessagesSquare,
  NotebookPen,
  PhoneCall,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Rute tambahan yang ikut menandai menu ini aktif (mis. halaman latihan lama). */
  also?: string[];
  /** Tampil langsung di menu bawah ponsel; menu lain masuk ke "Lainnya". */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard, primary: true },
  { href: '/kalender', label: 'Kalender', shortLabel: 'Kalender', icon: CalendarDays, primary: true },
  { href: '/materi', label: 'Materi', shortLabel: 'Materi', icon: BookOpen, primary: true },
  {
    href: '/latihan',
    label: 'Latihan',
    shortLabel: 'Latihan',
    icon: Dumbbell,
    also: ['/vocabulary', '/pronunciation', '/collocations'],
    primary: true,
  },
  { href: '/speak', label: 'Speak', shortLabel: 'Speak', icon: Mic, primary: true },
  { href: '/kosakata', label: 'Kosakata saya', shortLabel: 'Kosakata', icon: BookMarked },
  { href: '/oxford', label: 'Oxford 3000', shortLabel: 'Oxford', icon: ListChecks },
  { href: '/kesalahan', label: 'Buku kesalahan', shortLabel: 'Kesalahan', icon: NotebookPen },
  {
    href: '/percakapan',
    label: 'Percakapan AI',
    shortLabel: 'AI Coach',
    icon: MessagesSquare,
    also: ['/practice'],
  },
  { href: '/call', label: 'Telepon AI', shortLabel: 'Telepon', icon: PhoneCall },
  { href: '/tutor', label: 'Tanya Tutor', shortLabel: 'Tutor', icon: GraduationCap },
  { href: '/progres', label: 'Progres Saya', shortLabel: 'Progres', icon: ChartLine },
  { href: '/pengaturan', label: 'Pengaturan', shortLabel: 'Pengaturan', icon: Settings },
];

function matches(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  return matches(pathname, item.href) || (item.also ?? []).some((p) => matches(pathname, p));
}
