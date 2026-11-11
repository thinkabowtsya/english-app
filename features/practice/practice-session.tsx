'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LoaderCircle, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { practiceScore, type PracticeItem, type PracticeKind } from '@/lib/practice';
import { cn } from '@/lib/utils';
import { ItemResult, PracticeRunner } from './practice-runner';

/**
 * Satu sesi latihan dari awal sampai akhir: minta soal ke /api/practice/generate, kerjakan,
 * lalu simpan hasilnya ke /api/practice/sessions (riwayat + jadwal ulang kosakata).
 */

export interface PracticeRequest {
  kind: PracticeKind;
  lessonId?: string;
  count?: number;
  vocabSource?: 'mix' | 'oxford' | 'collocation';
  /** Untuk kind 'mistakes': pola dari Buku kesalahan. */
  pattern?: string;
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'quiz'; items: PracticeItem[]; title: string; lessonId: string | null }
  | {
      kind: 'done';
      items: PracticeItem[];
      save: 'saving' | 'saved' | 'guest' | 'error';
      /** Jumlah jawaban salah yang dicatat di Buku kesalahan, dan apakah pola latihan teratasi. */
      mistakes?: number;
      resolved?: boolean;
    };

/** Daftar soal yang sudah dikerjakan beserta jawaban & pembahasan (hasil sesi dan riwayat). */
export function PracticeReview({ items }: { items: PracticeItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="space-y-2 rounded-xl border border-line p-3">
          <p className="text-sm text-fg">
            <span className="mr-1 text-muted">{i + 1}.</span>
            {it.prompt}
          </p>
          {it.text && it.type !== 'dictation' && <p className="text-sm text-muted italic">{it.text}</p>}
          <p className="text-sm">
            <span className="text-muted">Jawabanmu: </span>
            <span className={cn('font-medium', it.correct ? 'text-success' : 'text-danger')}>{it.response || '—'}</span>
          </p>
          <ItemResult item={it} />
        </li>
      ))}
    </ol>
  );
}

export function PracticeSession({
  request,
  deferFeedback = false,
  onSaved,
  onFinished,
  onRestart,
  onExit,
}: {
  request: PracticeRequest;
  deferFeedback?: boolean;
  onSaved?: () => void;
  /** Dipanggil sekali dengan hasil akhir (mis. untuk mencatat nilai evaluasi materi). */
  onFinished?: (items: PracticeItem[], meta: { lessonId: string | null }) => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const meta = useRef<{ title: string; lessonId: string | null; pattern: string | null }>({
    title: '',
    lessonId: null,
    pattern: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/practice/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(body?.items)) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'Gagal membuat soal. Coba lagi.');
        }
        meta.current = { title: body.title ?? 'Latihan', lessonId: body.lessonId ?? null, pattern: body.pattern ?? null };
        setPhase({ kind: 'quiz', items: body.items, title: meta.current.title, lessonId: meta.current.lessonId });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setPhase({ kind: 'error', message: err instanceof Error ? err.message : 'Gagal membuat soal. Coba lagi.' });
      });
    return () => controller.abort();
    // Satu sesi = satu permintaan; komponen dipasang ulang (key) untuk sesi baru.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async (items: PracticeItem[]) => {
    setPhase({ kind: 'done', items, save: 'saving' });
    onFinished?.(items, { lessonId: meta.current.lessonId });
    try {
      const res = await fetch('/api/practice/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: request.kind,
          title: meta.current.title,
          lessonId: meta.current.lessonId,
          pattern: meta.current.pattern,
          items,
        }),
      });
      const result = res.ok ? await res.json().catch(() => null) : null;
      setPhase({
        kind: 'done',
        items,
        save: res.ok ? 'saved' : res.status === 401 ? 'guest' : 'error',
        mistakes: typeof result?.mistakes === 'number' ? result.mistakes : undefined,
        resolved: result?.resolved === true,
      });
      if (res.ok) onSaved?.();
    } catch {
      setPhase({ kind: 'done', items, save: 'error' });
    }
  };

  if (phase.kind === 'loading') {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        AI sedang membuat soal...
      </Card>
    );
  }

  if (phase.kind === 'error') {
    return (
      <Alert
        tone="error"
        title="Soal tidak dapat dibuat"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onRestart}>
              Coba lagi
            </Button>
            <Button size="sm" variant="ghost" onClick={onExit}>
              Kembali
            </Button>
          </div>
        }
      >
        {phase.message}
      </Alert>
    );
  }

  if (phase.kind === 'quiz') {
    return <PracticeRunner items={phase.items} deferFeedback={deferFeedback} onFinish={finish} />;
  }

  const { correct, score } = practiceScore(phase.items);
  return (
    <Card className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted">Sesi selesai</p>
        <p className="mt-1 text-3xl font-semibold text-fg tabular-nums">
          {correct} / {phase.items.length}
        </p>
        <p className="text-sm text-muted">Skor {score}</p>
        <p className="mt-1 text-xs text-muted">
          {phase.save === 'saving' && 'Menyimpan ke riwayat...'}
          {phase.save === 'saved' && 'Tersimpan di riwayat.'}
          {phase.save === 'saved' && !!phase.mistakes && (
            <>
              {' '}
              {phase.mistakes} jawaban salah dicatat di{' '}
              <Link href="/kesalahan" className="text-accent hover:underline">
                Buku kesalahan
              </Link>
              .
            </>
          )}
          {phase.save === 'guest' && 'Login untuk menyimpan riwayat.'}
          {phase.save === 'error' && 'Riwayat tidak dapat disimpan. Pastikan migrasi practice_sessions sudah dijalankan.'}
        </p>
        {phase.resolved && (
          <p className="mt-2 text-sm font-medium text-success">Pola ini ditandai teratasi. Bagus!</p>
        )}
      </div>
      <PracticeReview items={phase.items} />
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Latihan lagi
        </Button>
        <Button variant="secondary" onClick={onExit}>
          <Settings2 className="h-4 w-4" />
          Ganti pengaturan
        </Button>
      </div>
    </Card>
  );
}
