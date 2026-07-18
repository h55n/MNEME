'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { memoryApi, complianceApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, Badge, Spinner, MonoHash } from '@/components/ui';
import { Database, Brain, Shield, Zap, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { vaultId, vaultName, operatorAddress, plan } = useAuthStore();

  const memoriesQ = useQuery({
    queryKey: ['memories', vaultId],
    queryFn: () => memoryApi.list(vaultId!, 1, 1),
    enabled: !!vaultId,
  });

  const auditQ = useQuery({
    queryKey: ['audit', vaultId],
    queryFn: () => complianceApi.auditLog(vaultId!, 1, 5),
    enabled: !!vaultId,
  });

  if (!vaultId) {
    return (
      <div className="p-8">
        <p className="text-body-md text-neutral-500">No vault selected. <Link href="/" className="underline">Connect a vault</Link>.</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Memories',
      value: memoriesQ.data?.total ?? '—',
      icon: Brain,
      href: '/dashboard/memories' as any,
    },
    {
      label: 'On-chain Attestations',
      value: (auditQ.data?.items ?? auditQ.data ?? []).filter((a: any) => a.monadTxHash).length || auditQ.data?.total || '—',
      icon: Shield,
      href: '/dashboard/compliance' as any,
    },
    {
      label: 'Plan',
      value: plan ?? 'free',
      icon: Zap,
      href: '/dashboard/settings' as any,
    },
  ];

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-display">{vaultName ?? 'My Vault'}</h1>
          <Badge variant="orange">Active</Badge>
        </div>
        <p className="text-body-md text-neutral-500">
          Sovereign memory vault · <MonoHash hash={operatorAddress ?? ''} />
        </p>
        <p className="mono text-xs text-neutral-400 mt-1">{vaultId}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-label-sm text-neutral-500 mb-1">{label}</p>
                  <p className="text-headline-lg">
                    {memoriesQ.isLoading || auditQ.isLoading
                      ? <Spinner size="sm" />
                      : value}
                  </p>
                </div>
                <Icon className="w-5 h-5 text-neutral-300 mt-0.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent attestations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attestations</CardTitle>
        </CardHeader>
        {auditQ.isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (auditQ.data?.items ?? auditQ.data ?? []).length === 0 ? (
          <p className="text-body-md text-neutral-500 py-4">No attestations yet. Write some memories to start.</p>
        ) : (
          <div className="space-y-2">
            {(auditQ.data?.items ?? auditQ.data ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-secondary last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={a.operation === 'DELETE' ? 'error' : a.operation === 'EXPORT' ? 'orange' : 'default'}>
                    {a.operation}
                  </Badge>
                  <MonoHash hash={a.contentHash} />
                </div>
                <div className="flex items-center gap-3 text-right">
                  {a.monadTxHash ? (
                    <Badge variant="success">On-chain</Badge>
                  ) : (
                    <Badge>Pending</Badge>
                  )}
                  <span className="text-body-sm text-neutral-400">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card className="hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <Link href="/dashboard/memories" className="block">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-neutral-200" />
              <div>
                <p className="text-headline-sm">Browse Memories</p>
                <p className="text-body-sm text-neutral-500">Search and manage stored memories</p>
              </div>
            </div>
          </Link>
        </Card>
        <Card className="hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
          <Link href="/dashboard/compliance" className="block">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-neutral-200" />
              <div>
                <p className="text-headline-sm">Compliance</p>
                <p className="text-body-sm text-neutral-500">View cryptographic attestations and audits</p>
              </div>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
