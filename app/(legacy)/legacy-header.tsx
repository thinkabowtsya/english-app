'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

const PARENTS: Record<string, { href: string; label: string }> = {
  '/practice': { href: '/percakapan', label: 'Percakapan AI' },
  '/vocabulary': { href: '/latihan', label: 'Latihan' },
  '/pronunciation': { href: '/latihan', label: 'Latihan' },
  '/collocations': { href: '/latihan', label: 'Latihan' },
};

export function LegacyHeader() {
  const pathname = usePathname();
  const parent = PARENTS[pathname] ?? { href: '/', label: 'Dashboard' };
  return (
    <div className="mb-4">
      <Link href={parent.href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="h-4 w-4" />
        Kembali ke {parent.label}
      </Link>
    </div>
  );
}
