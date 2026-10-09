# MNEME v0.1 release notes

Date: 2026-10-10

## What ships

- REST API (Fastify, Postgres + pgvector, local MiniLM embedder, no API keys needed).
- Next.js dashboard and landing page; sign-in, vaults, memory list, market and compliance views.
- MCP server: hosted Streamable HTTP at `/mcp` and a local stdio server. Seven tools: `memory_write`, `memory_recall`, `memory_forget`, `memory_inspect`, `memory_export`, `memory_import`, `memory_list`.
- TypeScript and Python SDKs, Chrome extension, Solidity contracts (deployed to Monad testnet).
- Hosting: API on Render, web on Vercel, container images on GHCR. CI runs build, lint, tests and a production dependency audit.

## Retrieval measurement (retrieval only)

What was measured: session-level retrieval on a 60-question subset of LongMemEval_S (cleaned release), the first 10 non-abstention questions of each of the 6 question types. Each question has about 48 candidate sessions on average. Sessions were split into 2-message chunks, embedded with MNEME's local embedder (all-MiniLM-L6-v2), and each session was scored by its best chunk against the question. Run on 2026-10-10 on CPU.

The per-question result rows are in [`docs/benchmarks/longmemeval-s-60-2026-10-10.json`](benchmarks/longmemeval-s-60-2026-10-10.json). Each row records the question ID, question type, evidence rank, candidate count, and retrieval indicators used to aggregate the table. The benchmark runner and full dataset are not included, so the result file supports auditing the arithmetic but is not a standalone reproduction package.

"any@k" means at least one evidence session is in the top k. "all@k" means every evidence session is in the top k.

| Question type | n | any@5 | any@10 | all@5 | all@10 |
| --- | --- | --- | --- | --- | --- |
| single-session-user | 10 | 10 | 10 | 10 | 10 |
| single-session-assistant | 10 | 10 | 10 | 10 | 10 |
| single-session-preference | 10 | 10 | 10 | 10 | 10 |
| knowledge-update | 10 | 10 | 10 | 8 | 10 |
| temporal-reasoning | 10 | 9 | 10 | 7 | 9 |
| multi-session | 10 | 10 | 10 | 6 | 9 |
| **All** | 60 | 59 | 60 | 51 | 58 |

Limits, read before quoting any number:

- This is retrieval of the right session, not answer accuracy. No answer model was run, so it is not comparable to published LongMemEval QA scores.
- It is a 60-question subset, not the full benchmark, and abstention questions were excluded.
- It uses the embedder directly, not the hosted API, ranking pipeline or write path.
- No comparison with other memory systems was run or is implied.
- LoCoMo and the other benchmarks listed in the project docs have not been run.

## Known gaps

| Area | State | What closing it needs |
| --- | --- | --- |
| Vendor app tests (Cursor, Windsurf, Claude Desktop/connector, ChatGPT) | Protocol-level checks pass against the hosted endpoint with the official MCP client (see `docs/mcp-clients.md`). No vendor app was driven. | Someone with each app installed to run the checklist in `docs/mcp-clients.md`. ChatGPT also needs OAuth support in MNEME, which does not exist yet. |
| Production backups and monitoring | Not verified. A keep-alive ping and a demo liveness workflow exist. | Access to the Aiven database dashboard (backup settings) and the Render dashboard (alerts, logs), or an uptime monitor account. |
| On-chain attestation from the hosted API | Contracts are deployed and have code on Monad testnet. The hosted API reports `local-records-only-not-on-chain` at `/v1/capabilities`. | A funded Monad testnet key and the Render env vars `MONAD_RPC_URL`, `MONAD_PRIVATE_KEY` and `ATTESTATION_AGGREGATOR_ADDRESS`, then one real write checked on the explorer. |
| Paid market settlement | Not validated in any real environment. | Same chain access as above plus a test USDC flow. |
| Graph features (Neo4j, extraction service) | Not deployed. Tag co-occurrence is used instead. | A free Neo4j instance and a host for the extraction service. |
| Major dependency bumps | next 16, zod 4, ioredis 6 and three Docker workflow bumps are open as Dependabot PRs. | A tested upgrade branch; workflow-file changes need a token with workflow scope. |
| Per-user or end-to-end encryption | Not built. The hosted server derives keys (see `docs/TRUST_MODEL.md`). | Design work; tracked in issue #36. |
