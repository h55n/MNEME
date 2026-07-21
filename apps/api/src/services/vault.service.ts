import { db, vaults, apiKeys } from '../db/index.js';
import { eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { sha256, buildDID } from '@mneme/shared';
import type { Vault as VaultType } from '@mneme/shared';
import { createLogger } from '../utils/logger.js';
import { getSession, setSession } from '../db/redis.js';

const logger = createLogger('vault-service');

const API_KEY_CACHE_TTL = 60; // seconds

import { createPublicClient, createWalletClient, http, encodeFunctionData, parseAbi, keccak256, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const VAULT_REGISTRY_ABI = parseAbi([
  'function registerVault(bytes32 vaultId, address operator)',
]);

function toBytes32VaultId(vaultId: string): Hex {
  if (/^0x[0-9a-fA-F]{64}$/.test(vaultId)) {
    return vaultId as Hex;
  }
  return keccak256(`0x${Buffer.from(vaultId, 'utf8').toString('hex')}`);
}

async function registerVaultOnChain(vaultId: string, operatorAddress: string) {
  const rpcUrl = process.env.MONAD_RPC_URL;
  const privateKey = process.env.MONAD_PRIVATE_KEY;
  const contractAddress = process.env.VAULT_REGISTRY_ADDRESS;

  if (!rpcUrl || !privateKey || !contractAddress) {
    logger.warn('Monad blockchain config incomplete — Vault will not be registered on-chain');
    return;
  }

  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({ account, transport: http(rpcUrl) });

  const requestArgs = {
    account,
    to: contractAddress as `0x${string}`,
    data: encodeFunctionData({
      abi: VAULT_REGISTRY_ABI,
      functionName: 'registerVault',
      args: [toBytes32VaultId(vaultId), operatorAddress as `0x${string}`]
    })
  } as const;
  
  try {
    const estimatedGas = await publicClient.estimateGas(requestArgs);
    const gasLimit = estimatedGas + (estimatedGas / 10n);
    const txHash = await walletClient.sendTransaction({
      ...requestArgs,
      chain: null,
      gas: gasLimit,
    });
    logger.info({ vaultId, txHash }, 'Vault registered on Monad');
  } catch (err) {
    logger.error({ err }, 'Failed to register vault on-chain');
  }
}

export class VaultService {

  async create(input: {
    operatorAddress: string;
    name?: string;
    network?: string;
    plan?: string;
    serviceEndpoint?: string;
  }): Promise<{ vault: VaultType; apiKey: string }> {

    const vaultId = uuidv4();
    const network = input.network ?? 'mainnet';
    const did = buildDID(network, input.operatorAddress);

    const [vault] = await db.insert(vaults).values({
      id: vaultId,
      did,
      operatorAddress: input.operatorAddress,
      name: input.name,
      plan: input.plan ?? 'free',
      settings: {},
    }).returning();

    // Generate initial API key
    const { plaintext, hash } = this.generateApiKey();
    await db.insert(apiKeys).values({
      id: uuidv4(),
      vaultId: vault.id,
      keyHash: hash,
      name: 'Default key',
    });

    logger.info({ vaultId: vault.id, did: vault.did }, 'Vault created');
    
    // Wire on-chain registration (async, don't block response)
    registerVaultOnChain(vault.id, input.operatorAddress).catch(() => {});

    return {
      vault: this.toVaultType(vault),
      apiKey: plaintext,
    };
  }

  async getById(vaultId: string): Promise<VaultType | null> {
    const [vault] = await db.select().from(vaults).where(eq(vaults.id, vaultId));
    return vault ? this.toVaultType(vault) : null;
  }

  async getByOperator(operatorAddress: string): Promise<VaultType[]> {
    const rows = await db.select().from(vaults)
      .where(eq(vaults.operatorAddress, operatorAddress));
    return rows.map(this.toVaultType);
  }

  async destroy(vaultId: string): Promise<void> {
    await db.update(vaults)
      .set({ destroyedAt: new Date() })
      .where(eq(vaults.id, vaultId));
    logger.info({ vaultId }, 'Vault destroyed');
  }

  /**
   * Validate an API key — cached in Redis for 60s to reduce DB load.
   */
  async validateApiKey(key: string): Promise<{ vaultId: string; operatorAddress: string } | null> {
    const keyHash = sha256(key);
    const cacheKey = `apikey:${keyHash}`;

    // Check Redis cache first
    const cached = await getSession<{ vaultId: string; operatorAddress: string }>(cacheKey);
    if (cached) {
      return cached;
    }

    // DB lookup
    const [apiKey] = await db.select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash));

    if (!apiKey || apiKey.revokedAt) return null;

    // Update last used (non-blocking)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id))
      .catch(() => {/* non-critical */});

    const [vault] = await db.select()
      .from(vaults)
      .where(eq(vaults.id, apiKey.vaultId));

    if (!vault || vault.destroyedAt) return null;

    const result = { vaultId: vault.id, operatorAddress: vault.operatorAddress };

    // Cache result to reduce DB pressure
    await setSession(cacheKey, result, API_KEY_CACHE_TTL);

    return result;
  }

  async rotateApiKey(vaultId: string): Promise<string> {
    // Revoke existing keys
    await db.update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.vaultId, vaultId));

    const { plaintext, hash } = this.generateApiKey();
    await db.insert(apiKeys).values({
      id: uuidv4(),
      vaultId,
      keyHash: hash,
      name: 'Rotated key',
    });

    return plaintext;
  }

  private generateApiKey(): { plaintext: string; hash: string } {
    const plaintext = `mneme_${randomBytes(32).toString('hex')}`;
    const hash = sha256(plaintext);
    return { plaintext, hash };
  }

  private toVaultType(v: any): VaultType {
    return {
      id: v.id,
      did: v.did,
      operatorAddress: v.operatorAddress ?? v.operator_address,
      name: v.name,
      createdAt: v.createdAt?.toISOString() ?? v.created_at?.toISOString(),
      destroyedAt: v.destroyedAt?.toISOString() ?? v.destroyed_at?.toISOString(),
      plan: v.plan,
      settings: v.settings ?? {},
    };
  }
}

export const vaultService = new VaultService();
