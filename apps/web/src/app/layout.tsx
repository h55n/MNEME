import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'MNEME — Sovereign Agent Memory',
  description: 'Sovereign, portable, monetisable memory infrastructure for AI agents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster position="bottom-right" theme="light" />
        </Providers>
      </body>
    </html>
  );
}
