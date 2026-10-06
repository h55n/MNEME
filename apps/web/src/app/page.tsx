'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import {
  Pillars,
  HowItWorks,
  DeletionProof,
  Developers,
  MarketSection,
  Faq,
} from '@/components/landing/Sections';
import { StartVault } from '@/components/landing/StartVault';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  const router = useRouter();
  const { vaultId } = useAuthStore();

  // Signed-in visitors go straight to their vault.
  useEffect(() => {
    if (vaultId) router.replace('/dashboard');
  }, [vaultId, router]);

  if (vaultId) return null;

  return (
    <div className="min-h-screen bg-[#F1EEE7] text-[#0A0A0A]">
      <Nav />
      <main>
        <Hero />
        <Pillars />
        <HowItWorks />
        <DeletionProof />
        <Developers />
        <MarketSection />
        <Faq />
        <StartVault />
      </main>
      <Footer />
    </div>
  );
}
