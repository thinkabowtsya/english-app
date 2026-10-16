import { BookOpen, ChartLine, Dumbbell, LayoutDashboard, MessagesSquare, Settings, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /** Rute tambahan yang ikut menandai menu ini aktif (mis. halaman latihan lama). */
  also?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { href: '/materi', label: 'Materi', shortLabel: 'Materi', icon: BookOpen },
  {
    href: '/latihan',
    label: 'Latihan',
    shortLabel: 'Latihan',
    icon: Dumbbell,
    also: ['/vocabulary', '/pronunciation'],
  },
  {
    href: '/percakapan',
    label: 'Percakapan AI',
    shortLabel: 'AI Coach',
    icon: MessagesSquare,
    also: ['/call', '/practice'],
  },
  { href: '/progres', label: 'Progres Saya', shortLabel: 'Progres', icon: ChartLine },
  { href: '/pengaturan', label: 'Pengaturan', shortLabel: 'Pengaturan', icon: Settings },
];

function matches(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavActive(item: NavItem, pathname: string): boolean {
  return matches(pathname, item.href) || (item.also ?? []).some((p) => matches(pathname, p));
}
