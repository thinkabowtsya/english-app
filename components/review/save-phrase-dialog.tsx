'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { NOTE_MAX_CHARS, PHRASE_MAX_CHARS, findOpenPhrase } from '@/lib/phrase-reviews';
import { addReview } from '@/lib/storage/actions';
import { useAppData } from '@/lib/storage/hooks';

export interface PhraseTarget {
  phrase: string;
  note?: string | null;
}

/**
 * Dialog untuk menyimpan frasa ke daftar review (kind 'phrase', source 'manual').
 * Frasa & catatan bisa disunting sebelum disimpan.
 */
export function SavePhraseDialog({
  target,
  reason,
  onClose,
  onSaved,
}: {
  target: PhraseTarget | null;
  reason: string;
  onClose: () => void;
  onSaved: (label: string) => void;
}) {
  return (
    <Modal open={target !== null} onClose={onClose} title="Simpan frasa ke daftar review">
      {target && (
        <SavePhraseForm
          key={`${target.phrase}\n${target.note ?? ''}`}
          initial={target}
          reason={reason}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

function SavePhraseForm({
  initial,
  reason,
  onCancel,
  onSaved,
}: {
  initial: PhraseTarget;
  reason: string;
  onCancel: () => void;
  onSaved: (label: string) => void;
}) {
  const [phrase, setPhrase] = useState(initial.phrase.slice(0, PHRASE_MAX_CHARS));
  const [note, setNote] = useState((initial.note ?? '').slice(0, NOTE_MAX_CHARS));
  const [error, setError] = useState<string | null>(null);
  const data = useAppData();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const label = phrase.trim();
    if (!label) return setError('Frasa wajib diisi.');
    if (label.length > PHRASE_MAX_CHARS) return setError(`Frasa maksimal ${PHRASE_MAX_CHARS} karakter.`);
    if (note.length > NOTE_MAX_CHARS) return setError(`Catatan maksimal ${NOTE_MAX_CHARS} karakter.`);
    if (!data) return setError('Data progres belum dimuat. Coba lagi sebentar.');
    if (findOpenPhrase(data.reviews, label)) return setError('Frasa ini sudah ada di daftar review.');
    const added = addReview({
      kind: 'phrase',
      label,
      note: note.trim() || null,
      reason,
      lessonId: null,
      source: 'manual',
      nextReviewAt: null,
    });
    if (!added) return setError('Frasa belum bisa disimpan. Coba lagi.');
    onSaved(label);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs">Tip: seleksi sebagian teks pesan sebelum menekan “Simpan” untuk menyimpan potongannya saja.</p>
      <div>
        <label htmlFor="save-phrase" className="mb-1 block text-xs font-medium">
          Frasa
        </label>
        <textarea
          id="save-phrase"
          value={phrase}
          onChange={(e) => {
            setPhrase(e.target.value);
            setError(null);
          }}
          maxLength={PHRASE_MAX_CHARS}
          rows={2}
          autoFocus
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
        />
      </div>
      <div>
        <label htmlFor="save-phrase-note" className="mb-1 block text-xs font-medium">
          Arti / catatan (opsional)
        </label>
        <textarea
          id="save-phrase-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX_CHARS}
          rows={2}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit">Simpan</Button>
      </div>
    </form>
  );
}

/** Konfirmasi singkat setelah frasa tersimpan, dengan tautan ke daftar review. */
export function SavedPhraseNotice({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <Alert
      tone="success"
      action={
        <button type="button" onClick={onDismiss} className="text-xs text-muted hover:text-fg">
          Tutup
        </button>
      }
    >
      “{label}” disimpan ke daftar review.{' '}
      <Link href="/latihan#review" className="font-medium text-accent hover:underline">
        Lihat daftar review
      </Link>
    </Alert>
  );
}

/**
 * Teks yang sedang diseleksi di dalam elemen tertentu. Dipanggil saat klik tombol simpan
 * (tombol memakai onMouseDown preventDefault agar seleksi tidak hilang).
 */
export function selectionWithin(element: HTMLElement | null): string {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? '';
  const inside = selection?.anchorNode && element ? element.contains(selection.anchorNode) : false;
  return inside && text.length <= PHRASE_MAX_CHARS ? text : '';
}
