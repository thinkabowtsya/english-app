import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MobileBottomNav, MobileTopBar, Sidebar } from '@/components/app-shell/navigation';
import { StorageWarning } from '@/components/app-shell/storage-warning';
import { ThemeSync } from '@/components/app-shell/theme';
import { themeInitScript } from '@/components/app-shell/theme-script';
import { SessionSummaryDialog } from '@/features/timer/session-summary-dialog';
import { TimerController } from '@/features/timer/timer-controller';

export const metadata: Metadata = {
  title: {
    default: 'Antigravity English — Personal Learning Workspace',
    template: '%s · Antigravity English',
  },
  description:
    'Workspace belajar bahasa Inggris pribadi: timer belajar harian, target, progres, materi terstruktur, dan AI English Coach.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1013' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        <Sidebar />
        <MobileTopBar />
        <div className="lg:pl-60">
          <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
            <StorageWarning />
            {children}
          </main>
        </div>
        <MobileBottomNav />
        <TimerController />
        <SessionSummaryDialog />
        <ThemeSync />
      </body>
    </html>
  );
}
