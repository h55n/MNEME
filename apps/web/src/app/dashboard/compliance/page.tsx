'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { complianceApi } from '@/lib/api';
import {
  Card, CardHeader, CardTitle, Button, Input, Badge,
  EmptyState, Spinner, MonoHash
} from '@/components/ui';
import { Shield, Download, Trash2, FileText, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function CompliancePage() {
  const { vaultId } = useAuthStore();
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [gdprMemoryIds, setGdprMemoryIds] = useState('');
  const [gdprProof, setGdprProof] = useState<any>(null);
  const [showGdprConfirm, setShowGdprConfirm] = useState(false);

  const auditQ = useQuery({
    queryKey: ['audit', vaultId],
    queryFn: () => complianceApi.auditLog(vaultId!, 1, 50),
    enabled: !!vaultId,
  });

  const reportMut = useMutation({
    mutationFn: (data: any) => complianceApi.generateReport(vaultId!, data),
    onSuccess: (data) => {
      setGeneratedReport(data);
      toast.success('Compliance report generated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const gdprMut = useMutation({
    mutationFn: (data: any) => complianceApi.eraseGdpr(vaultId!, data),
    onSuccess: (data) => {
      setGdprProof(data);
      setShowGdprConfirm(false);
      toast.success('GDPR erasure complete — on-chain proof generated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleGenerateReport = () => {
    reportMut.mutate({
      dateFrom: reportDateFrom || undefined,
      dateTo: reportDateTo || undefined,
      reportType: 'audit',
    });
  };

  const handleGdprErase = () => {
    const ids = gdprMemoryIds.split(',').map(s => s.trim()).filter(Boolean);
    gdprMut.mutate({ memoryIds: ids.length > 0 ? ids : undefined });
  };

  const downloadReport = () => {
    if (!generatedReport) return;
    const blob = new Blob([JSON.stringify(generatedReport.reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mneme-compliance-${generatedReport.reportId}.json`;
    a.click();
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-display mb-1">Compliance</h1>
        <p className="text-body-md text-neutral-500">
          Generate audit reports and manage GDPR obligations with on-chain proof.
        </p>
      </div>

      <div className="space-y-6">
        {/* Audit Report */}
        <Card>
          <CardHeader><CardTitle>Generate Audit Report</CardTitle></CardHeader>
          <p className="text-body-md text-neutral-500 mb-4">
            Export a signed compliance report with on-chain attestation links — suitable for regulatory submissions.
          </p>
          <div className="flex gap-3 mb-4">
            <Input
              label="From date"
              type="date"
              value={reportDateFrom}
              onChange={e => setReportDateFrom(e.target.value)}
            />
            <Input
              label="To date"
              type="date"
              value={reportDateTo}
              onChange={e => setReportDateTo(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleGenerateReport} loading={reportMut.isPending}>
              <FileText className="w-4 h-4" />
              Generate Report
            </Button>
            {generatedReport && (
              <Button variant="secondary" onClick={downloadReport}>
                <Download className="w-4 h-4" />
                Download JSON
              </Button>
            )}
          </div>

          {generatedReport && (
            <div className="mt-4 p-4 bg-secondary/40 rounded-lg space-y-2">
              <p className="text-label-sm text-neutral-500">Report ID</p>
              <p className="mono text-body-sm">{generatedReport.reportId}</p>
              <p className="text-label-sm text-neutral-500 mt-2">Content Hash</p>
              <MonoHash hash={generatedReport.reportHash} truncate={false} />
              <div className="grid grid-cols-3 gap-4 mt-3">
                {Object.entries(generatedReport.reportData?.summary ?? {}).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-label-sm text-neutral-400">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-body-md font-medium">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* GDPR Erasure */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>GDPR Article 17 — Right to Erasure</CardTitle>
              <Badge variant="error">Irreversible</Badge>
            </div>
          </CardHeader>
          <p className="text-body-md text-neutral-500 mb-4">
            Permanently delete memories and generate a cryptographic on-chain proof of deletion.
          </p>
          <Input
            label="Memory IDs to erase (comma-separated, or leave empty to erase all)"
            placeholder="uuid-1, uuid-2, ... or leave blank for full vault erasure"
            value={gdprMemoryIds}
            onChange={e => setGdprMemoryIds(e.target.value)}
            className="mb-4"
          />

          {!showGdprConfirm ? (
            <Button variant="destructive" onClick={() => setShowGdprConfirm(true)}>
              <Trash2 className="w-4 h-4" />
              Initiate Erasure
            </Button>
          ) : (
            <div className="p-4 border border-error/30 rounded-lg bg-error/5 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="text-body-md text-on-surface">
                  This will permanently delete the selected memories and generate an immutable on-chain tombstone record.
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleGdprErase} loading={gdprMut.isPending}>
                  Confirm Erasure
                </Button>
                <Button variant="secondary" onClick={() => setShowGdprConfirm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {gdprProof && (
            <div className="mt-4 p-4 bg-secondary/40 rounded-lg space-y-2">
              <Badge variant="success">Erasure Complete</Badge>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-label-sm text-neutral-400">Deleted count</p>
                  <p className="text-body-md font-medium">{gdprProof.deletedCount ?? gdprProof.erasedCount}</p>
                </div>
                <div>
                  <p className="text-label-sm text-neutral-400">Monad Tx</p>
                  <p className="mono text-body-sm">{gdprProof.monadTxHash?.slice(0, 20)}...</p>
                </div>
              </div>
              <div>
                <p className="text-label-sm text-neutral-400 mb-1">Tombstone Hash</p>
                <MonoHash hash={gdprProof.tombstoneHash} truncate={false} />
              </div>
              <p className="text-body-sm text-neutral-400">
                Timestamp: {new Date(gdprProof.deletionTimestamp).toLocaleString()}
              </p>
            </div>
          )}
        </Card>

        {/* Audit log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>On-chain Audit Log</CardTitle>
              <span className="text-body-sm text-neutral-400">{(auditQ.data?.items ?? auditQ.data ?? []).length} events</span>
            </div>
          </CardHeader>

          {auditQ.isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (auditQ.data?.items ?? auditQ.data ?? []).length === 0 ? (
            <EmptyState
              icon={<Shield className="w-8 h-8" />}
              title="No audit events yet"
              description="Memory operations will appear here once attested on Monad."
            />
          ) : (
            <div className="space-y-2">
              {(auditQ.data?.items ?? auditQ.data ?? []).map((event: any) => (
                <div key={event.id} className="flex items-center justify-between py-2.5 border-b border-secondary last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge variant={event.operation === 'DELETE' ? 'error' : event.operation === 'EXPORT' ? 'orange' : 'default'}>
                      {event.operation}
                    </Badge>
                    <MonoHash hash={event.contentHash} />
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      {event.monadTxHash ? (
                        <div>
                          <Badge variant="success">Confirmed</Badge>
                          <p className="mono text-xs text-neutral-400 mt-0.5">Block {event.monadBlock}</p>
                        </div>
                      ) : (
                        <Badge>Pending</Badge>
                      )}
                    </div>
                    <span className="text-body-sm text-neutral-400 min-w-[140px]">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
