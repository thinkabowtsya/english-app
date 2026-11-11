'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Volume2, X } from 'lucide-react';
import { getNaturalVoiceLimitedUntil, subscribeNaturalVoiceLimit } from '@/lib/tts-client';

/**
 * Pemberitahuan kecil saat kuota suara natural (Groq Orpheus) habis: selama jeda, semua tombol 🔊
 * dan Telepon AI memakai suara browser. Hilang sendiri ketika jeda selesai, atau bisa ditutup.
 */
export function VoiceLimitNotice() {
  const limitedUntil = useSyncExternalStore(subscribeNaturalVoiceLimit, getNaturalVoiceLimitedUntil, () => 0);
  const [dismissedFor, setDismissedFor] = useState(0);
  const [, setTick] = useState(0);

  // Render ulang saat jeda berakhir agar pemberitahuan hilang sendiri.
  useEffect(() => {
    if (!limitedUntil) return;
    const timer = window.setTimeout(() => setTick((t) => t + 1), Math.max(0, limitedUntil - Date.now()) + 500);
    return () => window.clearTimeout(timer);
  }, [limitedUntil]);

  // getNaturalVoiceLimitedUntil() sudah mengembalikan 0 setelah jeda berakhir (dibaca ulang tiap render).
  if (!limitedUntil || dismissedFor === limitedUntil) return null;

  const until = new Date(limitedUntil).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 flex items-start gap-3 rounded-xl border border-line bg-surface p-3 text-sm text-fg shadow-lg lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-w-sm"
    >
      <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
      <p className="flex-1">
        Kuota suara natural sedang habis, jadi sementara memakai suara browser. Dicoba lagi sekitar pukul {until}.
      </p>
      <button
        type="button"
        onClick={() => setDismissedFor(limitedUntil)}
        className="rounded-md p-0.5 text-muted hover:text-fg"
        aria-label="Tutup pemberitahuan"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
