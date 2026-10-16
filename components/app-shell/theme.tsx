'use client';

import { useEffect } from 'react';
import { useAppData } from '@/lib/storage/hooks';

/** Menjaga class `.dark` tetap sinkron saat pengaturan atau tema sistem berubah. */
export function ThemeSync() {
  const data = useAppData();
  const theme = data?.settings.theme;

  useEffect(() => {
    if (!theme) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return null;
}
