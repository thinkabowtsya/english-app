'use client';

import { useEffect } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/feedback';
import { flushOutbox, hasInflightWrites, loadCloudData, loadLocalData } from '@/lib/storage/actions';
import { useCloudState } from '@/lib/storage/hooks';

/** Muat ulang data dari cloud saat tab kembali aktif setelah jeda ini (sinkron lintas perangkat). */
const REFRESH_AFTER_MS = 60_000;

/** Memuat data belajar dari Supabase dan mengirim ulang sesi tertunda saat online kembali. */
export function CloudDataLoader({ userId }: { userId: string }) {
  useEffect(() => {
    let lastLoad = Date.now();
    void loadCloudData(userId);

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastLoad < REFRESH_AFTER_MS || hasInflightWrites()) return;
      lastLoad = Date.now();
      void loadCloudData(userId);
    };
    const onOnline = () => void flushOutbox();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [userId]);

  return null;
}

/** Memuat data belajar dari localStorage untuk pengguna tamu (tanpa login). */
export function GuestDataLoader() {
  useEffect(() => {
    loadLocalData();
  }, []);
  return null;
}

/** Status sinkronisasi yang jujur: tidak pernah menampilkan "tersimpan" bila belum tersimpan. */
export function SyncStatusBanner() {
  const cloud = useCloudState();
  const userId = cloud.userId;
  if (!userId) {
    // Tamu: data hanya di browser ini; tampilkan bila penyimpanan lokal gagal.
    return cloud.syncError ? (
      <Alert tone="error" className="mb-4">
        {cloud.syncError}
      </Alert>
    ) : null;
  }

  if (cloud.status === 'error') {
    return (
      <Alert
        tone="error"
        className="mb-4"
        title="Data belajar belum dapat dimuat"
        action={
          <Button size="sm" variant="secondary" onClick={() => void loadCloudData(userId)}>
            <RefreshCw className="h-3.5 w-3.5" />
            Coba lagi
          </Button>
        }
      >
        {cloud.loadError}
      </Alert>
    );
  }

  return (
    <>
      {cloud.loadError && (
        <Alert
          tone="warning"
          className="mb-4"
          action={
            <Button size="sm" variant="ghost" onClick={() => void loadCloudData(userId)}>
              Muat ulang
            </Button>
          }
        >
          {cloud.loadError} Data yang tampil mungkin belum terbaru.
        </Alert>
      )}
      {cloud.syncError && (
        <Alert
          tone="error"
          className="mb-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => void loadCloudData(userId)}>
              Muat ulang data
            </Button>
          }
        >
          {cloud.syncError}
        </Alert>
      )}
      {cloud.pendingSessions > 0 && (
        <Alert
          tone="warning"
          className="mb-4"
          title={`${cloud.pendingSessions} sesi belum tersimpan ke cloud`}
          action={
            <Button size="sm" variant="secondary" onClick={() => void flushOutbox()}>
              <CloudOff className="h-3.5 w-3.5" />
              Kirim ulang
            </Button>
          }
        >
          Sesi disimpan sementara di perangkat ini dan akan dikirim otomatis saat koneksi kembali.
        </Alert>
      )}
    </>
  );
}
