import { LegacyHeader } from './legacy-header';

/**
 * Alat latihan yang sudah ada sebelumnya (voice call, role-play studio, vocab builder,
 * speaking lab). Memakai design token yang sama dengan app shell (light/dark), dan frasa
 * yang disimpan dari sini masuk ke daftar review.
 */
export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <LegacyHeader />
      {children}
    </div>
  );
}
