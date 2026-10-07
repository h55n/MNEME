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
  const [credentials, setCredentials] = useState<{ vaultId: string; apiKey: string } | null>(null);
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
      setCredentials({ vaultId: data.vault.id, apiKey: data.apiKey });
      toast.success('Vault created. Save your credentials before continuing.');
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
        {credentials ? (
          <div className="lg:col-span-5 lg:col-start-8 rounded-xl bg-[#141414] p-6 space-y-4">
            <h3 className="text-xl">Save your vault credentials</h3>
            <p>Your API key is shown once here and is not saved in your browser. Keep it in a password manager. Reloading signs you out.</p>
            <Input label="Vault ID" value={credentials.vaultId} readOnly />
            <Input label="API key" type="password" value={credentials.apiKey} readOnly />
            <Button type="button" onClick={async () => {
              try { await navigator.clipboard.writeText(JSON.stringify(credentials, null, 2)); toast.success('Copied. Save it in a password manager.'); }
              catch { toast.error('Copy failed. Select the credentials and save them manually.'); }
            }}>Copy credentials</Button>
            <Button type="button" onClick={() => { setCredentials(null); router.push('/dashboard'); }}>I saved them. Open dashboard</Button>
          </div>
        ) : <form
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
        </form>}
      </div>
    </section>
  );
}
