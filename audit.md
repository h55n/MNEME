# MNEME — Full Repository Audit (Updated)

**Date:** 2026-07-21 (second pass)  
**Scope:** `D:\ANTIGRAVITY\mneme` — read-only source audit, no code changes  
**Verified:** Hardhat contract tests re-run locally — **12/12 passing**  
**Supersedes:** Previous `audit.md` content and corrects optimistic claims in `audit_report.md`

---

## Executive Summary

MNEME is a **functional hackathon-to-MVP** monorepo for sovereign AI agent memory with Monad Testnet integration. Since the first audit earlier today, several deployment blockers were **fixed** (PORT binding, `render.yaml` env vars, market UI scaffold, on-chain vault/pack registration). The project is **closer to deployable** but still **not end-to-end production-ready** due to broken market API wiring in the web client, Docker Compose env gaps, missing extraction hosting, and Render free-tier operational limits.

| Area | Verdict | Change since last audit |
|------|---------|-------------------------|
| Smart contracts | ✅ 12/12 tests pass | — |
| API — core (memories, vaults, compliance) | ✅ Substantial | VaultRegistry on-chain wired |
| API — market backend | ⚠️ Partial | `listPackOnChain` added |
| Web — memories, compliance | ✅ Working | — |
| Web — market UI | ⚠️ **Broken wiring** | Page added but API paths wrong |
| MCP server | ✅ Improved | `memory_list` added; import bug fixed |
| Render deployment | ⚠️ **Deployable with caveats** | PORT + CORS fixed in config |
| Vercel frontend | ⚠️ Needs `NEXT_PUBLIC_API_URL` | MCP snippet improved |
| Extraction service | ✅ Built, ❌ Not hosted | — |
| Indexer | ⚠️ Scaffold only | — |

**Bottom line:** Core product works locally with correct `.env`. Production requires external Postgres (Neon), a deployed API, Vercel env config, and **market UI fixes** before the Memory Market feature is usable.

---

## 1. Project Overview

### What MNEME Is

Portable, monetisable, cryptographically verifiable AI agent memory:

- PostgreSQL + pgvector for semantic recall
- Optional Neo4j knowledge graph
- Redis for caching / write queues
- Monad Testnet attestations and GDPR tombstones
- Memory marketplace (backend + UI scaffold)
- MCP server for Claude Desktop / Cursor

### Monorepo Layout

```
mneme/
├── apps/
│   ├── api/           Fastify REST API (Node 22)
│   ├── web/           Next.js 14 dashboard
│   ├── extraction/    Python FastAPI (NVIDIA NIM + CrossEncoder)
│   └── mcp/           Model Context Protocol stdio server
├── packages/
│   ├── shared/        Types, constants, crypto
│   ├── sdk/           @mneme/sdk TypeScript client
│   └── python-sdk/    Python client + LangGraph/CrewAI plugins (not in npm workspaces)
├── contracts/         Hardhat + Solidity 0.8.24
├── indexer/           Envio HyperIndex (standalone, attestations only)
├── deploy/helm/       Kubernetes Helm charts (no CD wired)
├── scripts/           migrate, backup, vault key migration
├── docker-compose.yml / docker-compose.prod.yml
├── render.yaml        Render Blueprint (API + Redis)
└── vercel.json        Vercel frontend config
```

### Live URLs

| Resource | URL | Status |
|----------|-----|--------|
| Frontend | https://mneme-five.vercel.app | Deployed on Vercel |
| Backend API | Render (planned) | Config improved; needs Neon `DATABASE_URL` + deploy |
| Contracts | Monad Testnet (10143) | ✅ Deployed 2026-07-04 |

### Deployed Contracts (Monad Testnet)

| Contract | Address |
|----------|---------|
| VaultRegistry | `0x19b31A7F2759Dac9FFe8Bf9C9D7e2C5446068b73` |
| AttestationAggregator | `0x9c36aC707F29f0EfBb147710A288e3c9e4069A93` |
| MemoryMarket | `0x0EE8903784a4f4974003548e0682d484849c7E27` |
| DeletionProver | `0xF66260602E13e05EAcc56c238cD26587A3Cad9ea` |
| Mock USDC | `0x6bbc2600813b109f78D61B2A78DCaFB1D6C1063E` |

---

