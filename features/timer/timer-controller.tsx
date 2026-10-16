'use client';

import { useEffect } from 'react';
import { playChime, showBrowserNotification, unlockAudio } from '@/lib/browser-alerts';
import { formatDuration } from '@/lib/date';
import { reconcileActiveTimer, touchActiveTimer } from '@/lib/storage/actions';
import { getData } from '@/lib/storage/store';

/** Bunyi/notifikasi hanya untuk sesi yang baru saja selesai, bukan yang direkonsiliasi saat reload. */
const RECENT_FINISH_MS = 15_000;

/**
 * Dipasang sekali di app shell sehingga timer tetap selesai tepat waktu di halaman mana pun.
 * Tick hanya memicu rekonsiliasi; perhitungan waktu memakai timestamp (lihat lib/timer.ts).
 */
export function TimerController() {
  useEffect(() => {
    const run = () => {
      const now = Date.now();
      const session = reconcileActiveTimer(now);
      if (!session || session.status !== 'completed' || now - session.endedAt > RECENT_FINISH_MS) return;
      const settings = getData()?.settings;
      if (settings?.soundOnFinish) playChime();
      if (settings?.browserNotification) {
        showBrowserNotification('Sesi belajar selesai', `Kamu belajar selama ${formatDuration(session.actualMs)}.`);
      }
    };

    run();
    const interval = window.setInterval(run, 1000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
      else touchActiveTimer();
    };
    const onPageHide = () => touchActiveTimer();
    const onFirstPointer = () => unlockAudio();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pointerdown', onFirstPointer, { once: true });
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pointerdown', onFirstPointer);
    };
  }, []);

  return null;
}
