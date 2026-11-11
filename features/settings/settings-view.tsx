'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { CloudUpload, Download, LogIn, Monitor, Moon, RotateCcw, Save, Sun } from 'lucide-react';
import { SignOutButton } from '@/components/app-shell/sign-out-button';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Alert, PageHeader, Skeleton } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/modal';
import { notificationSupported, requestNotificationPermission } from '@/lib/browser-alerts';
import { getLegacySummary, importLegacyData, resetProgress, updateSettings } from '@/lib/storage/actions';
import { useAppData, useCloudState } from '@/lib/storage/hooks';
import { settingsSchema } from '@/lib/storage/schema';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '@/lib/timer';
import { cn } from '@/lib/utils';
import type { AppData, Settings, ThemePreference } from '@/types/learning';
import { VoiceSettingsCard } from './voice-settings';

const inputCls = 'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm aria-[invalid=true]:border-danger';

export function SettingsView() {
  const data = useAppData();
  const cloud = useCloudState();
  const signedIn = cloud.userId !== null;
  const [saved, setSaved] = useState<'ok' | 'failed' | null>(null);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan"
        description={
          signedIn
            ? 'Pengaturan belajar tersinkron ke akunmu; tema, suara, dan notifikasi berlaku untuk perangkat ini.'
            : 'Mode tamu: semua pengaturan dan progres tersimpan di browser ini saja.'
        }
      />
      {data ? (
        <>
          {saved && (
            <Alert
              tone={saved === 'ok' ? 'success' : 'error'}
              action={
                <Button size="sm" variant="ghost" onClick={() => setSaved(null)}>
                  Tutup
                </Button>
              }
            >
              {saved === 'ok'
                ? 'Pengaturan disimpan.'
                : 'Pengaturan berubah di perangkat ini tetapi gagal disimpan ke cloud. Coba simpan lagi.'}
            </Alert>
          )}
          <SettingsForm
            key={JSON.stringify(data.settings)}
            settings={data.settings}
            onSaved={(ok) => setSaved(ok ? 'ok' : 'failed')}
            onEdit={() => setSaved(null)}
          />
          <VoiceSettingsCard />
          <LegacyImportCard />
          <DataSection data={data} signedIn={signedIn} />
          <Card className="lg:hidden">
            <CardHeader title="Akun" description={signedIn ? undefined : 'Masuk agar progres tersinkron antar perangkat.'} />
            {signedIn ? (
              <SignOutButton className="-ml-3" />
            ) : (
              <Link href="/login" className={buttonClasses('secondary', 'sm')}>
                <LogIn className="h-4 w-4" />
                Masuk
              </Link>
            )}
          </Card>
        </>
      ) : (
        <Skeleton className="h-96" />
      )}
    </div>
  );
}

type FieldErrors = Partial<Record<keyof Settings, string>>;

function SettingsForm({
  settings,
  onSaved,
  onEdit,
}: {
  settings: Settings;
  onSaved: (ok: boolean) => void;
  onEdit: () => void;
}) {
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [goal, setGoal] = useState(String(settings.dailyGoalMinutes));
  const [session, setSession] = useState(String(settings.defaultSessionMinutes));
  const [theme, setTheme] = useState<ThemePreference>(settings.theme);
  const [sound, setSound] = useState(settings.soundOnFinish);
  const [notify, setNotify] = useState(settings.browserNotification);
  const [difficulty, setDifficulty] = useState(settings.coachDifficulty);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  const onToggleNotify = async (checked: boolean) => {
    setNotice(null);
    if (!checked) {
      setNotify(false);
      return;
    }
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      setNotify(true);
    } else {
      setNotify(false);
      setNotice(
        permission === 'unsupported'
          ? 'Browser ini tidak mendukung notifikasi.'
          : 'Izin notifikasi ditolak. Aktifkan lewat pengaturan situs di browser.',
      );
    }
  };

  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = settingsSchema.safeParse({
      displayName,
      dailyGoalMinutes: goal.trim() === '' ? Number.NaN : Number(goal),
      defaultSessionMinutes: session.trim() === '' ? Number.NaN : Number(session),
      theme,
      soundOnFinish: sound,
      browserNotification: notify,
      coachDifficulty: difficulty,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Settings;
        next[key] ??= issue.message;
      }
      setErrors(next);
      setNotice('Periksa kembali isian yang ditandai.');
      return;
    }
    setErrors({});
    setNotice(null);
    setSaving(true);
    // Form dimuat ulang (key berubah) setelah data diperbarui; hasil disampaikan ke induk.
    onSaved(await updateSettings(parsed.data));
  };

  return (
    <form onSubmit={onSubmit} onChange={onEdit} noValidate className="space-y-4">
      <Card>
        <CardHeader title="Profil & target belajar" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nama panggilan" htmlFor="displayName" error={errors.displayName} hint="Untuk sapaan di dashboard. Opsional.">
            <input
              id="displayName"
              value={displayName}
              maxLength={40}
              onChange={(e) => setDisplayName(e.target.value)}
              aria-invalid={Boolean(errors.displayName)}
              className={inputCls}
            />
          </Field>
          <Field label="Tingkat kesulitan AI Coach" htmlFor="difficulty">
            <select
              id="difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Settings['coachDifficulty'])}
              className={inputCls}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
          <Field label="Target harian (menit)" htmlFor="goal" error={errors.dailyGoalMinutes} hint="Total waktu belajar per hari, 5–600 menit.">
            <input
              id="goal"
              type="number"
              inputMode="numeric"
              min={5}
              max={600}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              aria-invalid={Boolean(errors.dailyGoalMinutes)}
              className={inputCls}
            />
          </Field>
          <Field
            label="Durasi sesi default (menit)"
            htmlFor="session"
            error={errors.defaultSessionMinutes}
            hint={`Pilihan awal di timer, ${MIN_SESSION_MINUTES}–${MAX_SESSION_MINUTES} menit.`}
          >
            <input
              id="session"
              type="number"
              inputMode="numeric"
              min={MIN_SESSION_MINUTES}
              max={MAX_SESSION_MINUTES}
              value={session}
              onChange={(e) => setSession(e.target.value)}
              aria-invalid={Boolean(errors.defaultSessionMinutes)}
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Tampilan" />
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2 sm:max-w-md">
          {(
            [
              { value: 'system', label: 'Sistem', Icon: Monitor },
              { value: 'light', label: 'Terang', Icon: Sun },
              { value: 'dark', label: 'Gelap', Icon: Moon },
            ] as const
          ).map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs',
                theme === value ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:bg-surface-muted',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Akhir sesi" description="Notifikasi di dalam aplikasi selalu tampil saat sesi selesai." />
        <div className="space-y-3">
          <Toggle id="sound" checked={sound} onChange={setSound} label="Bunyikan suara saat sesi selesai" />
          <Toggle
            id="notify"
            checked={notify}
            onChange={(v) => void onToggleNotify(v)}
            label="Notifikasi browser saat sesi selesai"
            hint={notificationSupported() ? 'Berguna jika tab sedang tidak dibuka.' : 'Tidak didukung di browser ini.'}
          />
        </div>
      </Card>

      {notice && <Alert tone="error">{notice}</Alert>}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Menyimpan…' : 'Simpan pengaturan'}
        </Button>
      </div>
    </form>
  );
}