## 2. What Exists and Works

### 2.1 API (`apps/api`) — ✅ Core Functional

**Entry:** `src/index.ts` — CORS, helmet, rate limiting, Swagger `/v1/docs`, `/health`, graceful shutdown.

**PORT binding (FIXED):**
```typescript
const PORT = parseInt(process.env.PORT ?? process.env.API_PORT ?? '3001');
```

**Routes implemented:**

| Domain | Key endpoints |
|--------|---------------|
| Vaults | `POST /vaults`, `GET/DELETE /vaults/:id`, export, snapshot, key rotate |
| Memories | write, list, recall, inspect, delete, batch, consolidate, graph |
| Market | browse, create, purchase, ingest, sample, scan |
| Compliance | report, GDPR erase, audit log |
| Attestations | list, get by tx, verify |
| GPT | openapi.yaml, write, recall |

**Blockchain (viem) — improved since last audit:**
- `attestation-batcher.ts` → `batchAttest()` on Monad
- `compliance.service.ts` → `proveDeletion()` for GDPR
- `vault.service.ts` → `registerVaultOnChain()` fire-and-forget on vault create
- `market.service.ts` → `listPackOnChain()` fire-and-forget on pack create
- `market.ts` route → tx receipt verification for purchases (when RPC configured)

**Resilience:** Redis, Neo4j, Monad RPC, embeddings, extraction all degrade gracefully.

**Docker:** Multi-stage Dockerfile, migration entrypoint, healthcheck on `/health`.

### 2.2 Extraction Service (`apps/extraction`) — ✅ Built, Not Deployed

- FastAPI on port **8001** (README incorrectly says 8000)
- `POST /extract` — NVIDIA NIM LLaMA 3.1 8B (not SpaCy)
- `POST /rerank` — `sentence-transformers` CrossEncoder
- Heavy Docker image — impractical on Render free tier
- Not in `render.yaml`

### 2.3 Web Dashboard (`apps/web`) — ⚠️ Mostly Working

| Page | Status |
|------|--------|
| `/` landing | ✅ |
| `/login` | ✅ |
| `/dashboard` | ✅ |
| `/dashboard/memories` | ✅ Write, recall, inspect, force-graph |
| `/dashboard/compliance` | ✅ Audit log, GDPR, reports |
| `/dashboard/settings` | ✅ Vault info, MCP snippet (uses `NEXT_PUBLIC_API_URL`) |
| `/dashboard/market` | ⚠️ **UI exists but API calls are broken** (see Section 3) |

- Demo mode: development only when `NEXT_PUBLIC_API_URL` unset
- Production: demo disabled (correct); requires live API
- `next.config.mjs`: `ignoreBuildErrors: true` — TS errors won't block builds

### 2.4 MCP Server (`apps/mcp`) — ✅ Improved

| Tool | Status |
|------|--------|
| `memory_write` | ✅ |
| `memory_recall` | ✅ |
| `memory_forget` | ✅ (README calls it `memory_delete`) |
| `memory_inspect` | ✅ |
| `memory_export` | ✅ |
| `memory_import` | ✅ Bug fixed (`r.imported` not `r.data.imported`) |
| `memory_list` | ✅ Added |

- Package still `private: true` — `npx @mneme/mcp` won't work from npm registry
- Tests: placeholder only

### 2.5 SDK & Shared

| Package | Status |
|---------|--------|
| `@mneme/shared` | ✅ Types, crypto, constants |
| `@mneme/sdk` | ✅ Full client surface; README says `apiUrl` but code uses `baseUrl` |
| `packages/python-sdk` | ✅ Exists; undocumented in README; not in workspaces |

### 2.6 Smart Contracts — ✅ Verified

**Test run (2026-07-21):** 12/12 passing in ~10s

| Suite | Coverage |
|-------|----------|
| VaultRegistry | register, duplicate DID, invalid DID |
| AttestationAggregator | batch, verify, empty batch, unauthorized submitter |
| MemoryMarket | list, purchase, double-buy, withdraw revenue |
| DeletionProver | GDPR deletion proof |

**Gaps:** timelock treasury, `delistPack`, `destroyVault`, negative paths. `scripts/verify.ts` referenced in README but does not exist.

### 2.7 Indexer — ⚠️ Scaffold Only

