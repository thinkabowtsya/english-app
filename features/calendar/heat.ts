/** Warna tingkat aktivitas 0–4 (seperti GitHub): makin tinggi makin hijau. Mengikuti token tema. */
const MIX = [0, 28, 50, 75, 100];

export function heatColor(level: number): string {
  if (level <= 0) return 'var(--surface-muted)';
  return `color-mix(in srgb, var(--success) ${MIX[Math.min(4, level)]}%, var(--surface-muted))`;
}
