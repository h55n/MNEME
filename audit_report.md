# MNEME Codebase Audit Report

## Executive Summary
This document is the result of a deep, adversarial audit of the MNEME project. The goal was to verify the implementation against the provided PRD and specifications. While the core infrastructure (Turborepo, Monad Testnet integrations, PostgreSQL/pgvector, Redis) is functional, there are several glaring inconsistencies, stubbed features, and deviations from the official specification.

---

## 1. Repo Health & Infrastructure
**Status:** ✅ Working (Mostly)

- **Monorepo Structure:** Turborepo is correctly configured. Workspace roots `apps/api`, `apps/extraction`, `apps/mcp`, `apps/web`, `packages/sdk`, `packages/shared`, `contracts` are successfully linked.
- **Environment Management:** `.env.example` correctly tracks the required variables. However, variables like `MNEME_API_URL`, `MNEME_API_KEY`, `MNEME_VAULT_ID`, and `MNEME_OPERATOR_PUBLIC_KEY` used in `apps/mcp/src/index.ts` are missing from the example.
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) is correctly configured to run builds, linting, and Hardhat tests.
- **Docker:** `docker-compose.yml` properly spins up PostgreSQL 16 (with pgvector), Redis 7, and Neo4j 5. 

---

## 2. Smart Contracts (Monad L1)
**Status:** ⚠️ Deviates from Spec

The contracts compile and tests pass (12/12 passing). Deployment configurations point correctly to Monad Testnet (Chain ID 10143). However, the API surface drastically deviates from the PRD:

- **AttestationAggregator.sol:** 
  - **GAP:** PRD specifies `submitBatch()`. Code implements `batchAttest()`. 
  - **GAP:** PRD specifies `verifyAttestation()`. Code implements `verify()`.
  - **GAP:** Missing expected events like `BatchSubmitted` and `AttestationVerified`. Only emits `BatchAttested`.
- **DeletionProver.sol:** 
  - **GAP:** PRD specifies `proveDeletion(tombstoneHash, ...)`. The implementation does NOT take `tombstoneHash` as a parameter; it computes it internally from `deletedContentHashes`, `gdprBasis`, `userIdentifier`, and `operatorSig`.
  - **GAP:** Missing `verifyDeletion()` returning a boolean. Code only provides `isDeleted()`, `getDeletion()`, and `getVaultDeletions()`.
- **VaultRegistry & MemoryMarket:** Implemented correctly. Uses OpenZeppelin v5 (Ownable, ReentrancyGuard, ECDSA).

---

## 3. API (apps/api)
**Status:** ❌ Critical Deviations

- **Web3 Stack (CRITICAL GAP):** The PRD explicitly mandates the use of **viem**. However, `apps/api/src/blockchain/attestation-batcher.ts` uses **ethers** (`import { ethers } from 'ethers'`). This is a blatant disregard of the stack requirements.
- **Compliance & ZK Proofs (CRITICAL GAP):** The PRD mandates "ZK-Proof Generation for Compliance Reports". `apps/api/src/services/compliance.service.ts` generates JSON reports and hashes them using standard SHA-256. There is **zero evidence** of any Zero-Knowledge (ZK) proof generation anywhere in the codebase.
- **Market Service:** PII Scanning is implemented using regex patterns locally on decrypted content. USDC payment settlement logic is present. Ingest functionality correctly re-tags and imports encrypted blobs.

---

## 4. Extraction Service (apps/extraction)
**Status:** ❌ Complete Architecture Mismatch

- **NLP Pipeline (CRITICAL GAP):** The PRD explicitly specifies a **SpaCy NER pipeline** for entity extraction and Neo4j integration. `apps/extraction/main.py` completely ignores this and instead makes an Anthropic LLM API call (`claude-3-haiku`) to perform the extraction. SpaCy is entirely missing from the implementation. 

---

## 5. Web Dashboard (apps/web)
**Status:** ⚠️ Stubbed Features

- **Knowledge Graph (GAP):** The PRD specifies a "Knowledge Graph Visualisation" on the Memories page. `apps/web/src/app/dashboard/memories/page.tsx` only contains standard tabs (`Browse`, `Write`, `Recall`, `Temporal Inspect`). The knowledge graph visualization is completely missing/stubbed.
- **Demo Mode:** ✅ Working correctly. `apps/web/src/lib/api.ts` correctly intercepts requests when no backend is reachable (`process.env.NEXT_PUBLIC_API_URL` is empty) and returns realistic mock fixtures.
- **Zustand Auth Store:** ✅ Working. `apps/web/src/store/index.ts` securely persists `vaultId`, `apiKey`, and `operatorAddress` to `localStorage` under `mneme-session` without exposing private keys.

---

## 6. MCP Server & SDK
**Status:** ✅ Working

- **SDK (`@mneme/sdk`):** `MnemeClient` correctly exposes endpoints for Vaults, Memories, Attestations, Market, and Compliance via a clean TypeScript class interface. 
- **MCP Server (`apps/mcp`):** Handles Memory-related tools like `recall`, `inspect`, `write`, and `list` properly.

---

## Summary of Matrix (Working vs. Stubbed)

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Monorepo Setup** | Working | Turbo, Docker, and CI fully configured. |
| **Smart Contracts** | Working but Deviant | Code runs, but methods/signatures don't match the PRD. |
| **API Web3 Integration** | Deviant | Uses `ethers` instead of the specified `viem`. |
| **ZK Compliance Proofs** | Stubbed/Missing | Just uses SHA-256 hashing. ZK is completely absent. |
| **Extraction Service** | Deviant | Uses Claude 3 Haiku instead of the required SpaCy pipeline. |
| **Knowledge Graph UI** | Missing | No UI components exist for graph visualization in the dashboard. |
| **Web Demo Mode** | Working | `api.ts` effectively falls back to fixtures. |

## Open Issues (TODO/FIXME)
A systematic sweep for `TODO` and `FIXME` comments revealed the following deferred technical debt:
1. `apps/api/src/services/recall.ts:290`: `// TODO: If Neo4j/Redis were fully populated with the equivalent RawMemoryRow schemas, ` (Indicates incomplete cache/graph hydration).
2. `apps/api/src/routes/market.ts:180`: `// TODO: Phase 5B — migrate to plaintext-scan + re-encrypt with buyer's key.` (Indicates incomplete market integration for cryptographic key rotation on pack ingestion).

## Conclusion
The MNEME project has a strong structural foundation and functional core paths, but it suffers from severe specification drift. The engineering team has cut significant corners (swapping SpaCy for an LLM call, ignoring ZK proofs, falling back to `ethers` instead of `viem`, and abandoning the Knowledge Graph UI). These gaps must be rectified to align the repository with the PRD.