- Envio HyperIndex for `AttestationAggregator` events only
- Not in workspaces, CI, or frontend
- `start_block: 0` — expensive full replay
- Stale template: `abis/MyAwesomeContract.json`

---

## 3. What Is Missing or Broken

### 3.1 Critical — Market UI ↔ API Mismatch 🔴

The market page was added (`apps/web/src/app/dashboard/market/page.tsx`) but **`marketApi` in `api.ts` uses wrong paths and payload**:

| Web client (`api.ts`) | Actual API route | Issue |
|-----------------------|------------------|-------|
| `GET /market/my` | `GET /market/packs/my` | ❌ 404 |
| `POST /market/${id}/purchase` | `POST /market/packs/${id}/purchase` | ❌ 404 |
| `POST /market/${id}/scan` | `POST /market/packs/scan` | ❌ Wrong path |
| Purchase body `{}` | Requires `{ monadTxHash, buyerAddress }` | ❌ 400 validation error |

**Additional logic bug:** Page calls `getPacks()` (`/market/packs/my`) to show **purchased** packs, but that endpoint returns the **seller's listed packs**, not buyer purchases. **No API endpoint exists** for "my purchased packs."

**Impact:** Market page renders but browse/purchase/ingest flow will fail against a live API.

### 3.2 Deployment — Partially Fixed ⚠️

**Fixed since last audit:**
- ✅ `PORT` env fallback in `index.ts`
- ✅ `render.yaml` now includes `CORS_ORIGIN`, `NODE_ENV=production`, `MEMORY_MARKET_ADDRESS`, `VAULT_REGISTRY_ADDRESS`

**Still blocking or risky:**

| Issue | Severity | Details |
|-------|----------|---------|
| `DATABASE_URL` manual | 🔴 | Must use external Neon; not in blueprint |
| Render free Postgres | 🔴 | Expires after 30 days if used |
| Extraction not in `render.yaml` | 🟠 | Recall quality degraded without it |
| Free tier cold start | 🟠 | 15 min idle → 30–60s spin-up |
| 750 instance hours/month | 🟠 | Service suspended if kept awake 24/7 |
| `NEXT_PUBLIC_API_URL` on Vercel | 🔴 | Must point to live Render/Cloud Run API |
| Purchase verify bypass | 🟠 | Returns `true` when `MONAD_RPC_URL` or `MEMORY_MARKET_ADDRESS` missing |

### 3.3 Local Docker Gaps

| Issue | File | Details |
|-------|------|---------|
| `ENCRYPTION_SECRET` missing | `docker-compose.yml` | API fails `validateEnvironment()` |
| `JWT_SECRET` too short | `docker-compose.yml` | 24 chars; requires ≥32 |
| `NVIDIA_API_KEY` not passed | `docker-compose.yml` | Extraction returns empty in Docker |
| No migrate job | `docker-compose.prod.yml` | Manual migration required |
| Missing contract env vars | `docker-compose.prod.yml` | `MEMORY_MARKET_ADDRESS`, `DELETION_PROVER_ADDRESS`, `ENCRYPTION_SECRET` |

### 3.4 Backend Logic Gaps

| Gap | Details |
|-----|---------|
| Offline Redis queue | Writes queued to `offline_queue:{vaultId}` on PG failure; **no consumer/replay** |
| JWT auth unused | `@fastify/jwt` never registered; `JWT_SECRET` validated but unused |
| `PLAN_LIMITS` not enforced | Defined in shared; no API middleware |
| Env var split | `EXTRACTION_SERVICE_URL` (extract) vs `EXTRACTION_API_URL` (reranker) |
| Market scan stub | `POST /market/packs/scan` expects client-decrypted plaintext |
| Dead dependencies | `aws-sdk`, `@neondatabase/serverless` in `package.json` — zero imports |

### 3.5 Documentation Drift

| README claim | Reality |
|--------------|---------|
| SpaCy NER, port 8000 | NVIDIA NIM LLaMA, port **8001** |
| `npx @mneme/mcp` | Package is private |
| SDK `apiUrl` | Code uses `baseUrl` |
| `scripts/verify.ts` | Does not exist |
| `submitBatch()`, `verifyDeletion()` | Actual: `batchAttest()`, `isDeleted()` |
| `render.yaml` spins API + extraction | Only Redis + API |
| Turborepo Remote Cache | Not configured |
| `deploy/` has CI/CD YAML | Helm charts only |
| Indexer, python-sdk | Not mentioned |
| Next.js 14.2.35 | Pinned 14.2.5 |
| Fly.io free tier for extraction | **Removed in 2024** |

