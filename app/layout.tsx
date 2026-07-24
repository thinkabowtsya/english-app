import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/navbar';

export const metadata: Metadata = {
  title: 'Antigravity English AI - Interactive English Learning App',
  description: 'Learn English with native AI conversation partner, real-time grammar corrections, voice recognition, and interactive vocabulary builder powered by Groq Llama 3.3 70B.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white" suppressHydrationWarning>
        <div className="relative min-h-screen flex flex-col glow-gradient-purple glow-gradient-blue">
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-center text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Antigravity English AI • Powered by Groq Cloud & Web Speech API</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
