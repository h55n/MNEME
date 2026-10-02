import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { Toaster } from 'sonner';
import { DEMO_MODE } from '@/lib/demo';
import { DemoBanner } from '@/components/shared/DemoBanner';

export const metadata: Metadata = {
  title: 'MNEME — Sovereign Agent Memory',
  description: 'Sovereign, portable, monetisable memory infrastructure for AI agents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {DEMO_MODE && <DemoBanner />}
          {children}
          <Toaster position="bottom-right" theme="light" />
        </Providers>
      </body>
    </html>
  );
}