---

## 4. Render Deployment — Current State & Remaining Issues

### 4.1 What Was Fixed

```
Before (blocked):                  After (deployable with setup):
─────────────────                  ────────────────────────────────
API_PORT only, no PORT fallback → PORT ?? API_PORT ?? 3001  ✅
CORS_ORIGIN missing from yaml   → CORS_ORIGIN in render.yaml ✅
Contract addresses missing      → All 4 addresses in yaml    ✅
```

### 4.2 Remaining Render Issues

```
┌────────────────────────────────────────────────────────────────┐
│              RENDER — REMAINING DEPLOYMENT RISKS                  │
├────────────────────────────────────────────────────────────────┤
│ 1. DATABASE_URL        Must be set manually (use Neon, not       │
│                        Render free Postgres — 30-day expiry)    │
├────────────────────────────────────────────────────────────────┤
│ 2. Cold starts         Free tier spins down after 15 min idle;   │
│                        first request takes 30–60 seconds          │
├────────────────────────────────────────────────────────────────┤
│ 3. Instance hour cap   750 hours/month — can't stay awake 24/7   │
│                        all month on free tier                     │
├────────────────────────────────────────────────────────────────┤
│ 4. Extraction absent   Not in render.yaml — heavy image anyway   │
├────────────────────────────────────────────────────────────────┤
│ 5. Vercel disconnect   NEXT_PUBLIC_API_URL must be set on Vercel │
├────────────────────────────────────────────────────────────────┤
│ 6. Market UI broken    Even with API live, market page fails     │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 Render Deploy Checklist

- [x] PORT binding in API code
- [x] `CORS_ORIGIN` in `render.yaml`
- [x] Contract addresses in `render.yaml`
- [ ] Create **Neon** Postgres with pgvector → set `DATABASE_URL` in Render
- [ ] Set `MONAD_RPC_URL`, `MONAD_PRIVATE_KEY`, `OPENAI_API_KEY`
- [ ] Deploy and verify `GET /health` returns 200
- [ ] Set `NEXT_PUBLIC_API_URL=https://<render-host>/v1` on Vercel
- [ ] Optional: UptimeRobot ping `/health` every 10 min to reduce cold starts
- [ ] Fix market API paths in web client (Section 5)

---

## 5. Build Backlog — What Still Needs to Be Built

Audit only. No implementation performed.

### Priority 0 — Make Production Work End-to-End

| # | Item | Solution |
|---|------|----------|
| P0-1 | **Fix `marketApi` paths** | `GET /market/packs`, `GET /market/packs/my`, `POST /market/packs/:id/purchase` |
| P0-2 | **Add buyer purchases endpoint** | `GET /market/purchases` or `GET /vaults/:id/purchases` — web needs this for "Owned" state |
| P0-3 | **Wire purchase UX** | Wallet + USDC tx → pass `{ monadTxHash, buyerAddress }` to API |
| P0-4 | **Neon Postgres** | External `DATABASE_URL`; do not use Render free Postgres long-term |
| P0-5 | **Vercel `NEXT_PUBLIC_API_URL`** | Point to deployed API URL |
| P0-6 | **Docker Compose env** | Add `ENCRYPTION_SECRET` (≥32 chars), fix `JWT_SECRET` length |

### Priority 1 — Feature Completeness

| # | Item | Solution |
|---|------|----------|
| P1-1 | **Create pack UI** | Form on market page calling `POST /market/packs` |
| P1-2 | **Host extraction** | Cloud Run, VPS, or strip CrossEncoder for lighter image |
| P1-3 | **Unify extraction env** | Single `EXTRACTION_SERVICE_URL` for extract + rerank |
| P1-4 | **Fail-closed purchase verify** | Reject purchases in production when chain config missing |
| P1-5 | **Offline queue consumer** | Background worker to replay `offline_queue:*` |

### Priority 2 — Quality & Ops

