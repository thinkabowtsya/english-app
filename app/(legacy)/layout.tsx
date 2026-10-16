import { LegacyHeader } from './legacy-header';

/**
 * Halaman latihan yang sudah ada sebelumnya (voice call, role-play studio, vocab builder,
 * speaking lab). Tetap berfungsi seperti semula dengan tema gelapnya sendiri, dibungkus
 * agar konsisten di dalam app shell baru.
 */
export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <LegacyHeader />
      <div className="dark -mx-4 rounded-none bg-[#0b0f19] px-4 py-5 text-slate-100 sm:mx-0 sm:rounded-2xl sm:px-6">
        {children}
      </div>
    </div>
  );
}
