'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { vaultApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, Button, Badge, Input, MonoHash } from '@/components/ui';
import { Copy, RotateCw, Eye, EyeOff, Terminal, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { vaultId, apiKey, operatorAddress, vaultName, plan, setSession, clearSession } = useAuthStore();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const rotateMut = useMutation({
    mutationFn: () => vaultApi.rotateKey(vaultId!),
    onSuccess: (data) => {
      setSession({ vaultId: vaultId!, apiKey: data.apiKey, operatorAddress: operatorAddress!, vaultName: vaultName ?? undefined, plan: plan ?? undefined });
      toast.success('API key rotated — update your environment variables');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const mcpConfig = `{
  "mcpServers": {
    "mneme-memory": {
      "command": "npx",
      "args": ["-y", "@mneme/mcp"],
      "env": {
        "MNEME_API_URL": "https://mneme-five.vercel.app/api/v1",
        "MNEME_API_KEY": "${apiKey ?? 'mnk_live_your-api-key'}",
        "MNEME_VAULT_ID": "${vaultId ?? 'vlt_your-vault-id'}",
        "MNEME_OPERATOR_PUBLIC_KEY": "${operatorAddress ?? '0x...'}"
      }
    }
  }
}`;

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-display mb-1">Settings</h1>
        <p className="text-body-md text-neutral-500">Vault configuration and MCP integration setup.</p>
      </div>

      <div className="space-y-6">
        {/* Vault info */}
        <Card>
          <CardHeader><CardTitle>Vault</CardTitle></CardHeader>
          <div className="space-y-3">
            <div>
              <p className="text-label-sm text-neutral-500 mb-1">Vault ID</p>
              <div className="flex items-center gap-2">
                <p className="mono text-body-sm flex-1">{vaultId}</p>
                <button onClick={() => copy(vaultId!, 'vaultId')} className="text-neutral-400 hover:text-on-surface">
                  {copied === 'vaultId' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-label-sm text-neutral-500 mb-1">DID</p>
              <p className="mono text-body-sm text-neutral-600">did:monad:testnet:{operatorAddress}</p>
            </div>
            <div>
              <p className="text-label-sm text-neutral-500 mb-1">Operator Address</p>
              <p className="mono text-body-sm">{operatorAddress}</p>
            </div>
            <div>
              <p className="text-label-sm text-neutral-500 mb-1">Plan</p>
              <Badge variant={plan === 'enterprise' ? 'orange' : 'default'}>{plan ?? 'free'}</Badge>
            </div>
          </div>
        </Card>

        {/* API Key */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>API Key</CardTitle>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => rotateMut.mutate()}
                loading={rotateMut.isPending}
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotate key
              </Button>
            </div>
          </CardHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 mono text-body-sm bg-secondary/40 px-3 py-2 rounded-md truncate">
              {showKey ? apiKey : `mneme_${'•'.repeat(32)}`}
            </code>
            <button
              onClick={() => setShowKey(s => !s)}
              className="text-neutral-400 hover:text-on-surface p-1"
              title={showKey ? 'Hide' : 'Show'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copy(apiKey!, 'apiKey')}
              className="text-neutral-400 hover:text-on-surface p-1"
              title="Copy"
            >
              {copied === 'apiKey' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-body-sm text-neutral-400 mt-2">
            Store this securely. Rotating the key will invalidate the current key immediately.
          </p>
        </Card>

        {/* MCP Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <CardTitle>MCP Integration</CardTitle>
              </div>
              <button
                onClick={() => copy(mcpConfig, 'mcp')}
                className="text-neutral-400 hover:text-on-surface flex items-center gap-1.5 text-label-sm"
              >
                {copied === 'mcp' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
          </CardHeader>
          <p className="text-body-md text-neutral-500 mb-3">
            Add this to your Claude, Cursor, or any MCP-compatible agent's configuration:
          </p>
          <pre className="mono text-xs bg-secondary/40 p-4 rounded-lg overflow-auto whitespace-pre-wrap text-on-surface leading-relaxed">
            {mcpConfig}
          </pre>
          <p className="text-body-sm text-neutral-400 mt-3">
            Works with Claude Desktop, Cursor, Windsurf, and any MCP-compatible agent.
            The agent can then use <code className="mono">memory_write</code>, <code className="mono">memory_recall</code>,
            and all other MNEME tools natively.
          </p>
        </Card>

        {/* Danger zone */}
        <Card className="border-error/20">
          <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
          <p className="text-body-md text-neutral-500 mb-4">
            Destroying the vault creates an on-chain tombstone and is irreversible.
            All memories will be permanently deleted.
          </p>
          <Button variant="destructive" onClick={clearSession}>
            Sign out
          </Button>
        </Card>
      </div>
    </div>
  );
}
