import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { Toaster } from 'sonner';
import { DEMO_MODE } from '@/lib/demo';
import { DemoBanner } from '@/components/shared/DemoBanner';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'MNEME — Sovereign Agent Memory',
  description: 'Sovereign, portable, monetisable memory infrastructure for AI agents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: 'only light' }}>
      <head>
        <meta name="color-scheme" content="only light" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body className={`${sans.variable} ${display.variable} ${mono.variable}`}>
        <Providers>
          {DEMO_MODE && <DemoBanner />}
          {children}
          <Toaster position="bottom-right" theme="light" />
        </Providers>
      </body>
    </html>
  );
}
