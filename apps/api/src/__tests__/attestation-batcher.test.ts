import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  estimateGas: vi.fn(async () => 100n),
  waitForTransactionReceipt: vi.fn(),
  sendTransaction: vi.fn(async () => '0x123'),
  update: vi.fn(), set: vi.fn(), where: vi.fn(async () => undefined),
}));
vi.mock('viem', async (importOriginal) => ({
  ...await importOriginal<typeof import('viem')>(),
  createPublicClient: () => ({ estimateGas: mocks.estimateGas, waitForTransactionReceipt: mocks.waitForTransactionReceipt }),
  createWalletClient: () => ({ sendTransaction: mocks.sendTransaction }),
}));
vi.mock('../db/index.js', () => ({ db: { update: mocks.update }, attestations: { id: 'id' } }));
import { AttestationBatcher, attestationBatcher } from '../blockchain/attestation-batcher.js';
attestationBatcher.destroy();
const item = { id: 'one', vaultId: '00000000-0000-4000-8000-000000000001', operation: 'WRITE', contentHash: 'a'.repeat(64), vaultStateHash: 'b'.repeat(64), createdAt: new Date('2026-10-07T12:00:00Z') };
const batchers: AttestationBatcher[] = [];
function configured() {
  vi.stubEnv('MONAD_RPC_URL', 'http://localhost:8545');
  vi.stubEnv('MONAD_PRIVATE_KEY', `0x${'1'.repeat(64)}`);
  vi.stubEnv('ATTESTATION_AGGREGATOR_ADDRESS', `0x${'2'.repeat(40)}`);
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.set.mockReturnValue({ where: mocks.where });
  const batcher = new AttestationBatcher(); batcher.destroy(); batchers.push(batcher); return batcher;
}
afterEach(() => { for (const b of batchers) b.destroy(); batchers.length = 0; vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('attestation receipt confirmation', () => {
  it('never confirms a reverted transaction and retries the queued record', async () => {
    const batcher = configured();
    mocks.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'reverted', blockNumber: 10n });
    await batcher.add(item); await batcher.flush();
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success', blockNumber: 11n });
    await batcher.flush();
    expect(mocks.sendTransaction).toHaveBeenCalledTimes(2);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ monadTxHash: '0x123', monadBlock: 11, confirmedAt: expect.any(Date) }));
    await batcher.flush(); expect(mocks.sendTransaction).toHaveBeenCalledTimes(2);
  });
  it('keeps a record pending when receipt lookup fails', async () => {
    const batcher = configured(); mocks.waitForTransactionReceipt.mockRejectedValueOnce(new Error('RPC unavailable'));
    await batcher.add(item); await batcher.flush(); expect(mocks.update).not.toHaveBeenCalled();
    mocks.waitForTransactionReceipt.mockResolvedValueOnce({ status: 'success', blockNumber: 12n });
    await batcher.flush(); expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});