| # | Item | Solution |
|---|------|----------|
| P2-1 | **Web CI** | Add `tsc` + `next lint` for `apps/web` |
| P2-2 | **Gate Docker on contract tests** | Add `test-contracts` to docker job `needs` |
| P2-3 | **Real SDK/MCP tests** | Replace `expect(true).toBe(true)` |
| P2-4 | **Remove `ignoreBuildErrors`** | Fix TS errors in web |
| P2-5 | **Publish or document MCP** | Local install path if staying private |
| P2-6 | **Contract verify script** | Create `contracts/scripts/verify.ts` |
| P2-7 | **Indexer integration** | Expand to all contracts; wire to dashboard |
| P2-8 | **Python SDK docs** | README section for `packages/python-sdk` |

### Priority 3 — Future

| # | Item |
|---|------|
| P3-1 | True ZK compliance proofs (SHA-256 + tombstone is current) |
| P3-2 | JWT auth layer or remove dead dependency |
| P3-3 | `PLAN_LIMITS` enforcement middleware |
| P3-4 | CD workflow (GitHub Actions → Cloud Run or Render) |

---

## 6. Deployment Platform Comparison

### 6.1 Render (Current Plan)

| Pros | Cons |
|------|------|
| `render.yaml` blueprint exists | Free Postgres expires in 30 days |
| Redis wired via `fromService` | 15-min idle spin-down (30–60s cold start) |
| Docker support | 750 instance hours/month cap |
| Config now mostly correct | Extraction too heavy for free tier |

**Verdict:** Usable for demo/hackathon **after** Neon setup and market UI fixes. Not ideal for production traffic.

### 6.2 Google Cloud Run + Neon + Upstash (Recommended Free Alternative)

| Service | Role | Free tier (2026) |
|---------|------|------------------|
| Cloud Run | API + extraction (Docker) | 2M requests/mo, 180K vCPU-sec, 360K GiB-sec |
| Neon | PostgreSQL + pgvector | 0.5 GB, no 30-day expiry |
| Upstash | Redis | 10K commands/day |
| Vercel | Frontend | Already deployed |

**Why better than Render free:**
- No 30-day database deletion
- `PORT` handled natively
- Scale-to-zero with faster cold starts (~1–3s vs 30–60s)
- No 750-hour monthly cap on always-on (pay-per-request within free allowance)

**Deploy outline:**
```bash
# After fixing PORT in code (already done):
gcloud builds submit --tag gcr.io/PROJECT_ID/mneme-api -f apps/api/Dockerfile .
gcloud run deploy mneme-api \
  --image gcr.io/PROJECT_ID/mneme-api \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,CORS_ORIGIN=https://mneme-five.vercel.app,DATABASE_URL=...,ENCRYPTION_SECRET=..."
```

### 6.3 Openship (openship.io) — Evaluated

> **Name trap:** `openship.org` is an e-commerce OMS (Shopify fulfillment). Irrelevant to MNEME. Only **openship.io** (`oblien/openship`) is a deployment platform.

| MNEME need | Openship fit |
|------------|--------------|
| Docker API | ✅ Native |
| Python extraction | ✅ Supports Docker |
| Turborepo monorepo | ✅ Claims auto-detection |
| PostgreSQL + pgvector | ⚠️ Postgres yes; pgvector needs verification — use Neon alongside |
| Redis | ✅ One-click |
| Neo4j | ❌ Not built-in — custom container |
| Free managed cloud | ⚠️ Openship Cloud pricing not announced yet ("coming soon") |
| Self-host on VPS | ✅ Free forever, no caps |

| Pros | Cons |
|------|------|
| Deploy docker-compose as-is | Very new (launched ~July 2026) |
| Built-in Postgres + Redis + SSL | AGPL + Commons Clause license |
| MCP server for deploy management | Openship dashboard defaults to `:3001` (MNEME API port clash locally) |
| No Render spin-down on own VPS | Requires VPS (Oracle Free, Hetzner ~€4/mo) |
| Push-to-deploy, rollbacks | Clustering/HA "coming soon" |

**Verdict:** **Usable if you self-host on a VPS** and want one control plane for API + extraction + Redis. **Not a drop-in Render replacement** for zero-ops managed hosting today. Pair with Neon for pgvector safety.

