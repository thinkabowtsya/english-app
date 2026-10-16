'use client';

import type { ReactNode } from 'react';
import { SessionSummaryDialog } from '@/features/timer/session-summary-dialog';
import { TimerController } from '@/features/timer/timer-controller';
import { useCloudState } from '@/lib/storage/hooks';
import { CloudDataLoader, GuestDataLoader, SyncStatusBanner } from './cloud-sync';
import { MobileBottomNav, MobileTopBar, Sidebar } from './navigation';

/**
 * Kerangka aplikasi — tampil penuh untuk semua pengguna, baik yang sudah login
 * maupun tamu. CloudDataLoader hanya dipasang jika userId tersedia (login).
 */
export function AppShell({
  userId,
  email,
  children,
}: {
  userId: string | null;
  email: string | null;
  children: ReactNode;
}) {
  const cloud = useCloudState();

  return (
    <>
      {/* Muat data: cloud jika login, localStorage jika tamu */}
      {userId ? <CloudDataLoader userId={userId} /> : <GuestDataLoader />}
      <Sidebar email={email} userId={userId} />
      <MobileTopBar />
      <div className="lg:pl-60">
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          <SyncStatusBanner />
          {children}
        </main>
      </div>
      <MobileBottomNav />
      {/* Timer dicatat setelah data siap: login → cloud sync selesai; tamu → localStorage langsung. */}
      {(userId ? cloud.userId === userId : true) && <TimerController />}
      <SessionSummaryDialog />
    </>
  );
}

