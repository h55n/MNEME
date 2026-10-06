'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ApiError, vaultApi } from '@/lib/api';
import { BUILT_IN_API_URL, normalizeApiUrl, safeNextPath, useAuthHydrated, useIsAuthenticated } from '@/lib/auth';
import { useAuthStore } from '@/store';
import { Button, Input, Card, Spinner } from '@/components/ui';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

const VAULT_ID = /^vlt_[A-Za-z0-9_-]{3,}$/;

function describe(err: unknown): { field?: 'vaultId' | 'apiKey' | 'apiUrl'; message: string } {
  if (err instanceof ApiError) {
    if (err.kind === 'unauthorized') return { field: 'apiKey', message: 'That API key was not accepted for this vault.' };
    if (err.kind === 'not-found' && err.message.startsWith('Nothing at')) return { field: 'apiUrl', message: err.message };
    if (err.kind === 'not-found') return { field: 'vaultId', message: 'No vault with that ID on this server.' };
    if (err.kind === 'network' || err.kind === 'invalid-response') return { field: 'apiUrl', message: err.message };
    return { message: err.message };
  }
  return { message: 'Something went wrong. Try again.' };
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const hydrated = useAuthHydrated();
  const authenticated = useIsAuthenticated();
  const { setSession, apiUrl: savedApiUrl } = useAuthStore();
  const needsApiUrl = !BUILT_IN_API_URL;

  const [form, setForm] = useState({ vaultId: '', apiKey: '', apiUrl: '' });
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<{ field?: 'vaultId' | 'apiKey' | 'apiUrl'; message: string } | null>(null);

  // Prefill the API URL saved by an earlier login, once it has loaded.
  useEffect(() => {
    if (hydrated && savedApiUrl) setForm((f) => (f.apiUrl ? f : { ...f, apiUrl: savedApiUrl }));
  }, [hydrated, savedApiUrl]);

  // Already signed in: go where they were headed.
  useEffect(() => {
    if (hydrated && authenticated) router.replace(next);
  }, [hydrated, authenticated, next, router]);

  const apiUrl = needsApiUrl ? normalizeApiUrl(form.apiUrl) : BUILT_IN_API_URL;
  const errors = {
    vaultId: !form.vaultId.trim() ? 'Enter your Vault ID.' : !VAULT_ID.test(form.vaultId.trim()) ? 'A Vault ID looks like vlt_...' : '',
    apiKey: !form.apiKey.trim() ? 'Enter your API key.' : '',
    apiUrl: needsApiUrl ? (!form.apiUrl.trim() ? 'Enter the address of your MNEME server.' : !apiUrl ? 'That is not a valid http(s) address.' : '') : '',
  };
  const invalid = Boolean(errors.vaultId || errors.apiKey || errors.apiUrl);

  const loginMut = useMutation({
    // The key and URL are checked against the server first; nothing is saved unless it answers.
    mutationFn: () =>
      vaultApi.get(form.vaultId.trim(), { baseUrl: apiUrl ?? undefined, apiKey: form.apiKey.trim() }),
    onSuccess: (data) => {
      setSession({
        vaultId: data.id,
        apiKey: form.apiKey.trim(),
        operatorAddress: data.operatorAddress,
        vaultName: data.name,
        plan: data.plan,
        apiUrl: needsApiUrl ? apiUrl : null,
      });
      toast.success('Signed in');
      router.replace(next);
    },
    onError: (err) => setServerError(describe(err)),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (!invalid) loginMut.mutate();
  }

  const fieldError = (field: 'vaultId' | 'apiKey' | 'apiUrl') =>
    (touched && errors[field]) || (serverError?.field === field ? serverError.message : '');

  if (!hydrated || authenticated) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center" role="status" aria-label="Loading">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block mb-8">
            <span className="inline-flex items-center gap-2" aria-label="mneme"><span className="w-2.5 h-2.5 rounded-full bg-tertiary" /><span className="font-mono uppercase text-[16px] font-medium">mneme</span></span>
          </a>
          <h1 className="text-display mb-2">Access Vault</h1>
          <p className="text-body-lg text-neutral-500">
            Sign in with the Vault ID and API key from your MNEME server.
          </p>
        </div>

        <Card>
          <form className="space-y-4" onSubmit={submit} noValidate>
            {needsApiUrl && (
              <Input
                label="MNEME API URL"
                placeholder="http://localhost:3001/v1"
                autoComplete="url"
                inputMode="url"
                value={form.apiUrl}
                error={fieldError('apiUrl') || undefined}
                onChange={(e) => { setServerError(null); setForm((f) => ({ ...f, apiUrl: e.target.value })); }}
              />
            )}
            <Input
              label="Vault ID"
              placeholder="vlt_..."
              autoComplete="username"
              value={form.vaultId}
              error={fieldError('vaultId') || undefined}
              onChange={(e) => { setServerError(null); setForm((f) => ({ ...f, vaultId: e.target.value })); }}
            />
            <Input
              label="API Key"
              type="password"
              placeholder="mnk_live_..."
              autoComplete="current-password"
              value={form.apiKey}
              error={fieldError('apiKey') || undefined}
              onChange={(e) => { setServerError(null); setForm((f) => ({ ...f, apiKey: e.target.value })); }}
            />
            {serverError && !serverError.field && (
              <p role="alert" className="text-body-md text-error">{serverError.message}</p>
            )}
            <Button type="submit" className="w-full" loading={loginMut.isPending} disabled={loginMut.isPending}>
              <LogIn className="w-4 h-4 mr-2" />
              Access Vault
            </Button>
            <Button type="button" variant="secondary" className="w-full" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-body-md text-neutral-500">
          No server yet? MNEME is self-hosted. Clone the repo, run{' '}
          <code className="font-mono text-[13px]">docker-compose up -d</code> and{' '}
          <code className="font-mono text-[13px]">npm run dev</code>, then create a vault and paste its ID and key here.{' '}
          <a className="underline" href="https://github.com/h55n/MNEME#-getting-started-local" target="_blank" rel="noreferrer">Setup guide</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
