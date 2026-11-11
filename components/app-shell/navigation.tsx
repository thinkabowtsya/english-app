'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GraduationCap, LogIn, Menu, Settings } from 'lucide-react';
import { ActiveTimerPill } from '@/features/timer/active-timer-pill';
import { SignOutButton } from './sign-out-button';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, isNavActive } from './nav-items';

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <GraduationCap className="h-4 w-4" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-fg">My Journey</span>
        <span className="block text-[11px] text-muted">English learning</span>
      </span>
    </Link>
  );
}

export function Sidebar({ email, userId }: { email: string | null; userId: string | null }) {
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
        {userId ? (
          <>
            {email && (
              <p className="truncate text-[11px] text-muted" title={email}>
                Masuk sebagai {email}
              </p>
            )}
            <SignOutButton className="-ml-3 w-full" />
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-muted hover:text-fg"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Login untuk sinkronisasi
          </Link>
        )}
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

const PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.primary);
const MORE_ITEMS = NAV_ITEMS.filter((item) => !item.primary);

/**
 * Menu bawah ponsel: hanya menu utama + tombol "Lainnya" yang membuka panel berisi menu sisanya,
 * agar tiap tombol tetap lega di layar kecil.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  // Panel otomatis tertutup saat pindah halaman (terikat ke path tempat panel dibuka).
  const open = openPath === pathname;
  const close = () => setOpenPath(null);
  const moreActive = MORE_ITEMS.some((item) => isNavActive(item, pathname));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPath(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const tabClass = (active: boolean) =>
    cn('flex min-w-0 flex-col items-center gap-1 truncate py-2 text-[11px]', active ? 'font-medium text-accent' : 'text-muted');

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button type="button" aria-label="Tutup menu" onClick={close} className="absolute inset-0 bg-black/40" />
          <div
            id="mobile-more-menu"
            role="dialog"
            aria-label="Menu lainnya"
            className="absolute inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] mx-3 rounded-2xl border border-line bg-surface p-2 shadow-xl"
          >
            <ul className="grid grid-cols-3 gap-1">
              {MORE_ITEMS.map((item) => {
                const active = isNavActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs',
                        active ? 'bg-accent-soft font-medium text-accent' : 'text-fg hover:bg-surface-muted',
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
      <nav
        aria-label="Navigasi utama"
        style={{ gridTemplateColumns: `repeat(${PRIMARY_ITEMS.length + 1}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {PRIMARY_ITEMS.map((item) => {
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} onClick={close} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
              <Icon className="h-5 w-5" aria-hidden />
              {item.shortLabel}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpenPath(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="mobile-more-menu"
          className={tabClass(open || moreActive)}
        >
          <Menu className="h-5 w-5" aria-hidden />
          Lainnya
        </button>
      </nav>
    </>
  );
}
