#!/usr/bin/env node
import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMnemeServer } from './server.js';

async function main() {
  const apiKey = process.env.MNEME_API_KEY ?? '';
  const vaultId = process.env.MNEME_VAULT_ID ?? '';
  if (!apiKey) {
    console.error('MNEME_API_KEY is required. Set it in your environment.');
    process.exit(1);
  }
  if (!vaultId) {
    console.error('MNEME_VAULT_ID is required. Set it in your environment.');
    process.exit(1);
  }

  const server = createMnemeServer({
    apiBase: process.env.MNEME_API_URL ?? 'http://localhost:3001/v1',
    apiKey,
    vaultId,
    operatorPublicKey: process.env.MNEME_OPERATOR_PUBLIC_KEY ?? '',
  });
  await server.connect(new StdioServerTransport());
  console.error('MNEME MCP Server running — vault:', vaultId);
}

main().catch(err => {
  console.error('Fatal MCP server error:', err);
  process.exit(1);
});
