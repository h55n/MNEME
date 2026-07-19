# MNEME — Product Requirements Document

## Sovereign, Portable, Monetisable Memory Infrastructure for AI Agents

**Version:** 1.0.0  
**Date:** July 2026  
**Status:** Implementation-Ready  
**Classification:** Confidential — Internal Product Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [Market Analysis & Competitor Intelligence](#3-market-analysis--competitor-intelligence)
4. [User Personas](#4-user-personas)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [User Stories & Acceptance Criteria](#7-user-stories--acceptance-criteria)
8. [Feature Specifications](#8-feature-specifications)
9. [Technical Architecture](#9-technical-architecture)
10. [API Design](#10-api-design)
11. [Database Schema](#11-database-schema)
12. [Monad Integration Architecture](#12-monad-integration-architecture)
13. [Security Architecture](#13-security-architecture)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Monitoring & Observability](#16-monitoring--observability)
17. [Risk Analysis](#17-risk-analysis)
18. [Phase-Wise Development Roadmap](#18-phase-wise-development-roadmap)
19. [Success Metrics & KPIs](#19-success-metrics--kpis)
20. [Architecture & Flow Diagrams](#20-architecture--flow-diagrams)

---

## 1. Executive Summary

### 1.1 The Problem

AI agents are cognitively capable but institutionally amnesiac. Every major model provider — Anthropic, OpenAI, Google — has deliberately engineered memory lock-in: your agent's accumulated knowledge lives on their servers, in their format, under their control. Switch models or platforms and the memory is gone. This isn't an oversight; it's a business strategy.

The consequence: agents can execute complex tasks but cannot _persist as entities_. They have no portable identity, no transferable history, no economic stake in what they've learned. Every new session, every model switch, every platform migration wipes the slate. The agent economy cannot scale on these terms.

Existing solutions (Mem0, Zep, Letta, Cognee) solve persistence within their own ecosystems. None solves sovereignty. None provides portability across models and platforms. None creates an economic layer around the accumulated knowledge agents generate.

### 1.2 The Solution

**MNEME** (named after the Greek Titaness of memory) is sovereign, portable, monetisable memory infrastructure for AI agents. It operates as a model-agnostic memory layer exposed via MCP (Model Context Protocol), with cryptographic ownership anchored on Monad's high-throughput L1 blockchain.

Three core capabilities:

1. **Sovereign Vault** — Agent memory tied to a DID (Decentralised Identifier), not a platform account. Operator-owned keys. Switch models, keep memory.
2. **Cross-Model Portability** — MCP server exposing memory to Claude, GPT, Gemini, Llama, or any MCP-compatible agent without rebuilding.
3. **Memory Market** — Operators of high-performing agents monetise anonymised memory snapshots. New agents bootstrap domain expertise on day one.

Monad is not decoration. Its 10,000 TPS throughput and sub-second finality enable the thousands of daily on-chain attestations (memory fingerprints, provenance records, market transactions) that make sovereign ownership real without prohibitive gas costs.

### 1.3 Key Differentiators vs. Competition

| Capability               | Mem0       | Zep         | Letta          | Cognee         | **MNEME**                       |
| ------------------------ | ---------- | ----------- | -------------- | -------------- | ------------------------------- |
| Cross-model portability  | ❌         | ❌          | Partial        | ❌             | ✅                              |
| Operator-owned keys      | ❌         | ❌          | ✅ (self-host) | ✅ (self-host) | ✅ (native)                     |
| On-chain provenance      | ❌         | ❌          | ❌             | ❌             | ✅ (Monad)                      |
| Memory marketplace       | ❌         | ❌          | ❌             | ❌             | ✅                              |
| Compliance audit trail   | ❌         | Partial     | ❌             | ❌             | ✅                              |
| MCP-native               | Plugin     | Plugin      | Plugin         | Plugin         | **Core**                        |
| Temporal knowledge graph | ❌         | ✅          | ❌             | ✅             | ✅                              |
| Pricing model            | Per memory | Per episode | Per execution  | Subscription   | Per attestation + revenue share |

---

## 2. Product Vision & Strategy

### 2.1 Vision Statement

> _"Every AI agent deserves a memory it owns — portable across platforms, provable in court, valuable in the market."_

### 2.2 Mission

To build the neutral, open-standard memory infrastructure layer that enables AI agents to function as persistent economic actors — not ephemeral tools that forget and restart.

### 2.3 Strategic Objectives

**Objective 1: Establish the portability standard**  
Become the de facto MCP-compatible memory layer before model providers lock in proprietary memory APIs. Target: 1,000 agent deployments within 6 months.

**Objective 2: Make Monad the trust anchor for agent memory**  
Drive meaningful on-chain activity through memory attestations and market transactions. Target: 500,000 on-chain memory attestations in 12 months.

**Objective 3: Create the first functioning memory economy**  
Launch the Memory Market with enough supply-side operators to make domain memory packs viable. Target: 50 memory packs listed, $10K GMV within 18 months.

**Objective 4: Win enterprise compliance use cases**  
Position the on-chain audit trail as the enterprise-grade answer to AI governance requirements. Target: 5 enterprise pilots by month 12.

### 2.4 Product Principles

- **Sovereignty first.** Operators own their agents' memory. No exceptions, no fine print.
- **Model-agnostic always.** If it speaks MCP, it speaks MNEME. No preferential treatment for any model provider.
- **On-chain where it matters, off-chain where it's smart.** Monad anchors provenance; encrypted off-chain storage keeps costs and privacy intact.
- **Earn trust before asking for money.** The sovereign vault is free. Monetisation comes from the market and enterprise compliance tiers.

### 2.5 Product Positioning

MNEME is not a memory library (like Mem0's open-source SDK). It is not a hosted memory service (like Mem0 Cloud or Zep Cloud). It is **memory infrastructure** — the neutral layer underneath both, analogous to what S3 is to file storage or what Stripe is to payments.

Target the builder, not the end user. MNEME's customers are developers and operators building agents, not the humans those agents serve.

---

## 3. Market Analysis & Competitor Intelligence

### 3.1 Market Size

- AI agent infrastructure market: projected $4.2B by 2027 (Gartner, 2026)
- Agent memory specifically: ~$180M TAM in 2026, projected $1.1B by 2028
- Blockchain-AI convergence: $500M+ in VC deployed in 2025–2026 alone

### 3.2 Competitor Deep Dive

#### Mem0

- **Position:** Most widely deployed, drop-in memory library
- **Architecture:** Vector + LLM extraction (graph on paid Pro tier)
- **Strengths:** 48K GitHub stars, $24M Series A, broadest framework support, AWS Agent SDK exclusive partnership, ~80ms p50 retrieval latency
- **Weaknesses:** Cloud-first, proprietary format, graph memory paywalled at $249/mo, zero portability across providers, incentivised to maintain lock-in
- **Pricing:** Free (1K memories/mo) → $19/mo → $249/mo (Pro with graph) → Enterprise
- **MNEME Response:** Offer free MCP server that outperforms Mem0's free tier; target Mem0 users frustrated by the lock-in and the Pro paywall

#### Zep / Graphiti

- **Position:** Temporal reasoning specialist
- **Architecture:** Temporal knowledge graph (validity windows per fact)
- **Strengths:** 63.8% LongMemEval (vs Mem0's 49%), ~18.5% accuracy gain on time-sensitive queries, genuinely superior for "what was true on date X"
- **Weaknesses:** Moving away from open self-hosting (SaaS from ~$25/mo), ~150ms graph traversal latency, steep learning curve, no portability
- **MNEME Response:** Implement temporal knowledge graph as core memory architecture (matching Zep's strength); combine with on-chain provenance (Zep's gap)

#### Letta (formerly MemGPT)

- **Position:** OS-inspired stateful agent runtime
- **Architecture:** Three-tier (core memory = RAM, recall = cache, archival = disk), agent self-edits memory
- **Strengths:** $10M seed at $70M valuation, fully self-hostable, pluggable backends, backed by Jeff Dean, best for long-running autonomous agents
- **Weaknesses:** You adopt a runtime not a library (high switching cost), no temporal supersession, complex setup
- **MNEME Response:** MNEME works _alongside_ Letta — expose as MCP server that Letta agents can query, don't compete with the runtime layer

#### Cognee

- **Position:** Graph-native memory with knowledge graph pipeline
- **Architecture:** Neo4j-backed graph with vector hybrid, Remember–Recall–Improve–Forget pipeline
- **Strengths:** 500x pipeline growth, 1M+ runs/month, open-source, 70+ production companies
- **Weaknesses:** No sovereign ownership, no portability, self-hosted means you own the ops burden
- **MNEME Response:** Offer Cognee-style graph depth with MNEME's sovereign ownership layer on top

#### MemPalace (emerging)

- **Position:** Local-first, verbatim storage, zero API calls
- **Architecture:** Semantic index over structured local storage (people/projects as "wings")
- **Strengths:** 54K GitHub stars (June 2026), 96.6% LongMemEval score, MIT licensed, zero cloud cost
- **Weaknesses:** Local-only (no cross-device, no cross-agent), no marketplace, no on-chain provenance
- **MNEME Response:** MemPalace is complementary; target their users who want to go multi-agent or cross-platform

### 3.3 Gap Analysis Summary

The market has solved **persistence**. Nobody has solved **sovereignty + portability + monetisation**. That is MNEME's entire thesis confirmed by competitive research.

Specific gaps:

1. No competitor offers cryptographically-proven memory ownership
2. No competitor offers cross-model memory portability as a first-class feature
3. No competitor has a memory marketplace
4. No competitor has enterprise-grade on-chain audit trails
5. Every competitor is incentivised to create lock-in; MNEME is structurally incentivised against it (revenue comes from the market and compliance, not from keeping memory siloed)

---

## 4. User Personas

### Persona 1: Arjun — The Agent Builder (Primary)

**Role:** Senior engineer at a Series A startup building an AI-powered legal ops product  
**Tech sophistication:** High — comfortable with LLMs, vector DBs, APIs, some blockchain familiarity  
**Current stack:** Claude API + LangGraph + Mem0 Cloud  
**Pain points:**

- Clients ask "what does your AI know about our company?" and he can't show them — it's all in Mem0's cloud
- When Anthropic released a better model, switching cost a week's work because memory wasn't portable
- Legal clients need audit trails; Mem0 doesn't provide them
- Mem0's $249/mo Pro tier for graph features feels arbitrary

**What he needs from MNEME:**

- Drop-in replacement for Mem0 that works with his existing LangGraph setup
- Exportable memory in an open format
- Compliance-grade audit logs he can show clients
- Predictable pricing

**Quote:** _"I built six months of institutional knowledge into my agent. Now I'm scared to switch models because I'll lose it all."_

---

### Persona 2: Priya — The Enterprise AI Lead (Secondary)

**Role:** Head of AI at a 5,000-person financial services firm  
**Tech sophistication:** Medium-high — understands architecture, defers on implementation  
**Current stack:** Azure OpenAI + internal tooling  
**Pain points:**

- Regulators asking "how do you know what your AI knew when it made that decision?"
- Vendor lock-in is a board-level concern — they can't be dependent on one AI provider
- GDPR/RBI compliance team blocks any cloud memory that they can't audit

**What she needs from MNEME:**

- Tamper-proof, on-chain audit trail of agent memory at decision points
- Self-hostable infrastructure with enterprise SLAs
- Data residency guarantees
- SOC2 compliance

**Quote:** _"We can't deploy an AI agent for loan decisions if we can't prove in court what it knew at the time."_

---

### Persona 3: Dev — The Indie Agent Operator (Secondary)

**Role:** Solo developer building and selling multiple specialised AI agents  
**Tech sophistication:** High — full-stack, knows crypto  
**Current stack:** Various models, building on open-source frameworks  
**Pain points:**

- Each new agent he builds starts from zero — he can't reuse expertise from previous agents
- His best-performing agent has accumulated valuable domain knowledge that lives nowhere portable
- No way to monetise the knowledge his agents generate

**What he needs from MNEME:**

- Memory packs he can sell — his domain expertise packaged and priced
- Cross-agent memory sharing for his own portfolio
- Revenue sharing that's transparent and on-chain

**Quote:** _"My coding agent has reviewed 10,000 PRs. That knowledge is worth something. Right now it just disappears."_

---

### Persona 4: Maya — The Compliance Officer (Influencer)

**Role:** Chief Compliance Officer at a fintech  
**Tech sophistication:** Low on technical, high on risk/legal  
**Pain points:**

- AI decisions are black boxes; she can't explain them to regulators
- No audit trail for what context AI agents had at decision time
- GDPR consent tracking for any user data feeding into AI memory

**What she needs from MNEME:**

- Plain-language compliance dashboard
- On-chain proof of memory state at any decision timestamp
- GDPR-compliant memory deletion with proof of deletion

---

## 5. Functional Requirements

### 5.1 Memory Vault (Core)

**FR-001:** System SHALL create a sovereign memory vault for each agent, tied to a DID and accessible only via operator-held private keys.

**FR-002:** Vault SHALL persist across sessions, model switches, and platform migrations without any data loss or reformatting required.

**FR-003:** System SHALL support three memory tiers:

- **Episodic:** Raw interaction history, timestamped
- **Semantic:** Extracted facts and entity relationships (temporal knowledge graph)
- **Procedural:** Learned workflows, preferences, and behavioural patterns

**FR-004:** Memory write operations SHALL complete within 100ms p95 for episodic storage. Semantic graph updates may be asynchronous (complete within 5 seconds).

**FR-005:** Memory retrieval SHALL support:

- Semantic similarity search
- Temporal queries ("what did this agent know on date X?")
- Entity-relationship traversal
- Multi-hop reasoning queries

**FR-006:** System SHALL support selective memory forgetting — operators can delete specific memories with cryptographic proof of deletion generated and logged on-chain.

### 5.2 MCP Server Layer

**FR-010:** System SHALL expose a fully MCP-compliant server interface supporting all MCP tool primitives.

**FR-011:** MCP server SHALL be compatible with Claude, GPT, Gemini, and any LLM supporting MCP protocol as of April 2026 specification.

**FR-012:** System SHALL support concurrent multi-agent access to shared memory namespaces with conflict resolution.

**FR-013:** MCP server SHALL support:

- `memory_write` — store a memory with metadata
- `memory_recall` — semantic + temporal retrieval
- `memory_forget` — delete with on-chain proof
- `memory_inspect` — query memory state at a timestamp
- `memory_export` — export vault contents in open format
- `memory_import` — import from exported vault or third-party format

**FR-014:** System SHALL support direct import from Mem0, Zep, and Letta formats for migration.

### 5.3 On-Chain Anchoring (Monad)

**FR-020:** Every memory write event SHALL generate a cryptographic fingerprint (SHA-256 hash of encrypted memory content + metadata) anchored on Monad.

**FR-021:** On-chain records SHALL include: agent DID, operation type, content hash, timestamp, operator address.

**FR-022:** System SHALL NOT store raw memory content on-chain — only cryptographic fingerprints. Full content remains encrypted off-chain.

**FR-023:** Monad smart contracts SHALL enforce operator key ownership for all write and delete operations.

**FR-024:** System SHALL generate cryptographic SHA-256 hashes of memory state at any historical timestamp for compliance use cases.

**FR-025:** On-chain gas costs per attestation SHALL not exceed $0.001 at Monad's current fee schedule.

### 5.4 Memory Market

**FR-030:** Operators SHALL be able to list anonymised memory snapshots as purchasable "Memory Packs" on an in-product marketplace.

**FR-031:** Memory Pack creation SHALL run content through an automated PII/sensitive data detection pipeline before listing is permitted.

**FR-032:** Every Memory Pack listed SHALL have:

- Domain category tag
- Source agent interaction count
- Date range of accumulated experience
- On-chain provenance hash proving real interactions (not synthetic)
- Anonymisation audit report

**FR-033:** Buyers SHALL be able to ingest a purchased Memory Pack into a new or existing agent vault with a single API call.

**FR-034:** Revenue split: 80% to Memory Pack seller, 20% platform fee. Settlement in USDC on Monad.

**FR-035:** Buyers SHALL be able to preview Memory Pack quality via a free sample query before purchase.

### 5.5 Compliance & Audit

**FR-040:** System SHALL generate a human-readable Compliance Report for any agent vault, covering: total memories stored, decision timestamps, data sources, and deletion log.

**FR-041:** On-chain audit trail SHALL be queryable by timestamp range, operation type, and agent DID.

**FR-042:** System SHALL support GDPR Article 17 (Right to Erasure) with cryptographic proof of deletion.

**FR-043:** Enterprise tier SHALL support data residency configuration (EU, US, India) for off-chain storage.

**FR-044:** System SHALL support SOC2 Type II audit logging for all administrative operations.

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric                            | Target           | Stretch           |
| --------------------------------- | ---------------- | ----------------- |
| Memory write latency (p50)        | <50ms            | <20ms             |
| Memory write latency (p95)        | <100ms           | <50ms             |
| Memory retrieval latency (p50)    | <80ms            | <40ms             |
| Memory retrieval latency (p95)    | <200ms           | <100ms            |
| On-chain attestation confirmation | <2s (Monad)      | <1s               |
| API availability                  | 99.9%            | 99.99%            |
| Max concurrent agents per vault   | 100              | 1,000             |
| Memory pack ingest throughput     | 10K memories/min | 100K memories/min |

### 6.2 Scalability

- System SHALL horizontally scale to support 100,000 active agent vaults
- Vector storage SHALL support up to 10 million memories per vault
- Knowledge graph SHALL support up to 1 million nodes per agent
- API gateway SHALL handle 50,000 requests/second at peak

### 6.3 Security

- All memory content SHALL be encrypted at rest (AES-256-GCM)
- All data in transit SHALL use TLS 1.3
- Operator private keys SHALL never touch MNEME servers — all signing happens client-side
- System SHALL support hardware security module (HSM) integration for enterprise
- Memory content SHALL be zero-knowledge to MNEME — the platform cannot read stored memories

### 6.4 Maintainability

- All services SHALL expose health endpoints and structured logging (JSON)
- Code coverage target: 80% unit, 60% integration
- API versioning: semver, minimum 12 months deprecation notice
- Infrastructure as code: all deployment via Terraform

---

## 7. User Stories & Acceptance Criteria

### Epic 1: Sovereign Memory Vault

**US-001: Create Agent Vault**  
_As an agent operator, I want to create a sovereign memory vault for my agent so that all memories are owned by my keys, not a vendor's platform._

Acceptance Criteria:

- Operator provides a public key; system creates vault and registers DID on Monad
- DID is resolvable via W3C DID resolution spec
- Vault creation generates a Monad transaction confirming ownership
- Vault ID returned within 3 seconds
- Operator private key never transmitted to MNEME servers

---

**US-002: Write Memory Across Sessions**  
_As an agent, I want to write memories after each interaction so that context is preserved for the next session regardless of model or platform._

Acceptance Criteria:

- Memory write API accepts: content, type (episodic/semantic/procedural), timestamp, metadata tags
- Write acknowledged within 100ms
- Memory is retrievable in subsequent sessions with correct content
- On-chain fingerprint generated and confirmable within 2 seconds
- Write fails gracefully if Monad is unreachable — queued and retried, not lost

---

**US-003: Switch Models Without Memory Loss**  
_As an agent operator, I want to switch from Claude to GPT mid-project and have the new model access full memory context so that model portability is real, not theoretical._

Acceptance Criteria:

- Same MCP endpoint works for Claude and GPT without configuration change
- Memory retrieved by new model matches memory written by previous model
- Semantic search works correctly across model boundaries
- Zero memories lost in model switch demo scenario

---

**US-004: Export Memory Vault**  
_As an operator, I want to export my agent's complete memory vault in an open format so that I am never locked in to MNEME itself._

Acceptance Criteria:

- Export produces a JSON-L file with all memories, metadata, and relationship graph
- Export includes on-chain proof of completeness (hash of export matches on-chain registry)
- Export completes within 60 seconds for vaults up to 100K memories
- Exported format documented as open standard, not proprietary

---

### Epic 2: MCP Integration

**US-010: Integrate via MCP in Under 10 Minutes**  
_As a developer, I want to add MNEME memory to my existing agent with minimal code change so that adoption is frictionless._

Acceptance Criteria:

- npm/pip SDK install and MCP server configuration: under 5 lines of config
- Working memory read/write in existing LangGraph agent: under 30 minutes
- Documentation includes working code examples for Claude, GPT, Llama
- No agent code change required beyond MCP config

---

### Epic 3: Memory Market

**US-020: List a Memory Pack**  
_As an experienced agent operator, I want to package and sell my agent's domain knowledge so that others can bootstrap domain expertise rather than starting from zero._

Acceptance Criteria:

- Operator selects memory date range and domain tag
- System runs automatic PII scan — listing blocked if PII detected
- Operator sees anonymisation report before publishing
- Pack includes on-chain provenance hash proving real interactions
- Pack visible in marketplace within 24 hours of listing

---

**US-021: Buy and Ingest a Memory Pack**  
_As a new operator, I want to buy domain memory packs so that my agent starts with real-world expertise._

Acceptance Criteria:

- Browse marketplace by domain category and interaction count
- Free sample query before purchase works correctly
- Purchase completes via USDC on Monad
- Memory pack ingested into target vault via single API call
- Ingested memories tagged with provenance (source pack ID, purchase transaction)

---

### Epic 4: Compliance

**US-030: Generate Compliance Report**  
_As a compliance officer, I want an audit report showing exactly what my AI agent knew at any decision timestamp so that I can respond to regulators._

Acceptance Criteria:

- Input: agent DID + timestamp range
- Output: PDF/JSON report with memory state, operation log, decision timestamps
- Report includes on-chain verification links (viewable on Monad explorer)
- Report generation completes within 60 seconds
- Report signed by MNEME with timestamp for legal admissibility

---

**US-031: Prove Memory Deletion (GDPR)**  
_As a data controller, I want cryptographic proof that a user's data has been permanently deleted from my agent's memory so that I can comply with GDPR Article 17._

Acceptance Criteria:

- Operator submits deletion request with memory IDs or user identifier
- Off-chain content deleted within 24 hours (verifiable by query returning empty)
- On-chain deletion proof generated: tombstone record with deletion timestamp and operator signature
- Deletion proof exportable as PDF for regulatory submission

---

## 8. Feature Specifications

### 8.1 Memory Vault — Technical Specification

**Storage Architecture:**

```
Layer 1 (Working Memory):    Redis — active session context, <1ms access
Layer 2 (Episodic Store):    PostgreSQL + pgvector — timestamped facts, ~10ms access
Layer 3 (Semantic Graph):    Neo4j — entity-relationship knowledge graph, ~50ms access
Layer 4 (Archival):          S3-compatible object storage — raw interaction logs
Layer 5 (Provenance):        Monad blockchain — cryptographic fingerprints
```

**Memory Extraction Pipeline:**

1. Raw interaction received via MCP
2. LLM extraction call (async) — identifies facts, entities, relationships
3. Conflict resolution against existing graph (temporal supersession)
4. Write to episodic store (sync) + graph update (async)
5. Hash generated → Monad attestation queued
6. Attestation confirmed → hash returned to operator

**Temporal Knowledge Graph:**

- Every fact stored as a graph edge with `valid_from` and `valid_until` timestamps
- Cascade invalidation: when a contradicting fact arrives, system closes previous validity window
- Temporal queries: "What did this agent know on 2026-01-15?" resolved via validity window traversal

### 8.2 Memory Market — Technical Specification

**Anonymisation Pipeline:**

1. Operator initiates pack creation with date range + domain tag
2. System extracts semantic graph snapshot (not raw episodic logs)
3. PII scan: named entity recognition for person names, contact info, financial identifiers
4. Differential privacy noise injection for any numerical data
5. Relationship graph anonymisation: person nodes replaced with pseudonymous IDs
6. Anonymisation audit report generated
7. Pack hash anchored on Monad (proves content integrity at listing time)

**Smart Contract Specification (Monad):**

```solidity
contract MemoryMarket {
    struct Pack {
        bytes32 contentHash;      // Hash of anonymised pack
        address seller;           // Operator wallet
        uint256 price;            // USDC price
        uint256 interactionCount; // Provenance: real interactions
        string domainTag;         // Category
        uint256 listedAt;
    }

    function listPack(bytes32 hash, uint256 price, ...) external;
    function purchasePack(uint256 packId) external;  // USDC transfer + event
    function withdrawRevenue() external;             // 80% to seller
}
```

### 8.3 On-Chain Attestation — Technical Specification

**Attestation Record Structure:**

```typescript
interface MemoryAttestation {
  agentDID: string; // W3C DID
  operatorAddress: string; // Monad wallet
  operationType: "WRITE" | "UPDATE" | "DELETE" | "EXPORT";
  contentHash: string; // SHA-256 of encrypted content
  vaultStateHash: string; // SHA-256 of full vault state post-operation
  timestamp: number; // Unix timestamp
  blockNumber: number; // Monad block
  txHash: string; // Monad transaction hash
}
```

**Batching Strategy:**

- Individual attestations batched into Monad transactions (up to 100 per tx)
- Batch submitted every 10 seconds or when batch size reaches 100
- Emergency flush on vault export or compliance report request
- Estimated cost: 0.00001 MON per attestation at current Monad fee schedule

---

## 9. Technical Architecture

### 9.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        MNEME PLATFORM                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  MCP Server  │  │   REST API   │  │  Dashboard UI    │   │
│  │  (Primary)   │  │  (Secondary) │  │  (React/Next.js) │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                 │                    │              │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐  │
│  │                    API Gateway (Kong)                    │  │
│  │         Rate Limiting | Auth | Versioning               │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────▼────────────────────────────┐  │
│  │                  Core Services Layer                    │  │
│  │  ┌────────────┐ ┌──────────────┐ ┌─────────────────┐  │  │
│  │  │  Memory    │ │  Extraction  │ │  Attestation    │  │  │
│  │  │  Service   │ │  Service     │ │  Service        │  │  │
│  │  └─────┬──────┘ └──────┬───────┘ └────────┬────────┘  │  │
│  │        │               │                  │            │  │
│  └────────┼───────────────┼──────────────────┼────────────┘  │
│           │               │                  │               │
│  ┌────────▼───┐  ┌────────▼────┐   ┌─────────▼──────────┐   │
│  │  Storage   │  │  Vector     │   │  Monad L1          │   │
│  │  Layer     │  │  + Graph    │   │  Blockchain        │   │
│  │  (Redis,   │  │  (pgvector  │   │  (Attestations,    │   │
│  │  PostgreSQL│  │   + Neo4j)  │   │   Market, DIDs)    │   │
│  │  , S3)     │  │             │   │                    │   │
│  └────────────┘  └─────────────┘   └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Service Architecture

**Memory Service** — Core CRUD operations on memory vault

- Written in: TypeScript (Node.js 22)
- Owns: episodic store, working memory cache
- Interfaces with: pgvector (semantic search), Redis (session cache)

**Extraction Service** — LLM-powered memory extraction pipeline

- Written in: Python 3.12 (for LLM ecosystem compatibility)
- Owns: fact extraction, conflict resolution, graph updates
- Interfaces with: Memory Service, Graph DB (Neo4j), configurable LLM endpoint

**Attestation Service** — Monad blockchain integration

- Written in: TypeScript
- Owns: hash generation, batch aggregation, Monad transaction submission
- Interfaces with: Monad RPC, Memory Service (hash triggers)

**Market Service** — Memory Pack listing, discovery, purchase

- Written in: TypeScript
- Owns: pack management, PII scanning, smart contract interaction
- Interfaces with: Monad (smart contract), Anonymisation pipeline

**MCP Server** — Model Context Protocol endpoint

- Written in: TypeScript
- Owns: protocol compliance, tool registration, session management
- Wraps: Memory Service API

### 9.3 Technology Stack

**Backend:**

- Runtime: Node.js 22 LTS (TypeScript) for primary services
- Python 3.12 for ML/extraction pipeline
- Framework: Fastify (Node) — chosen for performance over Express
- ORM: Drizzle ORM (TypeScript-first, fast)

**Databases:**

- PostgreSQL 16 + pgvector extension (episodic memory + semantic search)
- Neo4j 5.x Community / Enterprise (temporal knowledge graph)
- Redis 7.x (working memory cache, session state)
- AWS S3 / MinIO (archival storage, raw logs)

**Blockchain:**

- Network: Monad L1 (EVM-compatible)
- Smart Contracts: Solidity 0.8.x
- Web3 Library: viem
- DID Method: did:monad (custom DID method anchored on Monad)

**Frontend:**

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4 + custom design system
- State: Zustand + TanStack Query
- Charts: Recharts

**Infrastructure:**

- Container: Docker + Kubernetes (K8s)
- Orchestration: Helm charts for deployment
- IaC: Terraform
- CI/CD: GitHub Actions
- Monitoring: Prometheus + Grafana + OpenTelemetry

**Security:**

- Auth: JWT + API Keys (REST); MCP OAuth 2.1
- Encryption: AES-256-GCM (at rest), TLS 1.3 (transit)
- Key Management: Operator-side (never server-side); enterprise HSM support

---

## 10. API Design

### 10.1 REST API — Base URL: `https://api.mneme.dev/v1`

#### Vault Management

```
POST   /vaults                    Create a new agent vault
GET    /vaults/{vaultId}          Get vault metadata
DELETE /vaults/{vaultId}          Destroy vault (with on-chain tombstone)
GET    /vaults/{vaultId}/export   Export full vault (open format)
POST   /vaults/{vaultId}/import   Import from external format
```

#### Memory Operations

```
POST   /vaults/{vaultId}/memories           Write memory
GET    /vaults/{vaultId}/memories           List memories (paginated)
GET    /vaults/{vaultId}/memories/{id}      Get specific memory
DELETE /vaults/{vaultId}/memories/{id}      Delete with on-chain proof
POST   /vaults/{vaultId}/memories/recall    Semantic + temporal retrieval
GET    /vaults/{vaultId}/memories/at        State at timestamp (temporal query)
```

#### Attestations

```
GET    /vaults/{vaultId}/attestations       List on-chain attestation records
GET    /attestations/{txHash}               Verify specific attestation
POST   /vaults/{vaultId}/attestations/verify Batch verification
```

#### Memory Market

```
GET    /market/packs                        Browse memory packs
GET    /market/packs/{packId}               Pack details + provenance
POST   /market/packs                        List a new pack
POST   /market/packs/{packId}/sample        Free sample query
POST   /market/packs/{packId}/purchase      Buy pack (USDC)
POST   /vaults/{vaultId}/ingest/{packId}    Ingest purchased pack
GET    /market/packs/my                     Operator's listed packs
```

#### Compliance

```
POST   /vaults/{vaultId}/compliance/report  Generate compliance report
POST   /vaults/{vaultId}/gdpr/erase        GDPR deletion with proof
GET    /vaults/{vaultId}/audit/log         Audit trail query
```

### 10.2 MCP Tool Definitions

```typescript
// Tool: memory_write
{
  name: "memory_write",
  description: "Store a memory in the agent's sovereign vault",
  inputSchema: {
    type: "object",
    properties: {
      content: { type: "string", description: "Memory content" },
      type: { enum: ["episodic", "semantic", "procedural"] },
      tags: { type: "array", items: { type: "string" } },
      importance: { type: "number", minimum: 0, maximum: 1 }
    },
    required: ["content", "type"]
  }
}

// Tool: memory_recall
{
  name: "memory_recall",
  description: "Retrieve relevant memories using semantic + temporal search",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "number", default: 10 },
      types: { type: "array", items: { enum: ["episodic", "semantic", "procedural"] } },
      before: { type: "string", format: "date-time" },
      after: { type: "string", format: "date-time" }
    },
    required: ["query"]
  }
}

// Tool: memory_inspect (temporal)
{
  name: "memory_inspect",
  description: "Query agent memory state at a specific historical timestamp",
  inputSchema: {
    type: "object",
    properties: {
      timestamp: { type: "string", format: "date-time" },
      query: { type: "string" }
    },
    required: ["timestamp"]
  }
}
```

### 10.3 API Response Standards

All responses follow this envelope:

```typescript
interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string; // e.g. "VAULT_NOT_FOUND"
    message: string;
    details?: unknown;
  } | null;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}
```

**Attestation fields** included on write/delete responses:

```typescript
interface AttestationMeta {
  contentHash: string;
  monadTxHash: string | null; // null if batching pending
  monadBlockNumber: number | null;
  attestedAt: string;
}
```

---

## 11. Database Schema

### 11.1 PostgreSQL Schema

```sql
-- Core vault registry
CREATE TABLE vaults (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did             TEXT UNIQUE NOT NULL,          -- W3C DID
  operator_address TEXT NOT NULL,                -- Monad wallet
  name            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destroyed_at    TIMESTAMPTZ,                   -- Soft delete
  plan            TEXT NOT NULL DEFAULT 'free',  -- free | pro | enterprise
  settings        JSONB NOT NULL DEFAULT '{}'
);

-- Episodic memory store
CREATE TABLE memories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        UUID NOT NULL REFERENCES vaults(id),
  type            TEXT NOT NULL CHECK (type IN ('episodic', 'semantic', 'procedural')),
  content         TEXT NOT NULL,                 -- Encrypted AES-256-GCM
  content_iv      BYTEA NOT NULL,                -- Encryption IV
  embedding       vector(1536),                  -- OpenAI/local embedding
  tags            TEXT[] DEFAULT '{}',
  importance      FLOAT DEFAULT 0.5,
  source_model    TEXT,                          -- Which LLM wrote this
  session_id      UUID,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,                   -- NULL = currently valid
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  content_hash    TEXT NOT NULL,                 -- SHA-256 of plaintext
  provenance_pack_id UUID REFERENCES memory_packs(id)  -- If ingested from market
);

CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON memories (vault_id, valid_from, valid_until);
CREATE INDEX ON memories (vault_id, type, deleted_at);

-- On-chain attestation log
CREATE TABLE attestations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        UUID NOT NULL REFERENCES vaults(id),
  operation       TEXT NOT NULL CHECK (operation IN ('WRITE','UPDATE','DELETE','EXPORT')),
  memory_ids      UUID[],
  content_hash    TEXT NOT NULL,
  vault_state_hash TEXT NOT NULL,
  monad_tx_hash   TEXT,                          -- NULL until confirmed
  monad_block     BIGINT,
  batch_id        UUID,                          -- Batching reference
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at    TIMESTAMPTZ
);

CREATE INDEX ON attestations (vault_id, created_at);
CREATE INDEX ON attestations (monad_tx_hash);

-- Memory Market: Pack listings
CREATE TABLE memory_packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_vault_id UUID NOT NULL REFERENCES vaults(id),
  seller_address  TEXT NOT NULL,
  domain_tag      TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  interaction_count INTEGER NOT NULL,
  date_range_from TIMESTAMPTZ NOT NULL,
  date_range_to   TIMESTAMPTZ NOT NULL,
  price_usdc      NUMERIC(18,6) NOT NULL,
  content_hash    TEXT NOT NULL,                 -- Hash of anonymised pack
  monad_tx_hash   TEXT,                          -- Listing transaction
  pii_scan_passed BOOLEAN NOT NULL DEFAULT FALSE,
  anonymisation_report JSONB,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','listed','delisted')),
  listed_at       TIMESTAMPTZ,
  purchase_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase records
CREATE TABLE pack_purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id         UUID NOT NULL REFERENCES memory_packs(id),
  buyer_vault_id  UUID NOT NULL REFERENCES vaults(id),
  buyer_address   TEXT NOT NULL,
  price_paid_usdc NUMERIC(18,6) NOT NULL,
  monad_tx_hash   TEXT NOT NULL,
  ingested_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance reports
CREATE TABLE compliance_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id        UUID NOT NULL REFERENCES vaults(id),
  requested_by    TEXT NOT NULL,
  report_type     TEXT NOT NULL,
  date_from       TIMESTAMPTZ,
  date_to         TIMESTAMPTZ,
  report_hash     TEXT NOT NULL,
  storage_key     TEXT NOT NULL,                 -- S3 key for report file
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ                    -- Optional expiry
);
```

### 11.2 Neo4j Graph Schema

```cypher
// Agent node — top-level identity
(:Agent {did: string, vaultId: string, createdAt: datetime})

// Entity nodes — extracted from memories
(:Entity {
  id: string,
  type: string,           // PERSON, ORGANIZATION, CONCEPT, SKILL, etc.
  label: string,          // Canonical name
  anonymizedId: string,   // For marketplace packs
  vaultId: string
})

// Fact edges — temporal, between entities
(:Entity)-[:KNOWS {
  factContent: string,
  validFrom: datetime,
  validUntil: datetime,   // NULL = currently valid
  confidence: float,
  sourceMemoryId: string,
  createdAt: datetime
}]->(:Entity)

// Example temporal pattern:
// (:User {id:"u1"})-[:KNOWS {fact:"lives in London", validFrom: 2025-01, validUntil: 2026-03}]->(:City {label:"London"})
// (:User {id:"u1"})-[:KNOWS {fact:"lives in Tokyo", validFrom: 2026-03, validUntil: null}]->(:City {label:"Tokyo"})
```

---

## 12. Monad Integration Architecture

### 12.1 Why Monad

Monad's 10,000 TPS throughput and EVM compatibility are architecturally necessary, not cosmetic:

- **Volume:** A production MNEME deployment with 10,000 active agents writing 50 memories/day = 500,000 attestations/day. At Ethereum mainnet gas costs this is economically impossible. On Monad, at $0.001 per attestation, it's $500/day across all users — manageable.
- **Speed:** Sub-second finality enables real-time compliance verification. An agent decision can have an on-chain proof within 1 second.
- **EVM compatibility:** Existing Solidity tooling (Hardhat, Foundry), ethers.js, and MetaMask integrations work without modification.

### 12.2 Smart Contract Architecture

```
contracts/
├── core/
│   ├── VaultRegistry.sol       -- DID → operator mapping, vault lifecycle
│   ├── AttestationAggregator.sol -- Batch attestation storage
│   └── DIDs.sol               -- W3C DID method implementation
├── market/
│   ├── MemoryMarket.sol        -- Pack listing, discovery, purchase
│   ├── RevenueDistributor.sol  -- 80/20 split, withdrawal
│   └── PackProvenance.sol      -- Hash registry for pack integrity
└── compliance/
    └── DeletionProver.sol      -- GDPR tombstone records
```

**VaultRegistry.sol (key functions):**

```solidity
function registerVault(
    string calldata did,
    address operator,
    bytes calldata signature
) external returns (bytes32 vaultId);

function transferOwnership(
    bytes32 vaultId,
    address newOperator,
    bytes calldata currentOpSignature
) external;

function destroyVault(
    bytes32 vaultId,
    bytes calldata operatorSignature
) external;
```

**AttestationAggregator.sol:**

```solidity
function batchAttest(
    bytes32[] calldata vaultIds,
    bytes32[] calldata contentHashes,
    bytes32[] calldata stateHashes,
    uint8[] calldata operationTypes,
    uint256[] calldata timestamps
) external returns (uint256 batchId);

function verify(
    bytes32 vaultId,
    bytes32 contentHash
) external view returns (bool exists, uint256 blockNumber);
```

### 12.3 DID Method Specification: `did:monad`

```
did:monad:<networkId>:<vaultAddress>

Example: did:monad:mainnet:0x742d35Cc6634C0532925a3b8D4C9D2bc1234abcd
```

Resolution: DID Document stored in VaultRegistry contract, retrievable via universal resolver.

DID Document includes:

- `verificationMethod`: operator public keys
- `service`: MNEME vault API endpoint
- `controller`: operator address

### 12.4 Attestation Batching Service

```typescript
class AttestationBatcher {
  private queue: Attestation[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 10_000;

  async add(attestation: Attestation): Promise<string> {
    this.queue.push(attestation);
    if (this.queue.length >= this.BATCH_SIZE) {
      await this.flush();
    }
    // Return content hash immediately; tx hash available after confirmation
    return attestation.contentHash;
  }

  private async flush(): Promise<void> {
    const batch = this.queue.splice(0, this.BATCH_SIZE);
    const txHash = await monadContract.batchAttest(batch);
    await this.updateAttestationRecords(batch, txHash);
  }
}
```

---

## 13. Security Architecture

### 13.1 Threat Model

| Threat                         | Likelihood | Impact   | Mitigation                                                      |
| ------------------------------ | ---------- | -------- | --------------------------------------------------------------- |
| Operator key compromise        | Medium     | Critical | Key never touches servers; HSM support for enterprise           |
| Memory content breach          | Low        | High     | AES-256-GCM encryption; zero-knowledge to platform              |
| PII leak in memory market pack | Medium     | High     | Multi-layer PII scan + anonymisation pipeline                   |
| Smart contract exploit         | Low        | Critical | Formal verification; multi-sig on contract upgrades; bug bounty |
| Monad RPC failure              | Medium     | Medium   | Multi-provider fallback; offline queue with retry               |
| DDoS on API                    | Medium     | Medium   | Kong rate limiting; Cloudflare WAF                              |
| Insider access to memories     | Low        | Critical | Encrypted content; keys never server-side                       |

### 13.2 Encryption Architecture

```
Operator generates key pair (client-side, never transmitted)
│
├── Public key → registered on Monad DID
└── Private key → used to sign vault operations

Memory content encryption:
  plaintext → AES-256-GCM (key derived from operator key + vault ID) → stored

MNEME servers store: encrypted ciphertext + IV only
MNEME cannot decrypt: operator key never transmitted
```

### 13.3 Compliance Proofs

For compliance reports that need to prove memory state without revealing content:

- System: SHA-256 cryptographically secure hashing
- Process: "Agent vault contained memory matching hash H at timestamp T"
- Verifiable by regulator without accessing content (compare with on-chain hashes)
- Implementation: Standard Node.js crypto primitives

### 13.4 API Security

- Authentication: API key (REST) + OAuth 2.1 (MCP)
- All API keys hashed (SHA-256) in database — plaintext never stored
- Rate limiting: 1,000 req/min (free), 10,000 req/min (pro), custom (enterprise)
- All write operations require operator signature verification
- Vault operations: operator signature checked against on-chain DID

---

## 14. Testing Strategy

### 14.1 Test Pyramid

```
                    ┌─────┐
                    │ E2E │  5% — Critical user journeys
                   ┌┴─────┴┐
                   │Integr.│  25% — Service boundaries, DB, Monad
                  ┌┴───────┴┐
                  │  Unit   │  70% — Business logic, algorithms
                  └─────────┘
```

### 14.2 Unit Tests

**Memory Extraction Service:**

- Fact extraction accuracy on benchmark dataset (target: >85% precision)
- Temporal supersession logic (contradicting facts handled correctly)
- PII detection coverage (GDPR test dataset)

**Attestation Service:**

- Hash consistency (same content → same hash)
- Batch aggregation correctness
- Monad RPC failure handling (queue, retry, no loss)

**Smart Contracts (Foundry):**

- VaultRegistry: ownership transfer, destruction
- AttestationAggregator: batch correctness, verification
- MemoryMarket: listing, purchase, revenue distribution

### 14.3 Integration Tests

- Full memory write → on-chain attestation → retrieval cycle
- Cross-model memory access (Claude write → GPT read)
- Memory export → re-import cycle (lossless)
- Market pack creation → purchase → ingest cycle
- GDPR deletion → tombstone → verification

### 14.4 Performance Tests (k6)

- 1,000 concurrent memory writes: p95 <100ms
- 500 concurrent semantic searches: p95 <200ms
- 10K attestation batch submission
- Memory pack ingest: 100K memories in <10 minutes

### 14.5 Monad Testnet Testing

All smart contract interactions tested on Monad Devnet before mainnet:

- Gas estimation for all contract functions
- Batch attestation under load
- Market contract edge cases (purchase race conditions, refunds)

---

## 15. Deployment Architecture

### 15.1 Environment Strategy

```
Development → Staging → Production
    │             │           │
Monad         Monad       Monad
Devnet        Testnet     Mainnet
```

### 15.2 Kubernetes Architecture

```yaml
# Namespace: mneme-prod
Services:
  - mneme-api-gateway      (Kong, 2 replicas)
  - mneme-memory-service   (Node.js, 3-10 replicas, HPA)
  - mneme-extraction-service (Python, 2-5 replicas, HPA)
  - mneme-attestation-service (Node.js, 2 replicas)
  - mneme-market-service   (Node.js, 2-4 replicas, HPA)
  - mneme-mcp-server       (Node.js, 3-10 replicas, HPA)

Databases:
  - PostgreSQL (RDS, Multi-AZ)
  - Neo4j (self-managed, 3-node cluster)
  - Redis (ElastiCache, 2-node)
  - S3 (regional bucket)

Networking:
  - ALB → Kong → Services
  - Private subnets for all databases
  - VPC peering for Monad RPC (dedicated node)
```

### 15.3 Multi-Region Strategy

- Primary: AWS ap-south-1 (Mumbai) — serves India market
- Secondary: AWS eu-west-1 (Ireland) — EU data residency
- Tertiary: AWS us-east-1 — US market
- Global: CloudFront CDN for dashboard static assets
- Monad: Dedicated full node per region for RPC reliability

---

## 16. Monitoring & Observability

### 16.1 Key Metrics Dashboard

**Business Metrics:**

- Active agent vaults (DAU/MAU)
- Memory writes per day
- On-chain attestations per day
- Memory Market GMV (daily, weekly, monthly)
- MCP connection events by model type

**Technical Metrics:**

- Memory write latency (p50/p95/p99)
- Memory retrieval latency (p50/p95/p99)
- Monad RPC latency and confirmation times
- Attestation batch queue depth
- API error rate by endpoint

**Business Health:**

- Vault churn rate
- Memory Pack listing rate
- Pack purchase conversion rate
- Model distribution (Claude vs GPT vs others)

### 16.2 Alerting Rules

| Alert                            | Threshold        | Severity |
| -------------------------------- | ---------------- | -------- |
| Memory write latency p95 > 500ms | 5 min sustained  | P1       |
| Monad RPC unavailable            | >30 seconds      | P1       |
| Attestation queue depth > 10K    | 10 min sustained | P2       |
| API error rate > 1%              | 5 min sustained  | P2       |
| PII scan failure                 | Any              | P1       |
| Smart contract event anomaly     | Any              | P1       |

---

## 17. Risk Analysis

### 17.1 Technical Risks

**Risk T1: Monad network instability**  
Probability: Medium | Impact: High  
Mitigation: Multi-RPC provider failover; offline attestation queue (memories stored, attestations retried); circuit breaker pattern

**Risk T2: PII leak in Memory Market**  
Probability: Medium | Impact: Critical  
Mitigation: Multi-layer PII scanning (NER + regex + LLM-based); manual review for packs >10K interactions; seller liability terms; legal review before market launch

**Risk T3: Smart contract exploit**  
Probability: Low | Impact: Critical  
Mitigation: Formal verification (Certora); third-party audit before mainnet; multi-sig on all admin functions; upgrade delay (48-hour timelock)

### 17.2 Market Risks

**Risk M1: Model providers build native portable memory**  
Probability: Low (incentive misalignment) | Impact: High  
Mitigation: Moat is structural (providers are incentivised against portability); focus on enterprise compliance use case which providers can't own

**Risk M2: Memory Market supply-side cold start**  
Probability: High | Impact: Medium  
Mitigation: Seed market with MNEME team's own agents; partner with top Letta/Mem0 operators; incentive program for first 100 pack listings

**Risk M3: GDPR classification of memory content**  
Probability: Medium | Impact: High  
Mitigation: Privacy-by-design from day one; legal counsel engaged before EU launch; conservative data minimisation defaults

### 17.3 Competitive Risks

**Risk C1: Mem0 adds portability features**  
Probability: Low (incentive misalignment) | Impact: Medium  
Mitigation: On-chain provenance and Memory Market are not replicable by a VC-backed cloud business without destroying their lock-in revenue model

**Risk C2: OpenAI/Anthropic block MNEME MCP access**  
Probability: Low | Impact: High  
Mitigation: MCP is an open standard now adopted by Linux Foundation (AAIF, Dec 2025); blocking MNEME would require violating open-standard commitments

---

## 18. Phase-Wise Development Roadmap

### Phase 0: Foundation (Weeks 1–4)

**Goal:** Codebase scaffold, infrastructure, team alignment

Deliverables:

- Monorepo setup (Turborepo): `/apps/api`, `/apps/mcp`, `/apps/web`, `/packages/sdk`, `/contracts`
- CI/CD pipeline (GitHub Actions): lint, test, build, deploy to staging
- Monad Devnet connection: wallet setup, first test transaction
- PostgreSQL + Redis + Neo4j on Docker Compose for local dev
- Architecture review and team sign-off on all decisions

Exit Criteria: Local dev environment boots in <5 minutes. Hello World on Monad Devnet.

---

### Phase 1: Core Vault MVP (Weeks 5–10)

**Goal:** Working sovereign vault with MCP server

Deliverables:

- `VaultRegistry.sol` deployed to Monad Devnet
- Memory write/read/delete API (episodic tier only)
- AES-256-GCM encryption with operator-side keys
- Attestation service: hash generation + Monad batch submission
- MCP server: `memory_write`, `memory_recall`, `memory_forget` tools
- Basic dashboard: vault creation, memory browser
- SDK: TypeScript + Python

Exit Criteria: Claude agent writes memory, switches to GPT via same MCP endpoint, GPT retrieves memory correctly. Attestation visible on Monad explorer.

---

### Phase 2: Semantic Intelligence (Weeks 11–16)

**Goal:** Temporal knowledge graph + cross-model portability demo

Deliverables:

- Python extraction service: LLM-based fact extraction pipeline
- Neo4j integration: entity-relationship graph with temporal validity windows
- Temporal query API: `memory_inspect` at historical timestamp
- `memory_recall` enhanced with graph traversal + semantic search hybrid
- Import from Mem0, Zep formats (migration tool)
- MCP server: `memory_inspect`, `memory_export` tools
- Dashboard: knowledge graph visualisation

Exit Criteria: Temporal query demo: "What did the agent know about [entity] on [date]?" returns accurate result. Migration from Mem0 works for real user vault.

---

### Phase 3: Memory Market Alpha (Weeks 17–22)

**Goal:** First Memory Market transactions on testnet

Deliverables:

- `MemoryMarket.sol` + `RevenueDistributor.sol` deployed to Monad Testnet
- Anonymisation pipeline: NER-based PII scan + differential privacy
- Pack creation UI: date range selector, domain tag, PII report viewer
- Marketplace UI: browse, filter, sample query, purchase
- Pack ingest API: merge purchased pack into target vault
- Smart contract audit (external, pre-mainnet)

Exit Criteria: Complete end-to-end: operator creates pack → listed → another operator purchases → ingested into new vault → Monad transaction confirmed for both listing and purchase.

---

### Phase 4: Enterprise & Compliance (Weeks 23–28)

**Goal:** Enterprise-ready compliance features

Deliverables:

- Cryptographic hashing (SHA-256) for compliance reports
- `DeletionProver.sol` for GDPR tombstones
- Compliance Report PDF generator
- Enterprise SSO (SAML/OIDC)
- Data residency configuration (EU/US/IN)
- SOC2 audit logging
- Enterprise dashboard with compliance panel
- SLA documentation + enterprise onboarding guide

Exit Criteria: Compliance officer persona can generate audit report → verify against Monad explorer → download PDF with hash proof → submit to regulator.

---

### Phase 5: Production Hardening & Launch (Weeks 29–34)

**Goal:** Production-grade, publicly launched

Deliverables:

- Load testing: 10K concurrent agents
- Smart contract mainnet deployment (Monad Mainnet)
- Security audit (trails, penetration test)
- Bug bounty program launch (Immunefi)
- Documentation: full API docs, SDK guides, integration tutorials
- Marketing: technical blog, demo video, developer community launch
- Pricing pages live
- Public launch

Exit Criteria: 100 agent vaults live on mainnet. First real Memory Market transaction. Zero P1 incidents in first week.

---

### Phase 6: Growth & Ecosystem (Weeks 35–52)

**Goal:** Network effects, ecosystem partnerships

Deliverables:

- Native integrations: LangGraph plugin, CrewAI plugin, AutoGen plugin
- Memory Market: mobile-optimised marketplace
- Agent analytics: memory usage patterns, retrieval quality scores
- Cross-vault shared memory (team/org namespace)
- MNEME SDK v2: streaming memory, real-time sync
- Developer grants program
- First enterprise customer pilots

---

## 19. Success Metrics & KPIs

### 19.1 Phase 1 Metrics (End of Week 10)

- [ ] 50 agent vaults created by beta testers
- [ ] 10,000 memory writes processed
- [ ] 1,000 on-chain attestations confirmed on Monad Devnet
- [ ] Cross-model demo reproduced by 10 external developers without help
- [ ] SDK installs: 200+

### 19.2 Phase 3 Metrics (End of Week 22)

- [ ] 500 active vaults
- [ ] 10 Memory Packs listed
- [ ] First Memory Market transaction on testnet
- [ ] Migration tool: 50 agents successfully migrated from Mem0
- [ ] LongMemEval benchmark: MNEME scores >75% (target: beat Mem0's 49%)

### 19.3 6-Month Metrics (End of Week 26)

- [ ] 1,000 active agent vaults
- [ ] 500,000 on-chain attestations (Monad Mainnet)
- [ ] 50 Memory Packs listed
- [ ] $5,000 Memory Market GMV
- [ ] 3 enterprise pilots in LOI/contract stage
- [ ] Developer NPS: >50

### 19.4 12-Month Metrics

- [ ] 10,000 active agent vaults
- [ ] 5M+ on-chain attestations
- [ ] $50,000 monthly Memory Market GMV
- [ ] 5 enterprise customers paying
- [ ] 3 major agent framework native integrations (LangGraph, CrewAI, AutoGen)
- [ ] MRR: $30,000+

### 19.5 North Star Metric

**Active Agent Vaults** — Vaults with at least one memory write in the last 30 days.

This single metric captures product-market fit better than any other: it requires that developers have integrated MNEME, found it valuable enough to keep using, and are running agents against it regularly. Everything else (market GMV, attestations, enterprise revenue) is downstream.

---

## 20. Architecture & Flow Diagrams

### 20.1 System Architecture Diagram

_(See: `docs/diagrams/system-architecture.mermaid`)_

### 20.2 Memory Write Sequence Diagram

```
Agent        MCP Server   Memory Svc   Extraction   Monad
  │               │            │          Svc          │
  │─memory_write─▶│            │                       │
  │               │──POST /────▶│                       │
  │               │            │──encrypt──▶ DB        │
  │               │            │──hash────▶ Attester   │
  │               │◀──200 OK───│                       │
  │◀──ack─────────│            │                       │
  │               │            │──async extract──▶     │
  │               │            │         (graph update)│
  │               │            │                       │
  │               │            │──batch──────────────▶ │
  │               │            │         (Monad attest)│
  │               │            │◀──txHash─────────────│
```

### 20.3 Cross-Model Portability Flow

```
Step 1: Claude writes memory
Claude ──memory_write──▶ MNEME MCP Server ──▶ Vault (encrypted)
                                           └──▶ Monad (fingerprint)

Step 2: Operator switches model config (MCP endpoint unchanged)

Step 3: GPT recalls memory
GPT ──memory_recall──▶ MNEME MCP Server ──▶ Vault (decrypted, re-embedded)
                                        └──▶ Returns same memories
```

### 20.4 Memory Market Flow

```
Seller Operator                  MNEME                  Buyer Operator
      │                            │                          │
      │──create_pack(dateRange)───▶│                          │
      │                            │──PII scan──▶             │
      │                            │──anonymise──▶            │
      │                            │──hash──▶ Monad           │
      │◀──pack_id + anon_report────│                          │
      │──list(pack_id, price)─────▶│                          │
      │                            │──MemoryMarket.list()──▶  │
      │                            │                 Monad    │
      │                            │◀──tx confirmed───────────│
      │                            │                          │
      │                            │◀──browse/search──────────│
      │                            │──sample_query──▶         │
      │                            │◀──results────────────────│
      │                            │◀──purchase(packId)───────│
      │                            │──USDC transfer─▶ Monad   │
      │                            │──80% to seller──▶ Monad  │
      │                            │◀──tx confirmed───────────│
      │                            │──ingest(vault)───────────│
```

### 20.5 ER Diagram Summary

```
vaults ──< memories
       ──< attestations
       ──< memory_packs (as seller)
       ──< pack_purchases (as buyer)
       ──< compliance_reports

memory_packs ──< pack_purchases
             ──< memories (provenance link)
```

---

## Appendix A: Open Questions

1. **DID Method standardisation:** Should `did:monad` be submitted to the W3C DID registry? (Recommend: yes, in Phase 4)
2. **Memory Market pricing:** Fixed price or auction model? (Recommend: fixed price in alpha, auction in v2)
3. **Extraction LLM choice:** Use operator's model or MNEME's own? Privacy vs cost tradeoff. (Recommend: operator's model in enterprise, MNEME's in free tier)
4. **Cross-chain aspirations:** Other EVM chains beyond Monad? (Recommend: Monad-only through Phase 5; cross-chain in Year 2)

## Appendix B: Glossary

| Term                  | Definition                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| DID                   | Decentralised Identifier (W3C standard) — a globally unique identifier for an agent, not controlled by any central authority |
| Attestation           | A cryptographic fingerprint of a memory operation, anchored on Monad blockchain                                              |
| Memory Pack           | An anonymised, marketable snapshot of an agent's accumulated domain knowledge                                                |
| MCP                   | Model Context Protocol — open standard for tool integration with LLMs                                                        |
| Vault State Hash      | A Merkle root of all current memories in a vault — a single hash proving the complete memory state                           |
| Temporal Supersession | When a new fact contradicts an old one, the old fact's validity window is closed                                             |
| PII                   | Personally Identifiable Information — must be removed before any memory pack is listed                                       |
| Provenance            | Proof that a memory pack was derived from real agent interactions, not synthetically generated                               |
| Sovereign             | Owned and controlled by the operator, with no dependency on any platform or vendor                                           |

---

_Document maintained by MNEME Product Team. Last updated: July 2026._  
_Next review: October 2026 (post-Phase 2 completion)._
