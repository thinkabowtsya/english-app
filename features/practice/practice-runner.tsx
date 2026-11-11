'use client';

import { useState } from 'react';
import { Check, Eraser, Lightbulb, LoaderCircle, Play, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/feedback';
import { checkLocally, type PracticeItem, type PracticeItemType } from '@/lib/practice';
import { playPronunciation, speakText } from '@/lib/speech';
import { cn } from '@/lib/utils';

/**
 * Pengerjaan soal latihan satu per satu. Mode biasa: jawaban langsung diperiksa dan dibahas.
 * Mode evaluasi (`deferFeedback`): jawaban dikumpulkan, diperiksa sekaligus di akhir.
 */

export const TYPE_LABEL: Record<PracticeItemType, string> = {
  choice: 'Pilihan ganda',
  fill: 'Isi bagian kosong',
  fix: 'Perbaiki kalimat',
  arrange: 'Susun kalimat',
  translate: 'Terjemahkan',
  'type-word': 'Ketik kata',
  dictation: 'Dikte',
  write: 'Buat kalimat',
};

/** Periksa satu jawaban: lokal dulu, lalu AI untuk jawaban bebas yang tidak cocok dengan kunci. */
export async function checkItem(item: PracticeItem, response: string): Promise<PracticeItem> {
  const local = checkLocally(item, response);
  if (local) return { ...item, response, correct: local.correct, ...(local.feedback ? { feedback: local.feedback } : {}) };
  try {
    const res = await fetch('/api/practice/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: item.type,
        prompt: item.prompt,
        text: item.text,
        answer: item.answer,
        response,
        vocab: item.vocab?.item,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || typeof body?.correct !== 'boolean') throw new Error(String(res.status));
    return {
      ...item,
      response,
      correct: body.correct,
      ...(body.feedback ? { feedback: body.feedback } : {}),
      ...(body.corrected ? { corrected: body.corrected } : {}),
    };
  } catch {
    return { ...item, response, correct: false, feedback: 'Jawaban tidak bisa dinilai AI saat ini; dibandingkan dengan kunci saja.' };
  }
}

/** Teks dengan "___" ditebalkan. */
function Gap({ text }: { text: string }) {
  const parts = text.split(/(_{3,})/);
  return (
    <>
      {parts.map((p, i) =>
        /^_{3,}$/.test(p) ? (
          <span key={i} className="mx-0.5 inline-block min-w-12 border-b-2 border-accent align-baseline" aria-label="bagian kosong">
            &nbsp;
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const inputClass = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg disabled:opacity-70';

function ItemInput({
  item,
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  item: PracticeItem;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v?: string) => void;
  disabled: boolean;
}) {
  const [hint, setHint] = useState(false);

  if (item.type === 'choice') {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {item.options!.map((opt) => {
          const chosen = value === opt;
          const isAnswer = opt === item.answer;
          // idle: bisa dipilih · pending: dipilih, sedang/menunggu diperiksa · right/wrong: hasil.
          const state = !disabled
            ? 'idle'
            : item.correct === undefined
              ? chosen
                ? 'pending'
                : 'dim'
              : isAnswer
                ? 'right'
                : chosen
                  ? 'wrong'
                  : 'dim';
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onSubmit(opt)}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm transition-colors',
                state === 'idle' && 'border-line bg-surface text-fg hover:bg-surface-muted',
                state === 'pending' && 'border-accent bg-accent-soft text-accent',
                state === 'right' && 'border-success bg-success-soft font-medium text-success',
                state === 'wrong' && 'border-danger bg-danger-soft text-danger',
                state === 'dim' && 'border-line text-muted opacity-60',
              )}
            >
              <span>{opt}</span>
              {state === 'right' && <Check className="h-4 w-4 shrink-0" />}
              {state === 'wrong' && <X className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  if (item.type === 'arrange') {
    const used = value ? value.split(' ') : [];
    // Hitung token yang tersisa (kata yang sama bisa muncul lebih dari sekali).
    const remaining = [...item.tokens!];
    for (const w of used) {
      const idx = remaining.indexOf(w);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    return (
      <div className="space-y-3">
        <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-line p-2">
          {used.length === 0 && <span className="px-1 text-xs text-muted">Ketuk kata di bawah sesuai urutan.</span>}
          {used.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange(used.filter((_, j) => j !== i).join(' '))}
              className="rounded-lg bg-accent-soft px-2.5 py-1 text-sm text-accent"
            >
              {w}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => onChange([...used, w].join(' '))}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-sm text-fg hover:bg-surface-muted"
            >
              {w}
            </button>
          ))}
        </div>
        {!disabled && used.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => onChange('')}>
            <Eraser className="h-3.5 w-3.5" />
            Ulangi susunan
          </Button>
        )}
      </div>
    );
  }

  const multiline = item.type === 'translate' || item.type === 'write' || item.type === 'fix' || item.type === 'dictation';
  const placeholder: Record<string, string> = {
    fill: 'Ketik kata yang hilang…',
    'type-word': 'Ketik kata/collocation…',
    fix: 'Tulis kalimat yang benar…',
    translate: 'Tulis terjemahan bahasa Inggris…',
    dictation: 'Ketik kalimat yang kamu dengar…',
    write: 'Tulis kalimatmu sendiri…',
  };
  return (
    <div className="space-y-2">
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (value.trim()) onSubmit();
            }
          }}
          disabled={disabled}
          rows={2}
          placeholder={placeholder[item.type]}
          aria-label="Jawaban"
          className={inputClass}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onSubmit();
          }}
          disabled={disabled}
          placeholder={placeholder[item.type]}
          aria-label="Jawaban"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={inputClass}
        />
      )}
      {item.type === 'type-word' && !disabled && (
        <button type="button" onClick={() => setHint(true)} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
          <Lightbulb className="h-3.5 w-3.5" />
          {hint
            ? `Petunjuk: diawali "${item.answer[0]}", ${item.answer.split(' ').length} kata, ${item.answer.replace(/\s/g, '').length} huruf`
            : 'Lihat petunjuk'}
        </button>
      )}
    </div>
  );
}

