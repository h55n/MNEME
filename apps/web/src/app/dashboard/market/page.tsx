'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { marketApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, EmptyState, Input } from '@/components/ui';
import { ShoppingCart, Download, Package, PlusCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketPage() {
  const { vaultId, operatorAddress } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPack, setNewPack] = useState({
    title: '',
    domainTag: '',
    description: '',
    priceUsdc: '10.00',
    dateRangeFrom: new Date(Date.now() - 86400000 * 30).toISOString(),
    dateRangeTo: new Date().toISOString(),
  });

  const { data: packData, isLoading: loadingPacks } = useQuery({
    queryKey: ['market', 'packs'],
    queryFn: () => marketApi.listPacks(),
  });

  const { data: myPurchasedData } = useQuery({
    queryKey: ['market', 'myPacks'],
    queryFn: () => marketApi.getPurchasedPacks(),
    enabled: !!vaultId,
  });

  const packs = Array.isArray(packData) ? packData : (packData?.items || []);
  const myPurchasedPacks = Array.isArray(myPurchasedData) ? myPurchasedData : (myPurchasedData?.items || []);

  // A purchase is paid on-chain from the buyer's wallet. The buyer pastes the
  // transaction hash of that payment; nothing is made up on their behalf.
  const [buying, setBuying] = useState<{ id: string; title: string } | null>(null);
  const [txHash, setTxHash] = useState('');
  const txHashValid = /^0x[0-9a-fA-F]{64}$/.test(txHash.trim());
  const buyerAddress = /^0x[0-9a-fA-F]{40}$/.test(operatorAddress ?? '') ? operatorAddress! : null;

  const purchaseMut = useMutation({
    mutationFn: (packId: string) =>
      marketApi.purchasePack(packId, { monadTxHash: txHash.trim(), buyerAddress: buyerAddress! }),
    onSuccess: () => {
      toast.success('Pack purchased');
      setBuying(null);
      setTxHash('');
      queryClient.invalidateQueries({ queryKey: ['market', 'myPacks'] });
    },
    onError: (err: any) => toast.error(err.message || 'Purchase failed'),
  });

  const createPackMut = useMutation({
    mutationFn: () => marketApi.createPack(newPack),
    onSuccess: (res: any) => {
      if (res.piiDetected) {
        toast.warning('Pack created but PII detected — pending manual review');
      } else {
        toast.success('Pack listed successfully on market!');
      }
      setShowCreateModal(false);
      queryClient.invalidateQueries({ queryKey: ['market', 'packs'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create pack'),
  });

  const ingestMut = useMutation({
    mutationFn: (packId: string) => marketApi.ingestPack(vaultId!, packId),
    onSuccess: () => {
      toast.success('Pack ingested successfully into vault!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to ingest pack'),
  });

  const purchasedPackIds = new Set(myPurchasedPacks.map((p: any) => p.id));

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-10">
        <div>
          <h1 className="text-display mb-2 flex items-center gap-3">
            <div className="p-2 bg-tertiary/10 text-tertiary rounded-xl border border-tertiary/20">
              <ShoppingCart className="w-6 h-6" />
            </div>
            Memory Market
          </h1>
          <p className="text-body-lg text-neutral-400">
            Acquire specialized domain knowledge and pre-trained behavioral packs for your agent.
          </p>
        </div>
        <Button className="whitespace-nowrap shrink-0" onClick={() => setShowCreateModal(true)} disabled={!vaultId}>
          <PlusCircle className="w-4 h-4 mr-2" />
          List New Pack
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loadingPacks && <p className="text-neutral-500 col-span-2">Loading packs...</p>}
        {packs.map((pack: any) => {
          const isPurchased = purchasedPackIds.has(pack.id);
          const title = pack.title || pack.name || 'Untitled Pack';
          const seller = pack.sellerAddress || pack.creator_address || '0x000...000';
          const price = pack.priceUsdc || pack.price_usdc || '0';
          const memoryCount = pack.interactionCount || pack.memory_count || 0;

          return (
            <Card key={pack.id} className="flex flex-col group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative z-10">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-lg mb-1">{title}</CardTitle>
                    <p className="font-mono text-[11px] text-neutral-500 tracking-tight">by {seller.slice(0, 6)}...{seller.slice(-4)}</p>
                  </div>
                  <Badge variant={isPurchased ? 'success' : 'orange'} className="shrink-0">
                    {isPurchased ? 'Owned' : `${price} USDC`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col relative z-10">
                <p className="text-body-sm text-neutral-400 mb-6 flex-1 leading-relaxed">
                  {pack.description}
                </p>
                <div className="flex items-center gap-4 text-xs font-medium text-neutral-500 mb-6">
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-surface rounded-md border border-border">
                    <Package className="w-3.5 h-3.5" /> 
                    {memoryCount} memories
                  </span>
                  {pack.domainTag && (
                    <span className="px-2 py-1 bg-surface rounded-md border border-border font-mono text-[11px]">
                      #{pack.domainTag}
                    </span>
                  )}
                </div>
                
                {isPurchased ? (
                  <Button
                    variant="primary"
                    className="w-full bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => ingestMut.mutate(pack.id)}
                    loading={ingestMut.isPending}
                    disabled={!vaultId}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Ingest to Vault
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-tertiary group-hover:text-tertiary-foreground group-hover:border-tertiary transition-colors"
                    onClick={() => setBuying({ id: pack.id, title })}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Purchase Pack
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
        {packs.length === 0 && !loadingPacks && (
          <div className="col-span-2">
             <EmptyState 
                icon={<Package className="w-12 h-12" />} 
                title="No packs available" 
                description="There are currently no knowledge packs available in the marketplace." 
              />
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {buying && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Purchase ${buying.title}`}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => { setBuying(null); setTxHash(''); }} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-2">Purchase {buying.title}</h2>
            <p className="text-body-sm text-neutral-400 mb-4">
              Pay for the pack from your wallet on Monad, then paste the transaction hash here. The server checks the payment on-chain before it unlocks the pack.
            </p>
            {!buyerAddress && (
              <p role="alert" className="text-body-sm text-error mb-4">
                This vault is not tied to a wallet address, so it can't buy packs. Sign in with a vault whose operator is a 0x wallet address.
              </p>
            )}
            <Input
              label="Payment transaction hash"
              placeholder="0x..."
              value={txHash}
              error={txHash && !txHashValid ? 'A transaction hash is 0x followed by 64 hex characters.' : undefined}
              onChange={(e) => setTxHash(e.target.value)}
            />
            <Button
              className="w-full mt-4"
              disabled={!txHashValid || !buyerAddress}
              loading={purchaseMut.isPending}
              onClick={() => purchaseMut.mutate(buying.id)}
            >
              Confirm purchase
            </Button>
          </div>
        </div>
      )}

      {/* Create Pack Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">List New Knowledge Pack</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Title</label>
                <Input
                  value={newPack.title}
                  onChange={(e) => setNewPack({ ...newPack, title: e.target.value })}
                  placeholder="e.g. DeFi HFT Strategy Dataset"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Domain Tag</label>
                <Input
                  value={newPack.domainTag}
                  onChange={(e) => setNewPack({ ...newPack, domainTag: e.target.value })}
                  placeholder="e.g. defi-trading"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Description</label>
                <Input
                  value={newPack.description}
                  onChange={(e) => setNewPack({ ...newPack, description: e.target.value })}
                  placeholder="Short summary of knowledge contents"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-400 block mb-1">Price (USDC)</label>
                <Input
                  value={newPack.priceUsdc}
                  onChange={(e) => setNewPack({ ...newPack, priceUsdc: e.target.value })}
                  placeholder="50.00"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => createPackMut.mutate()}
                  loading={createPackMut.isPending}
                  disabled={!newPack.title || !newPack.domainTag}
                >
                  Publish Listing
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
