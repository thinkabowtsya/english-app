'use client';

import { useSyncExternalStore } from 'react';
import type { ActiveTimer, AppData, LearningSession } from '@/types/learning';
import {
  getActiveTimer,
  getData,
  getLastFinished,
  getStorageWarning,
  subscribe,
} from './store';

const noopSubscribe = () => () => {};

/** false saat render server & hidrasi awal, true setelah komponen aktif di browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Data progres dari localStorage. null selama render server/hidrasi (hindari mismatch). */
export function useAppData(): AppData | null {
  return useSyncExternalStore(subscribe, getData, () => null);
}

export function useActiveTimer(): ActiveTimer | null {
  return useSyncExternalStore(subscribe, getActiveTimer, () => null);
}

export function useLastFinished(): LearningSession | null {
  return useSyncExternalStore(subscribe, getLastFinished, () => null);
}

export function useStorageWarning(): string | null {
  return useSyncExternalStore(subscribe, getStorageWarning, () => null);
}

/* --------------------------------- Clock -------------------------------- */

const TICK_MS = 500;
let currentNow = 0;
let tickId: ReturnType<typeof setInterval> | null = null;
const tickListeners = new Set<() => void>();

function subscribeClock(listener: () => void) {
  tickListeners.add(listener);
  if (tickId === null) {
    currentNow = Date.now();
    tickId = setInterval(() => {
      currentNow = Date.now();
      for (const l of tickListeners) l();
    }, TICK_MS);
  }
  return () => {
    tickListeners.delete(listener);
    if (tickListeners.size === 0 && tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
  };
}

function getClockSnapshot() {
  if (currentNow === 0) currentNow = Date.now();
  return currentNow;
}

/**
 * Waktu sekarang yang diperbarui berkala. Hanya untuk tampilan — perhitungan timer
 * selalu memakai selisih timestamp sehingga tidak terpengaruh tick yang tertunda.
 * Bernilai 0 saat render server.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribeClock, getClockSnapshot, () => 0);
}
