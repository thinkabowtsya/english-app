'use client';

import { Alert } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { useStorageWarning } from '@/lib/storage/hooks';
import { dismissStorageWarning } from '@/lib/storage/store';

export function StorageWarning() {
  const warning = useStorageWarning();
  if (!warning) return null;
  return (
    <Alert
      tone="warning"
      className="mb-4"
      title="Penyimpanan lokal bermasalah"
      action={
        <Button size="sm" variant="ghost" onClick={dismissStorageWarning}>
          Tutup
        </Button>
      }
    >
      {warning}
    </Alert>
  );
}
