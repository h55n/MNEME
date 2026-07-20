import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { Toaster } from 'sonner';
import { DemoBanner } from '@/components/shared/DemoBanner';

export const metadata: Metadata = {
  title: 'MNEME — Sovereign Agent Memory',
  description: 'Sovereign, portable, monetisable memory infrastructure for AI agents.',
};

// Demo mode is active in non-production builds when NEXT_PUBLIC_API_URL is not set.
// This is evaluated at server render time (no 'use client' required here).
const isDemoMode =
  process.env.NODE_ENV !== 'production' &&
  (!process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL === '');

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {isDemoMode && <DemoBanner />}
          {children}
          <Toaster position="bottom-right" theme="light" />
        </Providers>
      </body>
    </html>
  );
}
