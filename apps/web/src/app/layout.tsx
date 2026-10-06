import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { Toaster } from 'sonner';

const sans = localFont({ src: '../fonts/Geist-Variable.woff2', variable: '--font-sans', display: 'swap', weight: '100 900' });
const mono = localFont({ src: '../fonts/GeistMono-Variable.woff2', variable: '--font-mono', display: 'swap', weight: '100 900' });

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
      <body className={`${sans.variable} ${mono.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster position="bottom-right" theme="light" />
        </Providers>
      </body>
    </html>
  );
}
