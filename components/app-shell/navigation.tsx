'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, Settings } from 'lucide-react';
import { ActiveTimerPill } from '@/features/timer/active-timer-pill';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, isNavActive } from './nav-items';

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <GraduationCap className="h-4 w-4" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-fg">Antigravity English</span>
        <span className="block text-[11px] text-muted">Personal workspace</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 py-5">
        <Brand />
      </div>
      <nav aria-label="Navigasi utama" className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-surface-muted hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-line px-5 py-4">
        <ActiveTimerPill />
        <p className="text-[11px] leading-relaxed text-muted">
          Mode personal (single-user). Progres tersimpan di browser ini, tanpa akun atau autentikasi.
        </p>
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const pathname = usePathname();
  const settingsActive = pathname.startsWith('/pengaturan');
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
      <Brand />
      <div className="flex items-center gap-2">
        <ActiveTimerPill />
        <Link
          href="/pengaturan"
          aria-label="Pengaturan"
          aria-current={settingsActive ? 'page' : undefined}
          className={cn(
            'rounded-lg p-2 hover:bg-surface-muted',
            settingsActive ? 'text-accent' : 'text-muted',
          )}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => item.href !== '/pengaturan');
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {items.map((item) => {
        const active = isNavActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center gap-1 py-2 text-[10px]',
              active ? 'font-medium text-accent' : 'text-muted',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {item.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