**Best Openship setup for MNEME:**
1. Self-host Openship on Oracle Always Free ARM VM or Hetzner VPS
2. Deploy API + extraction via existing Dockerfiles
3. Use Neon for Postgres (pgvector guaranteed)
4. Keep Vercel for frontend
5. Set `NEXT_PUBLIC_API_URL` to Openship-routed API domain

### 6.4 Fly.io — Not Recommended

Fly.io **removed permanent free tier in October 2024**. New accounts get ~2 VM hours / 7-day trial only. Do not plan extraction hosting here on free tier.

### 6.5 Recommended Architecture (Free / Low-Cost)

```
┌──────────────┐     HTTPS      ┌─────────────────────┐
│   Vercel     │ ──────────────▶│  Cloud Run / Render │
│  Next.js     │  NEXT_PUBLIC_  │  Fastify API        │
│  Dashboard   │  API_URL       └──────────┬──────────┘
└──────────────┘                           │
                                           ├──▶ Neon Postgres (pgvector)
                                           ├──▶ Upstash Redis
                                           ├──▶ Cloud Run / VPS (Extraction) optional
                                           ├──▶ AuraDB Neo4j (optional)
                                           └──▶ Monad Testnet RPC
```

---

## 7. Test & CI Coverage

### 7.1 CI Jobs (`.github/workflows/ci.yml`)

| Job | Covers | Gates Docker? |
|-----|--------|---------------|
| `lint` | API + MCP TypeScript | No |
| `test-classifier` | Classifier unit tests | No |
| `test-api` | E2E vault/memory/compliance | Yes |
| `test-contracts` | 12 Hardhat tests | **No** |
| `build` | Turbo build all | No |
| `validate-migrations` | Migration idempotency | Yes |
| `docker` | Push API + Web to GHCR (main) | — (`continue-on-error: true`) |

### 7.2 Test Gaps

| Area | Status |
|------|--------|
| Web app | ❌ No tsc, no next lint |
| Market API | ❌ E2E never calls market endpoints |
| MCP | ❌ Placeholder test |
| SDK | ❌ Placeholder test |
| Extraction | ❌ No Python tests |
| Indexer | ❌ Not in CI |
| Contract coverage / slither | ❌ Not run |

### 7.3 Verified Locally

| Test | Result | Date |
|------|--------|------|
| Hardhat contracts | **12/12 passing** | 2026-07-21 |

---

## 8. Security Notes

| Item | Severity |
|------|----------|
| `.env` in repo root (local) | 🔴 Ensure never committed |
| `MONAD_PRIVATE_KEY` in deploy env | 🔴 Use platform secrets |
| Market purchase bypass without RPC | 🟠 Accepts unverified purchases |
| Demo API key in web fixtures | 🟡 Client bundle only in dev/demo |
| `ignoreBuildErrors` on web | 🟠 Broken types can ship |
| CORS wildcard blocked in prod | ✅ Good |

---

## 9. Component Status Matrix

| Component | Built | Tested | Deployed | Integrated | Notes |
|-----------|-------|--------|----------|------------|-------|
| API — memories | ✅ | ✅ E2E | ⚠️ | ⚠️ | Needs Neon + Render/Cloud Run |
| API — market | ✅ | ❌ | ⚠️ | ❌ Web paths broken | On-chain list wired |
| API — compliance | ✅ | ✅ E2E | ⚠️ | ✅ | |
| API — attestations | ✅ | ❌ | ⚠️ | ✅ | |
| Extraction | ✅ | ❌ | ❌ | ⚠️ | Optional degradation |
| Web — memories | ✅ | ❌ | ✅ Vercel | ⚠️ | Needs API URL |
| Web — market | ⚠️ UI only | ❌ | ✅ Vercel | ❌ | **API wiring broken** |
| Web — compliance | ✅ | ❌ | ✅ Vercel | ⚠️ | |
| MCP server | ✅ | ❌ | N/A | ✅ | Private package |
| TypeScript SDK | ✅ | ❌ | N/A | ✅ | |
| Python SDK | ✅ | ❌ | N/A | ❌ | Undocumented |
| Contracts | ✅ | ✅ 12/12 | ✅ Testnet | ✅ | viem wired |
| VaultRegistry on-chain | ✅ | ❌ | N/A | ✅ | Fire-and-forget |
| Indexer | ⚠️ | ❌ | ❌ | ❌ | Attestations only |
| Redis queue replay | ❌ | ❌ | N/A | ❌ | Dead end |
| Render blueprint | ✅ | N/A | ⚠️ | ⚠️ | Improved; needs Neon |
| GitHub Actions CI | ✅ | Partial | N/A | ⚠️ | Gaps above |

