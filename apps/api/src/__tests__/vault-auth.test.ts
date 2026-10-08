import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), setSession: vi.fn(), select: vi.fn() }));
vi.mock('../db/redis.js', () => ({ getSession: mocks.getSession, setSession: mocks.setSession }));
vi.mock('../db/index.js', () => ({ db: { select: mocks.select }, vaults: { id: 'id' }, apiKeys: { keyHash: 'hash' } }));
import { VaultService } from '../services/vault.service.js';
function databaseRows(rows: unknown[][]) {
  mocks.select.mockImplementation(() => ({ from: () => ({ where: async () => rows.shift() ?? [] }) }));
}
describe('revocation is authoritative over cached authentication', () => {
  it('rejects a revoked key even when Redis holds an old valid session', async () => {
    mocks.getSession.mockResolvedValue({ vaultId: 'vault-one', operatorAddress: 'owner' });
    databaseRows([[{ id: 'key', vaultId: 'vault-one', revokedAt: new Date() }]]);
    expect(await new VaultService().validateApiKey('revoked-key')).toBeNull();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
  it('rejects a missing key instead of accepting a stale session', async () => {
    mocks.getSession.mockResolvedValue({ vaultId: 'vault-one', operatorAddress: 'owner' });
    databaseRows([[]]);
    expect(await new VaultService().validateApiKey('deleted-key')).toBeNull();
  });
});
