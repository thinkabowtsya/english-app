import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/app-shell/app-shell';
import { ThemeSync } from '@/components/app-shell/theme';
import { themeInitScript } from '@/components/app-shell/theme-script';
import { getAuthenticatedUser } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: {
    default: 'My Journey — English Learning',
    template: '%s · My Journey',
  },
  description:
    'Workspace belajar bahasa Inggris pribadi: timer belajar harian, target, progres tersinkron, materi terstruktur, dan AI English Coach.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1013' },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getAuthenticatedUser();
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <AppShell userId={user?.id ?? null} email={user?.email ?? null}>
          {children}
        </AppShell>
        <ThemeSync />
      </body>
    </html>
  );
}