---

## 10. Changes Since First Audit (Today)

| Item | First audit | Now |
|------|-------------|-----|
| PORT binding | ❌ `API_PORT` only | ✅ `PORT ?? API_PORT` |
| `render.yaml` CORS | ❌ Missing | ✅ Set to Vercel URL |
| `render.yaml` contracts | ❌ Partial | ✅ All 4 addresses |
| Market web page | ❌ Missing | ⚠️ Added but broken API paths |
| VaultRegistry on-chain | ❌ Not called | ✅ `registerVaultOnChain()` |
| Market listPack on-chain | ❌ DB only | ✅ `listPackOnChain()` |
| MCP `memory_list` | ❌ Missing | ✅ Added |
| MCP import bug | ❌ `r.data.imported` | ✅ Fixed |
| MCP settings URL | ❌ Hardcoded Vercel | ✅ Uses `NEXT_PUBLIC_API_URL` |
| Openship evaluation | — | ✅ Added (Section 6.3) |

---

## 11. Priority Action Plan

### This Week — Go Live

1. Provision **Neon** Postgres → set `DATABASE_URL` on Render
2. Deploy API to Render (or Cloud Run)
3. Set `NEXT_PUBLIC_API_URL` on Vercel
4. Verify: create vault → write memory → recall → GDPR erase
5. **Fix market API paths + add purchases endpoint** (P0-1, P0-2)

### Next Week — Complete Market

1. Wire USDC purchase flow with `monadTxHash` (P0-3)
2. Add create-pack UI (P1-1)
3. Host extraction on Cloud Run or VPS (P1-2)
4. Fix Docker Compose env for local dev (P0-6)

### Later — Harden

1. Offline queue consumer (P1-5)
2. Web CI + remove `ignoreBuildErrors` (P2-1, P2-4)
3. Indexer expansion (P2-7)
4. CD pipeline (P3-4)

---

## 12. Production Environment Checklist

### Required (API won't start without)

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon connection string |
| `ENCRYPTION_SECRET` | `openssl rand -hex 32` (≥32 chars) |
| `JWT_SECRET` | `openssl rand -hex 32` (≥32 chars; currently unused) |
| `CORS_ORIGIN` | `https://mneme-five.vercel.app` |
| `NODE_ENV` | `production` |

### Required for Full Features

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Upstash or Render Redis |
| `OPENAI_API_KEY` | Embeddings |
| `MONAD_RPC_URL` | `https://testnet-rpc.monad.xyz` |
| `MONAD_PRIVATE_KEY` | Attestations, GDPR, vault/pack registration |
| `ATTESTATION_AGGREGATOR_ADDRESS` | From deployment JSON |
| `DELETION_PROVER_ADDRESS` | From deployment JSON |
| `MEMORY_MARKET_ADDRESS` | From deployment JSON |
| `VAULT_REGISTRY_ADDRESS` | From deployment JSON |
| `EXTRACTION_SERVICE_URL` | Optional extraction host |
| `NVIDIA_API_KEY` | Optional LLM extraction |

### Vercel

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://<api-host>/v1` |

---

## 13. Conclusion

MNEME has made **meaningful progress** since the first audit: deployment config is largely fixed, on-chain vault and pack registration are wired, the market UI scaffold exists, and MCP tools are more complete. The project is **deployable as a demo** once Neon is provisioned and the API is live on Render or Cloud Run.

The **single biggest remaining product gap** is the **broken Memory Market web ↔ API integration** — wrong URL paths, missing purchases endpoint, and no wallet/tx flow for purchases. Fix that before demoing the market feature.

For hosting, **Google Cloud Run + Neon + Upstash** remains the safest free alternative to Render. **Openship** is viable if you self-host on a VPS and want unified Docker deploy management, but its managed cloud is not ready yet.

This audit replaced all prior `audit.md` content. No repository code was modified.

---

*End of audit — 2026-07-21 (second pass)*
