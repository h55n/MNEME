'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { vaultApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Button, Input } from '@/components/ui';


export function StartVault() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [form, setForm] = useState({ operatorAddress: '', name: '' });

  const createMut = useMutation({
    mutationFn: (input: { operatorAddress: string; name?: string }) =>
      vaultApi.create({ operatorAddress: input.operatorAddress, name: input.name || undefined, plan: 'free' }),
    onSuccess: (data) => {
      setSession({
        vaultId: data.vault.id,
        apiKey: data.apiKey,
        operatorAddress: data.vault.operatorAddress,
        vaultName: data.vault.name,
        plan: data.vault.plan,
      });
      toast.success('Vault created. Store your API key somewhere safe.');
      router.push('/dashboard');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <section id="start" className="bg-[#0A0A0A] text-[#F1EEE7] scroll-mt-4">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-20 py-20 sm:py-28 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6">
          <p className="eyebrow mb-5 text-[#F1EEE7]/70">Start</p>
          <h2 className="font-medium text-balance text-[clamp(40px,5.2vw,80px)] leading-none">
            Give your agent a memory it keeps.
          </h2>
          <p className="mt-4 text-[17px] leading-[1.35] text-[#F1EEE7]/70 max-w-md">
            Create a vault in under a minute. Free tier, 1,000 memories a month, no credit card.
          </p>
        </div>
        <form
          className="lg:col-span-5 lg:col-start-8 rounded-xl bg-[#141414] ring-1 ring-white/15 text-[#F1EEE7] p-5 sm:p-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.operatorAddress.trim()) createMut.mutate(form);
          }}
        >
          <Input
            label="Operator address (wallet or identifier)"
            placeholder="Wallet address or email"
            value={form.operatorAddress}
            onChange={(e) => setForm((f) => ({ ...f, operatorAddress: e.target.value }))}
          />
          <Input
            label="Vault name (optional)"
            placeholder="My legal agent"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Button type="submit" className="w-full" loading={createMut.isPending} disabled={!form.operatorAddress.trim()}>
            Create vault <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button type="button" variant="secondary" className="w-full" onClick={() => router.push('/login')}>
            Log in
          </Button>
        </form>
      </div>
    </section>
  );
}