/** Pembahasan satu soal setelah diperiksa. */
export function ItemResult({ item }: { item: PracticeItem }) {
  const listenText = item.type === 'write' ? item.corrected || item.response || item.answer : item.type === 'fill' || item.type === 'type-word' ? item.text.replace(/_{3,}/, item.answer) : item.answer;
  return (
    <div
      className={cn(
        'space-y-1.5 rounded-xl border p-3 text-sm',
        item.correct ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft',
      )}
    >
      <p className={cn('flex items-center gap-1.5 font-semibold', item.correct ? 'text-success' : 'text-danger')}>
        {item.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
        {item.correct ? 'Benar' : 'Belum tepat'}
      </p>
      {!item.correct && item.type !== 'write' && (
        <p className="text-fg">
          <span className="text-muted">Jawaban: </span>
          <span className="font-medium">{item.answer}</span>
        </p>
      )}
      {item.corrected &&
        normalize(item.corrected) !== normalize(item.response ?? '') &&
        (item.type === 'write' || normalize(item.corrected) !== normalize(item.answer)) && (
        <p className="text-fg">
          <span className="text-muted">Versi yang lebih tepat: </span>
          <span className="font-medium">{item.corrected}</span>
        </p>
      )}
      {item.feedback && <p className="text-xs text-muted">{item.feedback}</p>}
      {item.type === 'write' && (
        <p className="text-xs text-muted">
          Contoh: <span className="text-fg">{item.answer}</span>
        </p>
      )}
      {item.explanation && <p className="text-xs text-muted">{item.explanation}</p>}
      <button
        type="button"
        onClick={() => playPronunciation(listenText)}
        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
      >
        <Volume2 className="h-3.5 w-3.5" />
        Dengarkan
      </button>
    </div>
  );
}

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

export function PracticeRunner({
  items: initial,
  deferFeedback = false,
  onFinish,
}: {
  items: PracticeItem[];
  deferFeedback?: boolean;
  onFinish: (items: PracticeItem[]) => void;
}) {
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState(initial[0]?.type === 'fix' ? initial[0].text : '');
  const [checking, setChecking] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const item = items[index];
  const last = index === items.length - 1;
  const answered = item.correct !== undefined || (deferFeedback && item.response !== undefined);

  const goNext = async (list: PracticeItem[]) => {
    if (!last) {
      const next = list[index + 1];
      setIndex(index + 1);
      setValue(next.type === 'fix' ? next.text : '');
      return;
    }
    if (deferFeedback) {
      setFinishing(true);
      const checked = await Promise.all(list.map((it) => checkItem(it, it.response ?? '')));
      setFinishing(false);
      onFinish(checked);
    } else {
      onFinish(list);
    }
  };

  const submit = async (override?: string) => {
    const response = override ?? value;
    if (!response.trim() || answered || checking) return;
    if (override !== undefined) setValue(override);
    if (deferFeedback) {
      const list = items.map((it, i) => (i === index ? { ...it, response } : it));
      setItems(list);
      await goNext(list);
      return;
    }
    setChecking(true);
    const checked = await checkItem(item, response);
    setChecking(false);
    setItems((prev) => prev.map((it, i) => (i === index ? checked : it)));
  };

  if (finishing) {
    return (
      <Card className="flex items-center gap-2 text-sm text-muted" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Memeriksa jawaban...
      </Card>
    );
  }

  return (
    <Card key={index} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>
            Soal {index + 1} dari {items.length} · {TYPE_LABEL[item.type]}
          </span>
        </div>
        <ProgressBar value={((index + (answered ? 1 : 0)) / items.length) * 100} label="Progres sesi" />
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium text-fg">{item.prompt}</p>
        {item.type === 'dictation' ? (
          <Button variant="secondary" onClick={() => speakText(item.answer, undefined, 'en-US')}>
            <Play className="h-4 w-4" />
            Putar kalimat
          </Button>
        ) : item.text && item.type !== 'fix' ? (
          <p
            className={cn(
              'rounded-lg bg-surface-muted px-3 py-2 text-sm',
              item.type === 'arrange' || item.type === 'translate' || item.type === 'write' ? 'text-muted' : 'text-fg',
            )}
          >
            {item.type === 'arrange' && <span className="mr-1 text-xs">Arti:</span>}
            <Gap text={item.text} />
          </p>
        ) : null}
        {item.type === 'fix' && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-fg line-through decoration-danger/50">{item.text}</p>
        )}
      </div>

      <ItemInput item={item} value={item.response ?? value} onChange={setValue} onSubmit={submit} disabled={answered || checking} />

      {item.correct !== undefined && !deferFeedback && <ItemResult item={item} />}

      <div className="flex flex-wrap justify-end gap-2">
        {!answered && item.type !== 'choice' && (
          <Button onClick={() => submit()} disabled={!value.trim() || checking}>
            {checking && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {deferFeedback ? (last ? 'Selesai & periksa' : 'Simpan jawaban & lanjut') : checking ? 'Memeriksa...' : 'Periksa'}
          </Button>
        )}
        {answered && !deferFeedback && (
          <Button onClick={() => goNext(items)}>{last ? 'Selesai & simpan' : 'Soal berikutnya →'}</Button>
        )}
      </div>
    </Card>
  );
}
