'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { vaultApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Button, Input, Card } from '@/components/ui';
import { Brain, Shield, TrendingUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const FEATURES = [
  {
    icon: Brain,
    title: 'Sovereign Memory',
    desc: 'Your agent\'s knowledge tied to your keys — not a vendor\'s platform.',
  },
  {
    icon: Shield,
    title: 'On-chain Provenance',
    desc: 'Every memory write cryptographically attested on Monad Testnet.',
  },
  {
    icon: TrendingUp,
    title: 'Memory Market',
    desc: 'Monetise domain expertise. 80% revenue share, settled in USDC.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { setSession, vaultId } = useAuthStore();
  const [form, setForm] = useState({ operatorAddress: '', name: '' });

  // ── Must declare ALL hooks before any early return ─────────────────────────
  const createMut = useMutation({
    mutationFn: () => vaultApi.create({
      operatorAddress: form.operatorAddress,
      name: form.name || undefined,
      plan: 'free',
    }),
    onSuccess: (data) => {
      setSession({
        vaultId: data.vault.id,
        apiKey: data.apiKey,
        operatorAddress: data.vault.operatorAddress,
        vaultName: data.vault.name,
        plan: data.vault.plan,
      });
      toast.success('Vault created — store your API key securely!');
      router.push('/dashboard');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Already logged in — redirect after hooks
  if (vaultId) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <header className="border-b border-secondary px-8 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center">
          <img src="/mneme.svg" alt="mneme." className="h-8 w-auto" />
        </a>
        <span className="text-label-sm text-neutral-400">Sovereign Agent Memory · Monad Testnet</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary/10 border border-tertiary/20 rounded-full text-label-sm text-tertiary mb-5">
              <span className="w-1.5 h-1.5 bg-tertiary rounded-full" />
              Monad Testnet · Live
            </div>
            <h1 className="text-display mb-3 tracking-tight">
              Memory your agent owns.
            </h1>
            <p className="text-body-lg text-neutral-500 max-w-lg mx-auto">
              Sovereign, portable, monetisable memory infrastructure for AI agents.
              Switch models, keep memory. Prove deletion. Sell expertise.
            </p>
          </div>

          {/* Feature row */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-4 rounded-xl hover:bg-white/5 hover:scale-105 transition-all duration-300">
                <Icon className="w-6 h-6 mx-auto mb-2 text-neutral-300" />
                <p className="text-headline-sm mb-1">{title}</p>
                <p className="text-body-sm text-neutral-500">{desc}</p>
              </div>
            ))}
          </div>

          {/* Create vault card */}
          <div className="max-w-md mx-auto">
            <Card className="hover:border-primary/40 transition-colors duration-300">
              <h2 className="text-headline-md mb-1">Create a Vault</h2>
              <p className="text-body-sm text-neutral-500 mb-4">
                Your vault is sovereign — owned by your wallet address.
              </p>
              <div className="space-y-3">
                <Input
                  label="Operator Address (wallet / identifier)"
                  placeholder="0x742d35Cc... or your@email.com"
                  value={form.operatorAddress}
                  onChange={e => setForm(f => ({ ...f, operatorAddress: e.target.value }))}
                />
                <Input
                  label="Vault name (optional)"
                  placeholder="My Legal Agent"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                <Button
                  className="w-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  onClick={() => createMut.mutate()}
                  loading={createMut.isPending}
                  disabled={!form.operatorAddress.trim()}
                >
                  Create Vault
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="w-1/2 hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    onClick={() => {
                      setForm({ operatorAddress: '0x742d35Cc6634C0532925a3b8D4C9E3B9a1C2F0d4', name: 'Demo Agent Vault' });
                      setTimeout(() => createMut.mutate(), 50);
                    }}
                    disabled={createMut.isPending}
                  >
                    ⚡ Demo
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-1/2 hover:bg-secondary/80 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    onClick={() => router.push('/login')}
                  >
                    Login
                  </Button>
                </div>
              </div>
              <p className="text-body-sm text-neutral-400 mt-3">
                Free tier · 1,000 memories/month · No credit card required
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
