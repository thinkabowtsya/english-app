'use client';

import { useEffect, useState } from 'react';
import type { VocabProgress } from '@/lib/vocab-progress';

/** Memuat /api/kosakata; `error` true bila permintaan gagal (bukan sekadar belum login). */
export function useVocabProgress() {
  const [state, setState] = useState<{ progress: VocabProgress | null; error: boolean } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/kosakata', { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<VocabProgress>) : Promise.reject(new Error(String(res.status)))))
      .then((progress) => setState({ progress, error: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ progress: null, error: true });
      });
    return () => controller.abort();
  }, []);

  return { progress: state?.progress ?? null, error: state?.error ?? false, loading: state === null };
}
