'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { vaultApi } from '@/lib/api';
import { useAuthStore } from '@/store';
import { Button, Input, Card } from '@/components/ui';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { setSession, vaultId } = useAuthStore();
  const [form, setForm] = useState({ vaultId: '', apiKey: '' });

  const loginMut = useMutation({
    mutationFn: async () => {
      // Temporarily set session to use API key for the GET request
      setSession({
        vaultId: form.vaultId,
        apiKey: form.apiKey,
        operatorAddress: '',
      });
      return vaultApi.get(form.vaultId);
    },
    onSuccess: (data) => {
      setSession({
        vaultId: data.id,
        apiKey: form.apiKey,
        operatorAddress: data.operatorAddress,
        vaultName: data.name,
        plan: data.plan,
      });
      toast.success('Successfully logged into Vault');
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error('Invalid Vault ID or API Key');
      // Revert temporary session if failed
      useAuthStore.getState().clearSession();
    },
  });

  if (vaultId) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block mb-8">
            <img src="/mneme.svg" alt="mneme." className="h-8 w-auto mx-auto" />
          </a>
          <h1 className="text-display mb-2">Access Vault</h1>
          <p className="text-body-lg text-neutral-500">
            Enter your credentials to manage your agent's memory.
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <Input
              label="Vault ID"
              placeholder="vlt_..."
              value={form.vaultId}
              onChange={e => setForm(f => ({ ...f, vaultId: e.target.value }))}
            />
            <Input
              label="API Key"
              type="password"
              placeholder="mnk_live_..."
              value={form.apiKey}
              onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
            />
            <Button
              className="w-full"
              onClick={() => loginMut.mutate()}
              loading={loginMut.isPending}
              disabled={!form.vaultId || !form.apiKey}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Access Vault
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
