'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SpeakProgress } from '@/lib/speak';

/** Progres menu Speak: dari Supabase bila login, dari localStorage bila tamu. */

const GUEST_KEY = 'english-app:speak-progress';
type Storage = 'loading' | 'saved' | 'guest' | 'unavailable';

function readGuest(): Record<string, SpeakProgress> {
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, SpeakProgress>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeGuest(map: Record<string, SpeakProgress>) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(map));
  } catch {
    // Penyimpanan diblokir: progres hanya bertahan selama halaman terbuka.
  }
}

export function useSpeakProgress() {
  const [progress, setProgress] = useState<Record<string, SpeakProgress>>({});
  const [storage, setStorage] = useState<Storage>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/speak/progress')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((body: { progress: SpeakProgress[]; storage: Storage }) => {
        if (cancelled) return;
        setStorage(body.storage);
        setProgress(
          body.storage === 'guest' ? readGuest() : Object.fromEntries(body.progress.map((p) => [p.topicId, p])),
        );
      })
      .catch(() => {
        if (cancelled) return;
        setStorage('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Catat hasil satu percakapan. Mengembalikan pesan error bila gagal disimpan. */
  const record = useCallback(
    async (topicId: string, score: number): Promise<string | null> => {
      const now = Date.now();
      const merge = (prev?: SpeakProgress): SpeakProgress => ({
        topicId,
        bestScore: Math.max(score, prev?.bestScore ?? 0),
        attempts: (prev?.attempts ?? 0) + 1,
        lastAt: now,
      });
      if (storage === 'guest') {
        const next = { ...readGuest() };
        next[topicId] = merge(next[topicId]);
        writeGuest(next);
        setProgress(next);
        return null;
      }
      try {
        const res = await fetch('/api/speak/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topicId, score }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) return body?.error ?? 'Progres tidak dapat disimpan.';
        if (body?.storage === 'guest') {
          setStorage('guest');
          const next = { ...readGuest() };
          next[topicId] = merge(next[topicId]);
          writeGuest(next);
          setProgress(next);
          return null;
        }
        if (body?.progress) setProgress((p) => ({ ...p, [topicId]: body.progress as SpeakProgress }));
        return null;
      } catch {
        return 'Progres tidak dapat disimpan (offline?).';
      }
    },
    [storage],
  );

  return { progress, storage, record };
}
