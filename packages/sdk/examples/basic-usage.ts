/**
 * MNEME SDK — Usage Examples
 *
 * Run: ts-node examples/basic-usage.ts
 */

import { createMnemeClient } from '@mneme/sdk';

const mneme = createMnemeClient({
  apiKey: process.env.MNEME_API_KEY!,
  vaultId: process.env.MNEME_VAULT_ID!,
  operatorPublicKey: process.env.MNEME_OPERATOR_PUBLIC_KEY,
  baseUrl: process.env.MNEME_API_URL ?? 'http://localhost:3001/v1',
});

async function main() {
  console.log('=== MNEME SDK Demo ===\n');

  // ── 1. Write memories ────────────────────────────────────────────────────
  console.log('[1] Writing memories...');

  const episodic = await mneme.memories.write({
    content: 'Met with Acme Corp today. They want a 6-month contract renewal at $120k.',
    type: 'episodic',
    tags: ['acme', 'sales', 'contract'],
    importance: 0.9,
  });
  console.log('  ✓ Episodic memory written:', episodic.contentHash.slice(0, 16) + '...');

  const semantic = await mneme.memories.write({
    content: 'Acme Corp is in the fintech sector, 200 employees, prefers async communication.',
    type: 'semantic',
    tags: ['acme', 'company-profile'],
    importance: 0.8,
  });
  console.log('  ✓ Semantic memory written:', semantic.contentHash.slice(0, 16) + '...');

  const procedural = await mneme.memories.write({
    content: 'For enterprise deals: always cc legal@company.com and send proposals on Tuesdays.',
    type: 'procedural',
    tags: ['enterprise', 'workflow'],
    importance: 0.7,
  });
  console.log('  ✓ Procedural memory written:', procedural.contentHash.slice(0, 16) + '...');

  // ── 2. Recall ────────────────────────────────────────────────────────────
  console.log('\n[2] Recalling memories about Acme...');
  const recalled = await mneme.memories.recall({
    query: 'Acme Corp contract',
    limit: 5,
  });
  console.log(`  ✓ Found ${recalled.totalFound} relevant memories`);
  recalled.memories.forEach(m => {
    console.log(`    - [${m.type}] ${m.content.slice(0, 60)}...`);
  });

  // ── 3. Temporal inspect ──────────────────────────────────────────────────
  console.log('\n[3] Temporal inspect — what did the agent know 1 minute ago?');
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const snapshot = await mneme.memories.inspect({ timestamp: oneMinuteAgo });
  console.log(`  ✓ ${snapshot.totalFound} memories valid at that timestamp`);

  // ── 4. List all memories ─────────────────────────────────────────────────
  console.log('\n[4] Listing all memories...');
  const list = await mneme.memories.list(1, 10);
  console.log(`  ✓ ${list.total} total memories, showing ${list.items.length}`);

  // ── 5. Compliance report ─────────────────────────────────────────────────
  console.log('\n[5] Generating compliance report...');
  const report = await mneme.compliance.generateReport({ reportType: 'audit' });
  console.log('  ✓ Report ID:', report.reportId);
  console.log('  ✓ Report hash:', report.reportHash.slice(0, 32) + '...');

  // ── 6. Export vault ──────────────────────────────────────────────────────
  console.log('\n[6] Exporting vault...');
  const exported = await mneme.vault.export();
  console.log(`  ✓ Exported ${exported.memories.length} memories`);
  console.log('  ✓ Vault state hash:', exported.vaultStateHash.slice(0, 32) + '...');

  // ── 7. Attestations ──────────────────────────────────────────────────────
  console.log('\n[7] Checking on-chain attestations...');
  const attestations = await mneme.attestations.list();
  const confirmed = attestations.filter(a => a.monadTxHash);
  console.log(`  ✓ ${attestations.length} attestations total, ${confirmed.length} confirmed on Monad`);

  console.log('\n=== Demo complete ===');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