function DataSection({ data, signedIn }: { data: AppData; signedIn: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `english-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader title="Data & privasi" />
      <p className="mb-4 text-sm text-muted">
        {signedIn
          ? 'Aplikasi pribadi dengan satu akun. Progres disimpan di Supabase (dilindungi Row Level Security sehingga hanya akunmu yang bisa membacanya) dan tersinkron antar perangkat. Tema, suara, dan notifikasi hanya tersimpan di perangkat ini.'
          : 'Mode tamu: progres hanya tersimpan di localStorage browser ini — tidak tersinkron, dan hilang bila data situs dihapus. localStorage bukan penyimpanan aman, jadi jangan simpan informasi sensitif.'}
      </p>
      {result && (
        <Alert tone={result.tone} className="mb-4">
          {result.text}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportData}>
          <Download className="h-4 w-4" />
          Ekspor data (JSON)
        </Button>
        <Button
          variant="ghost"
          className="text-danger hover:text-danger"
          onClick={() => {
            setTyped('');
            setResult(null);
            setConfirmOpen(true);
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset progres
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Reset seluruh progres?"
        tone="danger"
        confirmLabel={busy ? 'Mereset…' : 'Reset progres'}
        confirmDisabled={busy || typed.trim().toUpperCase() !== 'RESET'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setBusy(true);
          const res = await resetProgress(data);
          setBusy(false);
          setConfirmOpen(false);
          setResult(res.ok ? { tone: 'success', text: 'Progres di cloud telah direset.' } : { tone: 'error', text: res.error });
        }}
      >
        <p>
          Riwayat sesi ({data.sessions.length}), progres materi, dan daftar review di cloud akan dihapus permanen dari
          semua perangkat. Pengaturan tetap disimpan. Sesi yang sedang berjalan juga dibatalkan.
        </p>
        <label htmlFor="reset-confirm" className="mt-3 block text-xs">
          Ketik <strong className="text-fg">RESET</strong> untuk melanjutkan
        </label>
        <input
          id="reset-confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className={cn(inputCls, 'mt-1')}
        />
      </ConfirmDialog>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
      />
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Impor data versi lokal lama (sebelum login/Supabase) — hanya atas konfirmasi pengguna. */
function LegacyImportCard() {
  const cloud = useCloudState();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const summary = cloud.userId ? getLegacySummary(cloud.userId) : null;
  if (!summary || (summary.imported && !message)) return null;

  return (
    <Card>
      <CardHeader
        icon={<CloudUpload className="h-4 w-4" />}
        title="Data lokal lama ditemukan"
        description="Progres dari versi sebelum login masih tersimpan di browser ini."
      />
      <p className="mb-3 text-sm text-muted">
        {summary.sessions} sesi, {summary.lessons} progres materi, {summary.reviews} item review. Impor hanya jika data
        ini memang milikmu. Data lokal tidak dihapus, dan data yang sudah ada di cloud tidak ditimpa.
      </p>
      {message && (
        <Alert tone={message.tone} className="mb-3">
          {message.text}
        </Alert>
      )}
      {!summary.imported && (
        <Button variant="secondary" disabled={busy} onClick={() => setConfirm(true)}>
          <CloudUpload className="h-4 w-4" />
          {busy ? 'Mengimpor…' : 'Impor ke akun ini'}
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        title="Impor data lokal ke akun ini?"
        confirmLabel="Impor"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          setBusy(true);
          const res = await importLegacyData();
          setBusy(false);
          setMessage(
            res.ok
              ? {
                  tone: 'success',
                  text: `${res.sessions} sesi diimpor${res.skipped ? `, ${res.skipped} item dilewati (duplikat/tidak valid)` : ''}.`,
                }
              : { tone: 'error', text: res.error },
          );
        }}
        description="Data akan dikirim ke akun Supabase yang sedang login. Impor ulang aman: item yang sama tidak digandakan."
      />
    </Card>
  );
}
