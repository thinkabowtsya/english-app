'use client';

import { useState, useSyncExternalStore } from 'react';
import { Check, Save, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { previewVoice } from '@/lib/speech';
import { TTS_VOICES, DEFAULT_VOICE, type VoicePreference } from '@/lib/tts';
import { getVoicePreference, setVoicePreference, subscribeVoicePreference } from '@/lib/tts-client';
import { cn } from '@/lib/utils';

const SAMPLE = "Hi! Let's practice English together. I usually make a decision after I talk to my team.";

const OPTIONS: { id: VoicePreference; label: string; hint: string }[] = [
  ...TTS_VOICES.map((v) => ({ id: v.id, label: v.label, hint: v.gender })),
  { id: 'browser', label: 'Suara browser', hint: 'Tanpa internet/AI' },
];

/**
 * Pilihan suara untuk semua tombol 🔊 (Speaking Lab, Oxford, Collocation, Recall, Telepon AI, dll.).
 * Pilih lalu tekan Simpan; "Coba suara" memutar suara yang sedang dipilih walau belum disimpan.
 * Disimpan per perangkat.
 */
export function VoiceSettingsCard() {
  const saved = useSyncExternalStore(subscribeVoicePreference, getVoicePreference, () => DEFAULT_VOICE);
  // null = belum ada pilihan baru (ikut yang tersimpan).
  const [draft, setDraft] = useState<VoicePreference | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const selected = draft ?? saved;
  const dirty = draft !== null && draft !== saved;

  const save = () => {
    if (!dirty) return;
    setVoicePreference(draft);
    setDraft(null);
    setJustSaved(true);
  };

  return (
    <Card>
      <CardHeader
        title="Suara"
        description="Suara natural (AI, Groq Orpheus) untuk semua tombol 🔊 dan Telepon AI. Bila tidak tersedia, otomatis memakai suara browser. Kata tunggal tetap memakai rekaman kamus bila ada."
      />
      <div role="radiogroup" aria-label="Pilihan suara" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected === o.id}
            onClick={() => {
              setDraft(o.id);
              setJustSaved(false);
            }}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-left text-sm',
              selected === o.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-fg hover:bg-surface-muted',
            )}
          >
            <span className="block font-medium">{o.label}</span>
            <span className="block text-[11px] text-muted">
              {o.hint}
              {o.id === saved && ' · dipakai'}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => previewVoice(SAMPLE, selected)}>
          <Volume2 className="h-3.5 w-3.5" />
          Coba suara
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={!dirty}>
          <Save className="h-3.5 w-3.5" />
          Simpan suara
        </Button>
        {justSaved && !dirty && (
          <span className="inline-flex items-center gap-1 text-xs text-success" role="status">
            <Check className="h-3.5 w-3.5" />
            Suara tersimpan
          </span>
        )}
        {dirty && <span className="text-xs text-muted">Belum disimpan</span>}
      </div>
    </Card>
  );
}
