'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { memoryApi } from '@/lib/api';
import {
  Card, CardHeader, CardTitle, Button, Input, Textarea, Badge,
  Select, EmptyState, Spinner, MonoHash
} from '@/components/ui';
import { Brain, Search, Plus, Trash2, Clock, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

const TYPE_OPTIONS = [
  { value: 'episodic', label: 'Episodic — interaction event' },
  { value: 'semantic', label: 'Semantic — fact / knowledge' },
  { value: 'procedural', label: 'Procedural — workflow / preference' },
];

export default function MemoriesPage() {
  const { vaultId, operatorAddress } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'browse' | 'write' | 'recall' | 'inspect' | 'graph'>('browse');
  const [page, setPage] = useState(1);

  // Write form
  const [writeForm, setWriteForm] = useState({ content: '', type: 'episodic', tags: '', importance: '0.5' });

  // Recall form
  const [recallQuery, setRecallQuery] = useState('');
  const [recallResults, setRecallResults] = useState<any[]>([]);

  // Inspect form
  const [inspectTs, setInspectTs] = useState('');
  const [inspectQuery, setInspectQuery] = useState('');
  const [inspectResults, setInspectResults] = useState<any[]>([]);

  const memoriesQ = useQuery({
    queryKey: ['memories', vaultId, page],
    queryFn: () => memoryApi.list(vaultId!, page, 20),
    enabled: !!vaultId,
  });

  const graphQ = useQuery({
    queryKey: ['graph', vaultId],
    queryFn: () => memoryApi.graph(vaultId!),
    enabled: !!vaultId && tab === 'graph',
  });

  const writeMut = useMutation({
    mutationFn: (data: any) => memoryApi.write(vaultId!, data),
    onSuccess: () => {
      toast.success('Memory stored — attested on Monad Testnet');
      setWriteForm({ content: '', type: 'episodic', tags: '', importance: '0.5' });
      qc.invalidateQueries({ queryKey: ['memories', vaultId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (memoryId: string) => memoryApi.delete(vaultId!, memoryId),
    onSuccess: () => {
      toast.success('Memory deleted — on-chain tombstone proof generated');
      qc.invalidateQueries({ queryKey: ['memories', vaultId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleRecall = async () => {
    if (!recallQuery.trim()) return;
    try {
      const r = await memoryApi.recall(vaultId!, { query: recallQuery, limit: 10 });
      setRecallResults(r.memories ?? []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleInspect = async () => {
    if (!inspectTs) return;
    try {
      const r = await memoryApi.inspect(vaultId!, { timestamp: inspectTs, query: inspectQuery || undefined });
      setInspectResults(r.memories ?? []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleWrite = () => {
    const tags = writeForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    writeMut.mutate({
      content: writeForm.content,
      type: writeForm.type,
      tags,
      importance: parseFloat(writeForm.importance),
    });
  };

  const TABS = [
    { id: 'browse', label: 'Browse' },
    { id: 'write', label: 'Write' },
    { id: 'recall', label: 'Recall' },
    { id: 'inspect', label: 'Temporal Inspect' },
    { id: 'graph', label: 'Knowledge Graph' },
  ] as const;

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-display mb-1">Memories</h1>
        <p className="text-body-md text-neutral-500">Manage the agent's sovereign memory vault.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-0 border border-secondary rounded-lg p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 h-8 text-label-md rounded-md transition-colors ${
              tab === t.id ? 'bg-primary text-white' : 'text-neutral-500 hover:text-on-surface'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Browse */}
      {tab === 'browse' && (
        <Card>
          <CardHeader className="flex items-center justify-between mb-4">
            <CardTitle>All Memories</CardTitle>
            <span className="text-body-sm text-neutral-500">{memoriesQ.data?.total ?? 0} total</span>
          </CardHeader>

          {memoriesQ.isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : memoriesQ.data?.items?.length === 0 ? (
            <EmptyState
              icon={<Brain className="w-10 h-10" />}
              title="No memories yet"
              description="Use the Write tab to store your first memory."
              action={<Button size="sm" onClick={() => setTab('write')}>Write memory</Button>}
            />
          ) : (
            <>
              <div className="space-y-3">
                {memoriesQ.data?.items?.map((m: any) => (
                  <div key={m.id} className="border border-secondary rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge>{m.type}</Badge>
                          <Badge variant="default">
                            {(m.importance * 100).toFixed(0)}% importance
                          </Badge>
                          {m.tags?.map((tag: string) => (
                            <Badge key={tag} variant="orange">{tag}</Badge>
                          ))}
                        </div>
                        <p className="text-body-md text-on-surface line-clamp-3">{m.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <MonoHash hash={m.contentHash} />
                          <span className="text-body-sm text-neutral-400">
                            {new Date(m.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMut.mutate(m.id)}
                        disabled={deleteMut.isPending}
                        className="p-1.5 text-neutral-400 hover:text-error transition-colors rounded"
                        title="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-secondary">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>
                  Previous
                </Button>
                <span className="text-body-sm text-neutral-500">Page {page}</span>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p+1)} disabled={!memoriesQ.data?.hasMore}>
                  Next
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Write */}
      {tab === 'write' && (
        <Card>
          <CardHeader><CardTitle>Write Memory</CardTitle></CardHeader>
          <div className="space-y-4">
            <Textarea
              label="Content"
              placeholder="What should this agent remember?"
              rows={5}
              value={writeForm.content}
              onChange={e => setWriteForm(f => ({ ...f, content: e.target.value }))}
            />
            <Select
              label="Memory Type"
              options={TYPE_OPTIONS}
              value={writeForm.type}
              onChange={e => setWriteForm(f => ({ ...f, type: e.target.value }))}
            />
            <Input
              label="Tags (comma-separated)"
              placeholder="finance, client-xyz, q3"
              value={writeForm.tags}
              onChange={e => setWriteForm(f => ({ ...f, tags: e.target.value }))}
            />
            <Input
              label="Importance (0–1)"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={writeForm.importance}
              onChange={e => setWriteForm(f => ({ ...f, importance: e.target.value }))}
            />
            <Button onClick={handleWrite} loading={writeMut.isPending} disabled={!writeForm.content.trim()}>
              Store & Attest
            </Button>
          </div>
        </Card>
      )}

      {/* Recall */}
      {tab === 'recall' && (
        <Card>
          <CardHeader><CardTitle>Semantic Recall</CardTitle></CardHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="What do you want to remember?"
                className="flex-1"
                value={recallQuery}
                onChange={e => setRecallQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRecall()}
              />
              <Button onClick={handleRecall} disabled={!recallQuery.trim()}>
                <Search className="w-4 h-4" />
                Recall
              </Button>
            </div>

            {recallResults.length > 0 && (
              <div className="space-y-3 mt-2">
                <p className="text-label-sm text-neutral-500">{recallResults.length} results</p>
                {recallResults.map((m: any) => (
                  <div key={m.id} className="border border-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge>{m.type}</Badge>
                    </div>
                    <p className="text-body-md">{m.content}</p>
                    <MonoHash hash={m.contentHash} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Temporal Inspect */}
      {tab === 'inspect' && (
        <Card>
          <CardHeader>
            <CardTitle>Temporal Inspect</CardTitle>
          </CardHeader>
          <p className="text-body-md text-neutral-500 mb-4">
            Query what this agent knew at a specific point in time — for audit and compliance.
          </p>
          <div className="space-y-4">
            <Input
              label="Timestamp"
              type="datetime-local"
              value={inspectTs}
              onChange={e => setInspectTs(e.target.value ? new Date(e.target.value).toISOString() : '')}
            />
            <Input
              label="Filter query (optional)"
              placeholder="e.g. client, contract, pricing..."
              value={inspectQuery}
              onChange={e => setInspectQuery(e.target.value)}
            />
            <Button onClick={handleInspect} disabled={!inspectTs}>
              <Clock className="w-4 h-4" />
              Inspect
            </Button>

            {inspectResults.length > 0 && (
              <div className="space-y-3 mt-2">
                <p className="text-label-sm text-neutral-500">
                  {inspectResults.length} memories valid at {new Date(inspectTs).toLocaleString()}
                </p>
                {inspectResults.map((m: any) => (
                  <div key={m.id} className="border border-secondary rounded-lg p-3">
                    <Badge className="mb-2">{m.type}</Badge>
                    <p className="text-body-md">{m.content}</p>
                    <div className="flex gap-3 mt-2 text-body-sm text-neutral-400">
                      <span>Valid from: {new Date(m.validFrom).toLocaleString()}</span>
                      {m.validUntil && <span>Until: {new Date(m.validUntil).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Knowledge Graph */}
      {tab === 'graph' && (
        <Card className="flex flex-col h-[600px] overflow-hidden">
          <CardHeader className="shrink-0 flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Knowledge Graph</CardTitle>
              <p className="text-body-sm text-neutral-500 mt-1">
                Visualizing entity relationships extracted from memories.
              </p>
            </div>
            {graphQ.isFetching && <Spinner />}
          </CardHeader>
          <div className="flex-1 bg-surface relative min-h-0">
            {graphQ.isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner />
              </div>
            ) : graphQ.data ? (
              <div className="absolute inset-0">
                <ForceGraph2D
                  graphData={graphQ.data}
                  width={800}
                  height={500}
                  nodeAutoColorBy="group"
                  nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.label;
                    const fontSize = 12 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.color || '#fff';
                    ctx.fillText(label, node.x, node.y);
                    node.__bckgDimensions = bckgDimensions;
                  }}
                  nodePointerAreaPaint={(node: any, color, ctx) => {
                    ctx.fillStyle = color;
                    const bckgDimensions = node.__bckgDimensions;
                    bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                  }}
                  linkColor={() => 'rgba(255,255,255,0.2)'}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  linkCanvasObjectMode={() => 'after'}
                  linkCanvasObject={(link: any, ctx, globalScale) => {
                    const MAX_FONT_SIZE = 4;
                    const LABEL_NODE_MARGIN = 15;
                    const start = link.source;
                    const end = link.target;
                    
                    if (typeof start !== 'object' || typeof end !== 'object') return;
                    
                    const textPos = {
                      x: start.x + (end.x - start.x) / 2,
                      y: start.y + (end.y - start.y) / 2
                    };
                    
                    const relLink = { x: end.x - start.x, y: end.y - start.y };
                    let textAngle = Math.atan2(relLink.y, relLink.x);
                    if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
                    if (textAngle < -Math.PI / 2) textAngle = -(Math.PI + textAngle);
                    
                    const fontSize = 10 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.save();
                    ctx.translate(textPos.x, textPos.y);
                    ctx.rotate(textAngle);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.fillText(link.label, 0, 0);
                    ctx.restore();
                  }}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
                Failed to load graph data
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
