'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, LogOut } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { clearClientState, flushOutbox, stopActiveTimer } from '@/lib/storage/actions';
import { useActiveTimer, useCloudState } from '@/lib/storage/hooks';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  const timer = useActiveTimer();
  const cloud = useCloudState();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const signOut = () => {
    setConfirm(false);
    startTransition(async () => {
      stopActiveTimer();
      // Coba kirim sesi tertunda dulu; yang gagal tetap tersimpan di antrean perangkat ini.
      await flushOutbox();
      clearClientState();
      await logout();
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn('justify-start', className)}
        disabled={pending}
        onClick={() => (timer || cloud.pendingSessions > 0 ? setConfirm(true) : signOut())}
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Keluar
      </Button>
      <ConfirmDialog
        open={confirm}
        title="Keluar dari akun?"
        confirmLabel="Keluar"
        onCancel={() => setConfirm(false)}
        onConfirm={signOut}
      >
        {timer && <p>Sesi yang sedang berjalan akan dihentikan dan waktu aktifnya dicatat.</p>}
        {cloud.pendingSessions > 0 && (
          <p className="mt-2">
            {cloud.pendingSessions} sesi belum tersimpan ke cloud. Sesi itu tetap tersimpan di perangkat ini dan akan
            dikirim saat kamu login lagi di sini.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
