# MNEME — Master Product Requirements Document
## Context-Aware Memory Router for AI Agents

**Version:** 2.0.0
**Date:** July 2026
**Status:** Implementation-Ready
**Authors:** Hassan Rehman, Mrunmayee Daware, Tanishq Mhetras

---

## Table of Contents

1. [What We Are Actually Building](#1-what-we-are-actually-building)
2. [The Problem, Precisely Stated](#2-the-problem-precisely-stated)
3. [Competitive Landscape & Where We Win](#3-competitive-landscape--where-we-win)
4. [Google Knowledge Catalog — Fit Assessment](#4-google-knowledge-catalog--fit-assessment)
5. [Core Architecture](#5-core-architecture)
6. [The Memory Pipeline — How It Works](#6-the-memory-pipeline--how-it-works)
7. [Integration Surface Area](#7-integration-surface-area)
8. [Design System](#8-design-system)
9. [API Design](#9-api-design)
10. [Database Schema](#10-database-schema)
11. [Monad Integration](#11-monad-integration)
12. [Functional Requirements](#12-functional-requirements)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Development Plan](#14-development-plan)
15. [Success Metrics](#15-success-metrics)
16. [Risk Analysis](#16-risk-analysis)

---

## 1. What We Are Actually Building

MNEME is a **context-aware memory router** for AI agents. Not a memory database. Not a memory library. A router.

The distinction matters. A database stores and retrieves. A router classifies what comes in, decides where it goes, decides what comes back out, and enforces constraints on how much comes back. MNEME does all four.

**The one-sentence pitch:**

> MNEME gives AI agents human-like memory — classifying what to remember, routing it to the right store, and injecting only what is relevant to this turn at a token budget the agent controls — without routing your traffic through someone else's proxy.

**What makes it different from every competitor:**

MNEME is the only memory system that eliminates semantic distractors *before* injection, not after. Every competitor retrieves by similarity score and hands back everything above a threshold. MNEME runs a two-stage pipeline: stage one ranks by composite score (semantic similarity + recency + importance + type match), stage two filters by task-contextual fit — removing memories that are topically related but contextually wrong for the current task. The research is clear that semantically similar but contextually wrong memories cause *more* damage than irrelevant ones. No competitor has built a production system that treats this as the primary design constraint.

---

## 2. The Problem, Precisely Stated

### 2.1 Context Rot Is Measurable and Architectural

Chroma's 2025 research (confirmed across 18 frontier models including GPT-4.1, Claude Opus 4, Gemini 2.5) proved the following:

- Performance degrades non-uniformly as input length grows — not gradually, in cliffs
- Semantically similar distractors hurt *more* than unrelated content
- Coherent, well-structured input degrades attention more than shuffled input
- The danger of a token is its confusability with the answer, not its mere presence

This means the correct mental model for the problem is not "how do I find the right memories?" It is "how do I guarantee the wrong memories never reach the context window?"

Filling a 1M token window does not give 1M-token quality. The signal-to-noise ratio is the variable that determines performance — and every token injected into context is either signal or a potential distractor.

### 2.2 The Three Failure Modes Agents Hit Today

**Failure 1: Retrieval over-injection.** When you retrieve by similarity alone with a loose threshold, everything looks somewhat similar to everything else. The agent gets memories from a billing session when it's mid-way through a debugging session. Those memories aren't wrong — they're just irrelevant. Irrelevant context is not neutral. It dilutes attention and biases the agent toward patterns from past sessions that don't apply.

**Failure 2: Type collapse.** Every existing system collapses episodic events, semantic facts, and procedural rules into one retrieval pool and queries them with the same embedding search. The retrieval strategy that works for semantic facts (similarity-dominant) is actively wrong for episodic records (recency-dominant) and wrong for procedural rules (pattern-match dominant). One vector store, one retrieval strategy — wrong for two of the three memory types.

**Failure 3: No token budget.** Memory systems return a blob. The agent framework decides how much to inject. Nobody enforces a budget at the memory layer itself. The caller has no way to say "give me the best 2,000 tokens of memory for this turn" and get a ranked, deduplicated, budget-fitted result.

### 2.3 The Gap Nobody Has Closed

The market has solved retrieval precision. Mem0, Hindsight, Zep all retrieve reasonably relevant memories. Nobody has solved:

1. **Distractor elimination** — removing contextually wrong but topically similar memories before injection
2. **Typed routing** — routing memory to stores with appropriate retrieval semantics per type
3. **Token budget enforcement** — treating memory injection as a knapsack problem with a relevance constraint, not a list

All three together, behind a model-agnostic interface, is MNEME.

---

## 3. Competitive Landscape & Where We Win

### 3.1 Competitor Summary

| System | LongMemEval | Tokens/Retrieval | Distractor Filter | Typed Routing | Token Budget | Portability | Self-Host |
|--------|-------------|------------------|-------------------|---------------|--------------|-------------|-----------|
| Mem0 (2026) | 94.4% | ~7K | No | No | No | No | No (cloud) |
| MemPalace | 96.6% | 170 (cold) | No | No | No | No (local only) | Yes |
| Hindsight | 91.4% | Unknown | No (4-network separation, not filtering) | Partial | Partial (TEMPR) | No | No |
| Zep/Graphiti | 63.8% | Low | No | No | No | No | Partial |
| Supermemory | 81.6%* | Unknown | No | No | No | No | Enterprise only |
| Letta | No benchmark | Medium | No | No | No | No (runtime lock-in) | Yes |
| Cognee | No benchmark | Medium | No | No | No | No | Yes |
| **MNEME** | **Target: >90%** | **<5K** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |

*Self-reported, not independently verified.

### 3.2 Specific Attack on Each Competitor's Weakness

**Against Mem0:** They're cloud-first, zero portability, graph features paywalled at $249/mo. MNEME is self-hostable, open, and graph traversal is not paywalled.

**Against Supermemory:** Their proxy-first architecture means every LLM call routes through their servers. Their March 2026 incident showed what happens: queries that ran on every authenticated request consumed 95% of database runtime, adding 10+ seconds to every agent call. MNEME's MCP approach fetches memory only when needed — the LLM call goes directly to the model, MNEME's availability doesn't gate every interaction.

**Against Hindsight:** Closest competitor on architecture. Their TEMPR token budget system is real. But Hindsight is not plug-in infrastructure — you adopt their system, not a library. No MCP server. No self-host without enterprise agreement. MNEME wraps the same architectural principles into a five-tool MCP server any agent can use.

**Against Letta:** You adopt a runtime, not a memory layer. High switching cost. No distractor filtering. No token budget.

### 3.3 The Defensible Triple

The combination nobody has shipped:
- **Write-time classification** routes to type-appropriate stores
- **Two-stage retrieval** ranks then filters distractors
- **Caller-controlled token budget** returns a budget-fitted knapsack

Any single one is replicable. All three together in a self-hostable, MCP-native package is the moat.

---

## 4. Google Knowledge Catalog — Fit Assessment

### 4.1 What It Is

Google Knowledge Catalog (launched April 2026) is the evolution of Dataplex into a context engine for enterprise data. It aggregates metadata from BigQuery, AlloyDB, SAP, Salesforce, Workday, Palantir, ServiceNow — generates enriched semantic metadata using Gemini — and exposes high-precision hybrid search for AI agents to retrieve enterprise context.

### 4.2 Does It Fit MNEME?

**No — and this is not a weakness.**

Knowledge Catalog solves enterprise *data* context: what does a column in BigQuery mean, what business logic governs this metric, what SQL pattern is verified for this domain. It is a metadata catalog for structured enterprise data assets, not an agent memory system.

MNEME solves *agent behavioral* memory: what did this agent learn from past interactions, what does it know about a user, what procedural rules has it accumulated, what happened in session three weeks ago. These are different problems with different storage semantics, different retrieval strategies, and different access patterns.

**Where they could coexist:** An enterprise agent running on Google Cloud could use Knowledge Catalog for structured data context (what does "revenue" mean in our org) and MNEME for behavioral memory (this user prefers concise responses, this agent has learned to escalate threshold X). The two are additive, not competitive.

**Decision: Do not integrate with Google Knowledge Catalog.** It is not a memory system. It is a metadata catalog for enterprise data products. Claiming integration would be inaccurate and would dilute MNEME's positioning. If an enterprise customer asks, the correct answer is: "use both — they solve different things."

---

## 5. Core Architecture

### 5.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATION SURFACE                            │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  MCP Server  │  │  REST API    │  │  SDK         │  │  Plugin    │  │
│  │  (agents,    │  │  (direct     │  │  (TS/Python) │  │  Layer     │  │
│  │  IDEs, CLI)  │  │  integration)│  │              │  │  (see §7)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         └─────────────────┴──────────────────┴────────────────┘         │
│                                     │                                   │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                           MNEME CORE ENGINE                             │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    WRITE PATH                                     │   │
│  │                                                                   │   │
│  │  Raw Input ──► Classifier ──► Router ──► Type-Appropriate Store  │   │
│  │                    │                                              │   │
│  │              [episodic/semantic/                                  │   │
│  │               procedural/working]                                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    READ PATH                                      │   │
│  │                                                                   │   │
│  │  Query + Task Scope + Budget                                      │   │
│  │      │                                                            │   │
│  │      ▼                                                            │   │
│  │  Stage 1: Composite Score Ranking                                 │   │
│  │    (semantic_sim × 0.4 + recency × 0.3 +                         │   │
│  │     importance × 0.2 + type_match × 0.1)                         │   │
│  │      │                                                            │   │
│  │      ▼                                                            │   │
│  │  Stage 2: Distractor Filter                                       │   │
│  │    (remove: high similarity, low task-contextual fit)             │   │
│  │      │                                                            │   │
│  │      ▼                                                            │   │
│  │  Stage 3: Token Budget Knapsack                                   │   │
│  │    (return highest-value set that fits budget B)                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                           STORAGE LAYER                                 │
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │
│  │  Redis     │  │ PostgreSQL │  │  Neo4j     │  │  S3 / MinIO    │    │
│  │  Working   │  │ +pgvector  │  │  Temporal  │  │  Archival      │    │
│  │  Memory    │  │ Episodic + │  │  Knowledge │  │  Logs          │    │
│  │  <1ms      │  │ Semantic   │  │  Graph     │  │                │    │
│  │            │  │ ~10ms      │  │  ~50ms     │  │                │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────▼───────────────────────────────────┐
│                         MONAD L1 (MINIMAL)                              │
│                                                                         │
│  VaultRegistry.sol          AttestationAggregator.sol                  │
│  (operator ownership)       (write fingerprints, batched)              │
│                                                                         │
│  DeletionProver.sol         ← The clearest demo differentiator         │
│  (GDPR tombstones)            "prove deletion without exposing PII"     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Memory Type Taxonomy

This is the classifier schema. Every piece of incoming context is assigned exactly one type at write time. The type determines which store receives it and which retrieval strategy applies.

| Type | Definition | Store | Retrieval Strategy | TTL |
|------|-----------|-------|-------------------|-----|
| **working** | Current session state, in-progress scratchpad | Redis | Exact / recency | Session |
| **episodic** | Timestamped events, decisions, interactions | PostgreSQL + pgvector | Recency-dominant composite | Configurable |
| **semantic** | Extracted facts about entities, user properties, world knowledge | PostgreSQL + pgvector | Similarity-dominant composite | Long-lived |
| **procedural** | Learned workflows, behavioral rules, preferences | PostgreSQL (structured) | Pattern match + similarity | Long-lived |
| **relational** | Entity-to-entity relationships with temporal validity | Neo4j | Graph traversal | Temporal |

**Why this matters operationally:** Querying "what did we decide about the auth service two weeks ago" against a flat vector store will return the most semantically similar memory regardless of when it happened. That's wrong — it should be recency-dominant with a semantic filter. MNEME routes the query to the episodic store with the right scoring function applied.

### 5.3 The Two-Stage Retrieval Pipeline

**Stage 1 — Composite Score Ranking**

Based on the Stanford Generative Agents formula, extended for task-type weighting:

```
score(m, q, task) =
  semantic_similarity(m, q)    × w_sem(task)   +
  recency_score(m)             × w_rec(task)   +
  importance_score(m)          × w_imp(task)   +
  type_match(m.type, task)     × 0.1
```

Weights are task-type dependent:

| Task type | w_sem | w_rec | w_imp |
|-----------|-------|-------|-------|
| fact_lookup | 0.6 | 0.1 | 0.2 |
| episodic_recall | 0.3 | 0.5 | 0.1 |
| procedural_lookup | 0.5 | 0.1 | 0.3 |
| general | 0.4 | 0.3 | 0.2 |

**Stage 2 — Distractor Filter**

Remove candidates where:
- `semantic_similarity(m, q) > 0.65` AND `task_contextual_fit(m, current_task_scope) < 0.4`

This catches the exact failure mode the research identified: topically related but contextually wrong memories that score well on similarity but belong to a different task domain. The thresholds are configurable per vault.

**Stage 3 — Token Budget Knapsack**

Given budget B (tokens), return the subset S of remaining candidates that maximises `sum(score(m))` subject to `sum(token_count(m)) ≤ B`.

For small k (typically top 20 candidates after stages 1 and 2), greedy selection by score/token ratio is near-optimal and runs in microseconds.

### 5.4 Token Budget Allocation Model

Following the RCR-Router research, the recommended budget split for callers:

```
Total context budget: 100%
├── Knowledge context (retrieved memories):   30–40%
├── History context (recent turns):           20–30%
├── System prompt / instructions:             20–25%
└── Buffer reserve:                           10–15%
```

MNEME exposes `budget_tokens` as a first-class parameter. The caller sets it. MNEME fills it optimally.

---

## 6. The Memory Pipeline — How It Works

### 6.1 Write Path (Full Sequence)

```
1. Agent sends memory_write(content, hint_type?, tags?, importance?)
       │
2. Classifier runs
   ├── If hint_type provided: use as strong prior, validate fit
   └── If no hint: classify from content using lightweight model
       (spaCy NER + rule-based patterns + small LLM call async)
       │
3. Router assigns type → target store
       │
4. Synchronous write:
   ├── Encrypt content (AES-256-GCM, operator key)
   ├── Generate embedding (async, non-blocking on write ack)
   ├── Write to primary store (Redis / PostgreSQL / Neo4j)
   └── Return { memoryId, type, contentHash } immediately
       │
5. Async background:
   ├── Complete embedding if not done
   ├── Run entity extraction (spaCy NER) → Neo4j graph update
   ├── Check for semantic conflicts (contradicting facts)
   │   └── If conflict: close validity window on old fact, insert new
   └── Queue attestation batch → Monad (every 10s or 100 items)
```

**Key design principle:** Write never blocks on embedding or extraction. The agent gets an ack within 50ms. Everything else is async.

### 6.2 Read Path (Full Sequence)

```
1. Agent sends memory_recall(query, task_scope?, budget_tokens?, types[]?)
       │
2. Query preprocessing:
   ├── Embed query
   ├── Detect task_scope if not provided (infer from query embedding)
   └── Set budget_tokens default (1500) if not provided
       │
3. Stage 1 — Composite score ranking:
   ├── Semantic similarity search (pgvector ANN, top 50 candidates)
   ├── Apply type filter if types[] specified
   ├── Score each: semantic × w_sem + recency × w_rec + importance × w_imp + type_match × 0.1
   └── Sort descending → top 20
       │
4. Stage 2 — Distractor filter:
   ├── For each candidate: compute task_contextual_fit(m, task_scope)
   └── Remove: similarity > 0.65 AND contextual_fit < 0.4
       │
5. Stage 3 — Token budget knapsack:
   ├── Greedy select by score/token_count ratio
   └── Stop when budget_tokens reached
       │
6. Format and return:
   └── { memories[], total_tokens_used, budget_tokens, filtered_count }
```

### 6.3 Temporal Inspect Path

```
memory_inspect(timestamp, query?)
       │
├── PostgreSQL: WHERE valid_from <= timestamp AND (valid_until IS NULL OR valid_until > timestamp)
└── Neo4j: traverse KNOWS edges where validFrom <= timestamp AND (validUntil IS NULL OR validUntil > timestamp)
```

This is "what did this agent know at time T?" — the compliance use case. No reconstruction, just validity window traversal.

### 6.4 Deletion Path (GDPR)

```
memory_forget(memoryId | userIdentifier, gdpr_basis?)
       │
1. Off-chain: DELETE rows from PostgreSQL, flush Redis keys
2. Generate tombstoneHash = SHA-256(memoryIds + deletedAt + operatorAddress)
3. DeletionProver.sol.proveDeletion(tombstoneHash, deletedHashes[], gdprBasis)
4. Return { tombstoneHash, monadTxHash, deletedCount, onChainProof }
```

An auditor calls `DeletionProver.verifyDeletion(tombstoneHash)` → `true`. Zero PII ever hits the chain.

---

## 7. Integration Surface Area

This is the most important section for adoption. MCP alone is not enough — it requires a desktop/CLI client. MNEME needs to work everywhere agents run.

### 7.1 Integration Tier Map

```
Tier 1: MCP Server       → Claude Desktop, Cursor, Windsurf, VS Code/Cline,
                            ChatGPT (MCP support), Gemini CLI, Zed, Continue
                            — works out of the box for all serious dev environments

Tier 2: REST API         → Any agent built on LangGraph, CrewAI, AutoGen,
                            LlamaIndex, custom stacks — direct HTTP calls

Tier 3: SDK              → TypeScript + Python libraries wrapping the REST API
                            — for builders who want type-safe integration

Tier 4: App Connector    → For AI consumer apps (ChatGPT web, Gemini web,
                            Claude.ai web, Perplexity) that don't support MCP
                            — needs a different approach (see §7.5)

Tier 5: Framework Plugin → Native plugins for LangGraph, CrewAI, AutoGen
                            — drop-in memory backend with zero agent code change
```

### 7.2 MCP Server (Tier 1)

Five tools. No more.

```typescript
// Tool 1: memory_write
{
  name: "memory_write",
  description: "Store a memory. MNEME classifies and routes it automatically.",
  inputSchema: {
    content: string,          // required
    hint_type?: "working" | "episodic" | "semantic" | "procedural" | "relational",
    tags?: string[],
    importance?: number,      // 0-1, default 0.5
    session_id?: string
  }
}

// Tool 2: memory_recall
{
  name: "memory_recall",
  description: "Retrieve relevant memories within a token budget. Distractors filtered automatically.",
  inputSchema: {
    query: string,            // required
    budget_tokens?: number,   // default 1500
    task_scope?: string,      // current task context for distractor filtering
    types?: MemoryType[],     // filter by type
    before?: datetime,
    after?: datetime
  }
}

// Tool 3: memory_inspect
{
  name: "memory_inspect",
  description: "Query agent memory state at a historical timestamp.",
  inputSchema: {
    timestamp: datetime,      // required
    query?: string
  }
}

// Tool 4: memory_forget
{
  name: "memory_forget",
  description: "Delete memory with on-chain proof of deletion (GDPR-compliant).",
  inputSchema: {
    memory_ids?: string[],
    user_identifier?: string,
    gdpr_basis?: string
  }
}

// Tool 5: vault_status
{
  name: "vault_status",
  description: "Get vault metadata: memory count by type, last attestation, storage used.",
  inputSchema: {}
}
```

**Setup (under 5 lines of config):**

```json
{
  "mcpServers": {
    "mneme": {
      "command": "npx",
      "args": ["-y", "@mneme/mcp"],
      "env": {
        "MNEME_API_URL": "https://api.mneme.dev/v1",
        "MNEME_API_KEY": "mnk_live_...",
        "MNEME_VAULT_ID": "vlt_..."
      }
    }
  }
}
```

### 7.3 REST API (Tier 2)

Base URL: `https://api.mneme.dev/v1`

```
POST   /vaults                            Create vault
GET    /vaults/{id}                       Vault metadata
DELETE /vaults/{id}                       Destroy vault

POST   /vaults/{id}/memories             Write memory
POST   /vaults/{id}/memories/recall      Retrieve (two-stage pipeline)
GET    /vaults/{id}/memories/{memId}     Single memory
DELETE /vaults/{id}/memories/{memId}     Forget (on-chain proof)
GET    /vaults/{id}/memories/at          Temporal inspect

GET    /vaults/{id}/attestations         On-chain attestation log
GET    /vaults/{id}/audit/log            Full audit trail
POST   /vaults/{id}/compliance/report    Generate compliance report
POST   /vaults/{id}/gdpr/erase          GDPR deletion + tombstone
```

### 7.4 SDK (Tier 3)

**TypeScript:**

```typescript
import { MnemeClient } from '@mneme/sdk';

const mneme = new MnemeClient({ apiKey: '...', vaultId: '...' });

// Write — classifier runs automatically
await mneme.write('User prefers TypeScript strict mode', {
  hintType: 'semantic', importance: 0.8
});

// Recall — distractor filter + token budget applied automatically
const { memories, totalTokensUsed } = await mneme.recall(
  'TypeScript preferences',
  { budgetTokens: 1500, taskScope: 'coding_session' }
);

// Temporal inspect
const snapshot = await mneme.inspect('2026-01-01T00:00:00Z');

// GDPR deletion with on-chain proof
const { tombstoneHash, monadTxHash } = await mneme.forget({ memoryIds: ['...'] });
```

**Python:**

```python
from mneme import MnemeClient

client = MnemeClient(api_key="...", vault_id="...")

# Write
result = client.memories.write(
    content="User prefers TypeScript strict mode",
    hint_type="semantic",
    importance=0.8
)

# Recall
result = client.memories.recall(
    query="TypeScript preferences",
    budget_tokens=1500,
    task_scope="coding_session"
)

# Forget
result = client.memories.forget(user_identifier="user_123", gdpr_basis="Article 17")
```

### 7.5 App Connector / Plugin Layer (Tier 4)

**The problem:** Claude.ai web, ChatGPT web, Gemini web, Perplexity — consumer AI apps that don't support MCP connections, where users interact directly with the app and cannot configure external servers.

**What MCP can't do:** MCP requires a host client (Claude Desktop, Cursor, etc.) that connects to the MCP server and brokers tool calls. The Claude.ai web interface, ChatGPT web, and Gemini web are walled gardens — they expose Custom GPTs, Claude Projects, and Gemini Gems respectively, but not raw MCP server connections (as of mid-2026 for the web/app interfaces).

**The solution: Three mechanisms for App connectivity**

**Mechanism A — System Prompt Injection (works today)**

MNEME generates a snapshot-based system prompt that the user pastes into their Claude Project, Custom GPT, or Gemini Gem. The prompt includes recent memory context as structured text.

```
MNEME Memory Context (generated: 2026-07-16T10:00:00Z)
Vault: vlt_abc123 | Budget used: 1,847 / 2,000 tokens

[SEMANTIC MEMORY]
- User prefers TypeScript strict mode (importance: 0.8, seen: 47 sessions)
- Working on MNEME project, Turborepo monorepo (importance: 0.9)
- Prefers plain language, no em dashes, short paragraphs (importance: 0.95)

[PROCEDURAL MEMORY]
- Always stress-test ideas before supporting them
- Prefers adversarial reviewer mode in technical discussions
```

The MNEME dashboard generates this automatically. One-click copy. Paste into project instructions. Updated on demand or on a schedule.

**Mechanism B — Browser Extension**

A Chrome/Firefox/Edge extension that:
- Detects when you're on Claude.ai, ChatGPT, or Gemini
- Intercepts your message before you send it
- Appends a `[MEMORY CONTEXT]` block to your message with relevant memories fetched from MNEME (using the full two-stage pipeline)
- Strips the memory block from the visible display so it doesn't clutter your conversation view

This is fundamentally different from Supermemory's proxy approach — there is no proxy. The extension injects at the browser level into the user's own input, the LLM call still goes directly to Anthropic/OpenAI/Google with no third-party server in the middle.

```
User types: "Help me with the auth service"

Extension intercepts → fetches recall(query, budget_tokens=800) from MNEME
Extension appends:

[MNEME] auth service context:
- Decided to use JWT + refresh tokens (2026-06-15)
- Auth service is at apps/api/src/auth/, uses Fastify middleware
- Rate limit: 1000 req/min on /login endpoint

Then sends full message to AI
```

**Mechanism C — GPT Action / Gem Function**

For Custom GPTs (OpenAI) and Gemini Gems, MNEME exposes an OpenAPI schema that can be imported as a GPT Action or Gem function. This gives the AI model direct ability to call MNEME's REST API during a conversation.

```yaml
# OpenAPI schema for GPT Action / Gemini Gem
openapi: 3.0.0
info:
  title: MNEME Memory API
  version: 1.0.0
servers:
  - url: https://api.mneme.dev/v1
paths:
  /gpt/recall:
    post:
      operationId: recallMemory
      summary: Retrieve relevant memories for current conversation turn
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                query: { type: string }
                budget_tokens: { type: integer, default: 1000 }
                task_scope: { type: string }
  /gpt/write:
    post:
      operationId: writeMemory
      summary: Store a memory from the current conversation
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                content: { type: string }
                hint_type: { type: string }
```

The user installs this as a GPT Action in their Custom GPT. The model can then call `recallMemory` and `writeMemory` as part of any conversation. No proxy, no URL swap, direct REST.

### 7.6 Framework Plugin (Tier 5)

**LangGraph Plugin:**

```python
from mneme.plugins.langgraph import MnemeMemoryPlugin

# Drop into existing LangGraph agent — no other code change
graph = StateGraph(AgentState)
graph.add_node("agent", agent_node)
graph.add_node("memory", MnemeMemoryPlugin(vault_id="...", budget_tokens=1500))

# Plugin automatically:
# - Writes memories after each agent turn
# - Retrieves relevant memories before each agent turn
# - Applies two-stage filtering + budget enforcement
```

**CrewAI Plugin:**

```python
from mneme.plugins.crewai import MnemeMemory

agent = Agent(
    role="Senior Developer",
    memory=MnemeMemory(vault_id="...", budget_tokens=1500)
    # Replaces CrewAI's built-in memory
)
```

**AutoGen Plugin:**

```python
from mneme.plugins.autogen import MnemeConversableAgent

agent = MnemeConversableAgent(
    name="CodingAgent",
    vault_id="...",
    budget_tokens=1500
)
```

---

## 8. Design System

```
Design System: Content Architecture (alpha)

Colors
─────────────────────────────────────────────
primary:          #171717   near-black ink, buttons, headings
secondary:        #E5E7EB   border neutral, subtle separation
tertiary:         #FF9100   amber accent — use sparingly, emphasis only
surface:          #FFFFFF   page and component background
on-surface:       #171717   readable text on light backgrounds
primary-contrast: #FFFFFF   white text on dark fills
border-subtle:    #00000014 translucent hairline borders
error:            #D92D20   validation, failure states only

Typography
─────────────────────────────────────────────
Font stacks: system-ui, ui-sans-serif (system-native, browser-default feel)

headline-display: system-ui, 24px, 500, lh:32, ls:-0.02em
headline-lg:      ui-sans-serif, 21px, 500, lh:25
headline-md:      ui-sans-serif, 18px, 500, lh:22
headline-sm:      ui-sans-serif, 16px, 500, lh:19
body-lg:          system-ui, 16px, 400, lh:24
body-md:          system-ui, 14px, 400, lh:21    ← default paragraph
body-sm:          system-ui, 12px, 400, lh:18
label-lg:         ui-sans-serif, 16px, 400, lh:19
label-md:         ui-sans-serif, 14px, 400, lh:21
label-sm:         ui-sans-serif, 12px, 500, lh:16, ls:0.04em

Border Radius
─────────────────────────────────────────────
none: 0px   sm: 4px   md: 6px   lg: 8px   xl: 12px   full: 9999px

Spacing
─────────────────────────────────────────────
xs: 12px   sm: 20px   md: 24px   lg: 28px   xl: 32px
gutter: 24px   section: 32px

Components
─────────────────────────────────────────────
button-primary:
  bg: #171717, text: #FFFFFF, radius: 6px, pad: 8px 16px, h: 40px

button-secondary:
  bg: transparent, text: #171717, border: 1px solid #00000014, radius: 6px, h: 40px

button-link:
  bg: transparent, text: #171717, radius: 0, pad: 0

card:
  bg: #FFFFFF, border: 1px solid #E5E7EB, radius: 8px, pad: 16px
  NO shadow — flat, border only

input:
  bg: #FFFFFF, border: 1px solid #E5E7EB, radius: 6px, pad: 8px 12px, h: 40px
  font: body-md

Design Principles
─────────────────────────────────────────────
- Interface is a utility, not a marketing page. No gradients, no shadows, no glows.
- Orange (#FF9100) is the only expressive color. One highlight per screen maximum.
- Whitespace does the work. Content is centered in a narrow column, not stretched.
- Buttons feel compact, native, browser-adjacent. No all-caps, no oversized CTA energy.
- Lists and bullets only when content is genuinely enumerable, not as prose substitute.
- Error state (#D92D20) is reserved — never use for warnings or emphasis.
- Hover/focus states: slightly stronger contrast or thin outline. No motion.

Dashboard Pages
─────────────────────────────────────────────
/dashboard          Overview: vault stats, recent memories, attestation feed
/memories           Memory browser: filter by type, search, view/delete
/compliance         Audit log, deletion proofs, on-chain verification
/market             Memory pack listing/browsing (deferred to Phase 3)
/settings           API keys, vault config, operator key management
/install            Integration guide: MCP, SDK, browser extension, plugins
```

---

## 9. API Design

### 9.1 Standard Response Envelope

```typescript
interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;       // e.g. "VAULT_NOT_FOUND", "BUDGET_EXCEEDED"
    message: string;
    details?: unknown;
  } | null;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
    // Included on all memory operations:
    attestation?: {
      contentHash: string;
      monadTxHash: string | null;   // null if batch pending
      monadBlockNumber: number | null;
    };
  };
}
```

### 9.2 Write Response

```typescript
interface WriteResponse {
  memoryId: string;
  classifiedType: MemoryType;          // what the classifier decided
  hintTypeUsed: boolean;               // whether caller's hint was respected
  contentHash: string;                 // SHA-256 of encrypted content
  tokensStored: number;                // for budget tracking
  attestation: {
    contentHash: string;
    monadTxHash: string | null;
  };
}
```

### 9.3 Recall Response

```typescript
interface RecallResponse {
  memories: {
    id: string;
    content: string;                   // decrypted
    type: MemoryType;
    score: number;                     // composite score
    tokensUsed: number;
    validFrom: string;
    validUntil: string | null;
    tags: string[];
    sourceModel: string | null;        // which LLM wrote this
  }[];
  totalTokensUsed: number;
  budgetTokens: number;
  filteredCount: number;               // memories removed by distractor filter
  stage1Candidates: number;            // memories that entered stage 1
  stage2Removed: number;               // removed by distractor filter
  taskScopeDetected: string;           // inferred if not provided
}
```

### 9.4 Error Codes

```
VAULT_NOT_FOUND
VAULT_DESTROYED
MEMORY_NOT_FOUND
BUDGET_TOO_SMALL         — budget_tokens < 100
INVALID_MEMORY_TYPE
OPERATOR_KEY_MISMATCH    — signature verification failed
MONAD_RPC_UNAVAILABLE    — write queued, attestation pending
PII_DETECTED             — on market pack creation
ATTESTATION_PENDING      — query for tx hash before confirmation
GDPR_DELETION_IN_PROGRESS
```

---

## 10. Database Schema

### 10.1 PostgreSQL

```sql
-- Vault registry
CREATE TABLE vaults (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_address TEXT NOT NULL,
  name             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destroyed_at     TIMESTAMPTZ,
  plan             TEXT NOT NULL DEFAULT 'free',
  settings         JSONB NOT NULL DEFAULT '{}'
);

-- Memory store (all types except relational)
CREATE TABLE memories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id         UUID NOT NULL REFERENCES vaults(id),
  type             TEXT NOT NULL CHECK (type IN ('working','episodic','semantic','procedural')),
  content          TEXT NOT NULL,           -- AES-256-GCM encrypted
  content_iv       BYTEA NOT NULL,
  content_hash     TEXT NOT NULL,           -- SHA-256 of plaintext
  embedding        vector(1536),
  tags             TEXT[] DEFAULT '{}',
  importance       FLOAT DEFAULT 0.5,
  source_model     TEXT,
  session_id       UUID,
  task_scope       TEXT,                    -- what task context this was written in
  token_count      INTEGER NOT NULL,        -- for budget enforcement
  valid_from       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ,             -- NULL = currently valid
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON memories (vault_id, type, valid_from, valid_until);
CREATE INDEX ON memories (vault_id, task_scope, created_at DESC);
CREATE INDEX ON memories (vault_id, deleted_at) WHERE deleted_at IS NULL;

-- On-chain attestation log
CREATE TABLE attestations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id         UUID NOT NULL REFERENCES vaults(id),
  operation        TEXT NOT NULL CHECK (operation IN ('WRITE','DELETE','EXPORT')),
  memory_ids       UUID[],
  content_hash     TEXT NOT NULL,
  vault_state_hash TEXT NOT NULL,
  monad_tx_hash    TEXT,
  monad_block      BIGINT,
  batch_id         UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ
);

CREATE INDEX ON attestations (vault_id, created_at DESC);

-- GDPR deletion proofs
CREATE TABLE deletion_proofs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id         UUID NOT NULL REFERENCES vaults(id),
  tombstone_hash   TEXT NOT NULL,
  deleted_hashes   TEXT[] NOT NULL,
  gdpr_basis       TEXT,
  user_identifier  TEXT,                    -- anonymised, not PII
  monad_tx_hash    TEXT,
  deleted_count    INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API keys
CREATE TABLE api_keys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id         UUID NOT NULL REFERENCES vaults(id),
  key_hash         TEXT NOT NULL UNIQUE,   -- SHA-256, plaintext never stored
  name             TEXT,
  last_used_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at       TIMESTAMPTZ
);
```

### 10.2 Neo4j (Relational Memory)

```cypher
// Vault node
(:Vault {id: string, operatorAddress: string})

// Entity nodes
(:Entity {
  id: string,
  type: string,     // PERSON, ORGANIZATION, CONCEPT, SKILL, PLACE, ...
  label: string,
  vaultId: string
})

// Temporal fact edges
(:Entity)-[:KNOWS {
  factContent: string,
  validFrom: datetime,
  validUntil: datetime,  // NULL = currently valid
  confidence: float,
  sourceMemoryId: string,
  taskScope: string
}]->(:Entity)

// Query: what did agent know at timestamp T?
MATCH (e1:Entity {vaultId: $vaultId})-[k:KNOWS]->(e2:Entity)
WHERE k.validFrom <= $timestamp
  AND (k.validUntil IS NULL OR k.validUntil > $timestamp)
RETURN e1, k, e2
```

### 10.3 Redis Key Schema

```
vault:{vaultId}:working:{sessionId}:{memoryId}   → {content, metadata}  TTL: session
vault:{vaultId}:session:{sessionId}:keys          → SET of memoryIds     TTL: session
vault:{vaultId}:attest:queue                      → LIST of pending attestations
vault:{vaultId}:recall:cache:{queryHash}          → {results, timestamp} TTL: 60s
```

---

## 11. Monad Integration

### 11.1 Scope (Deliberately Minimal)

Three contracts only. Everything else is deferred.

| Contract | Purpose | Complexity | Demo value |
|----------|---------|-----------|-----------|
| `VaultRegistry.sol` | Operator-owned vault registry | Low | Medium |
| `AttestationAggregator.sol` | Batched memory fingerprints | Low-medium | Medium |
| `DeletionProver.sol` | GDPR tombstones | Low | **High — clearest demo** |

The DeletionProver is the lead demo feature. The pitch: "Prove your agent deleted a user's data — cryptographically, without exposing any PII, verifiable by a regulator in one function call." No other memory system has this.

### 11.2 AttestationAggregator — Batching Logic

```typescript
class AttestationBatcher {
  private queue: Attestation[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 10_000;

  async add(attestation: Attestation): Promise<string> {
    this.queue.push(attestation);
    if (this.queue.length >= this.BATCH_SIZE) await this.flush();
    return attestation.contentHash;   // immediate return, tx hash later
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.BATCH_SIZE);
    try {
      const txHash = await monadContract.batchAttest(batch);
      await db.attestations.updateBatch(batch, txHash);
    } catch {
      // Monad unavailable: re-queue, retry with backoff. Never lose attestations.
      this.queue.unshift(...batch);
    }
  }
}
```

Memory writes never block on Monad availability. The content hash is returned immediately. The on-chain record follows within 10 seconds under normal conditions.

### 11.3 DeletionProver — Key Functions

```solidity
contract DeletionProver {
  struct DeletionRecord {
    bytes32 tombstoneHash;
    bytes32[] deletedHashes;
    string gdprBasis;
    bytes32 userIdentifier;   // keccak256 of anonymised ID — no PII
    uint256 timestamp;
    address operator;
  }

  mapping(bytes32 => DeletionRecord) public deletions;

  function proveDeletion(
    bytes32 tombstoneHash,
    bytes32[] calldata deletedHashes,
    string calldata gdprBasis,
    bytes32 userIdentifier
  ) external onlyRegisteredOperator {
    deletions[tombstoneHash] = DeletionRecord({
      tombstoneHash: tombstoneHash,
      deletedHashes: deletedHashes,
      gdprBasis: gdprBasis,
      userIdentifier: userIdentifier,
      timestamp: block.timestamp,
      operator: msg.sender
    });
    emit DeletionProved(tombstoneHash, msg.sender, block.timestamp);
  }

  function verifyDeletion(bytes32 tombstoneHash)
    external view returns (bool exists, uint256 timestamp, address operator)
  {
    DeletionRecord storage r = deletions[tombstoneHash];
    return (r.timestamp > 0, r.timestamp, r.operator);
  }
}
```

---

## 12. Functional Requirements

### 12.1 Memory Classifier

**FR-001:** System SHALL classify every incoming memory into exactly one of: working, episodic, semantic, procedural, relational.

**FR-002:** If `hint_type` is provided by the caller, system SHALL use it as a strong prior and override only if classification confidence >0.9 in a different direction.

**FR-003:** Classification SHALL complete within 20ms for rule-based cases, 200ms for LLM-assisted cases. Write acknowledgment SHALL NOT wait for LLM-assisted classification.

**FR-004:** Classification SHALL use the following priority order: explicit hint → rule-based patterns → lightweight model → default to episodic.

### 12.2 Two-Stage Retrieval Pipeline

**FR-010:** Stage 1 composite scoring SHALL use task-type-weighted combination of semantic similarity, recency, importance, and type match.

**FR-011:** Task-type weights SHALL be configurable per vault with documented defaults.

**FR-012:** Stage 2 distractor filter SHALL remove candidates where semantic_similarity > 0.65 AND task_contextual_fit < 0.4. Both thresholds SHALL be configurable per vault.

**FR-013:** System SHALL expose `filtered_count` and `stage2_removed` in every recall response so callers can audit filter behavior.

### 12.3 Token Budget

**FR-020:** Every `memory_recall` call SHALL accept a `budget_tokens` parameter (integer, minimum 100).

**FR-021:** System SHALL never return a recall response exceeding `budget_tokens` in total content token count.

**FR-022:** System SHALL use greedy knapsack selection by score/token_count ratio to maximise value within budget.

**FR-023:** Default `budget_tokens` SHALL be 1,500 if not specified.

### 12.4 Performance

**FR-030:** Memory write acknowledgment: p95 <100ms
**FR-031:** Memory recall (full two-stage pipeline): p95 <200ms
**FR-032:** Temporal inspect: p95 <300ms
**FR-033:** On-chain attestation confirmation: p95 <2s (Monad)
**FR-034:** Write path SHALL never block on Monad RPC availability

### 12.5 Portability

**FR-040:** Same MCP endpoint SHALL serve memories written by any model without configuration change.

**FR-041:** System SHALL record `source_model` on every memory write (inferred from API key or provided by caller).

**FR-042:** Recall results SHALL include memories written by any model unless `source_model` filter is specified.

**FR-043:** System SHALL support export of full vault in JSON-L format with all metadata.

### 12.6 Compliance

**FR-050:** Every memory write SHALL generate a content hash and queue an on-chain attestation.

**FR-051:** Memory deletion SHALL generate a tombstone hash and call DeletionProver.sol within 5 seconds.

**FR-052:** System SHALL support GDPR Article 17 with cryptographic proof. Tombstone SHALL be verifiable without revealing any deleted content.

**FR-053:** Compliance report SHALL be generatable for any vault covering: memory count by type, operation log, deletion proofs, on-chain verification links.

---

## 13. Non-Functional Requirements

### 13.1 Performance Targets

| Metric | Target | Stretch |
|--------|--------|---------|
| Write latency p50 | <50ms | <20ms |
| Write latency p95 | <100ms | <50ms |
| Recall latency p50 | <100ms | <50ms |
| Recall latency p95 | <200ms | <100ms |
| Temporal inspect p95 | <300ms | <150ms |
| On-chain attestation | <2s | <1s |
| API availability | 99.9% | 99.99% |

### 13.2 Security

- Memory content: AES-256-GCM, operator key never touches MNEME servers
- Transit: TLS 1.3
- API keys: SHA-256 hashed in DB, plaintext never stored
- Operator signatures: ECDSA verification on all vault operations
- Monad: operator key held client-side only

### 13.3 Scalability

- Horizontal scaling on all stateless services
- pgvector index supports up to 10M memories per vault
- Neo4j supports up to 1M nodes per agent
- API gateway handles 50K req/s at peak

---

## 14. Development Plan

### Phase 0: Foundation (Weeks 1–2)
**Goal:** Local dev environment, existing codebase audited and stable

Tasks:
- Audit current codebase against this PRD — identify gaps vs what's built
- Add `type` column to memories table with classifier stub (defaults to caller-provided or episodic)
- Add `task_scope` and `token_count` columns to memories table
- Add `filtered_count`, `stage2_removed` to recall response schema
- Ensure Docker Compose boots cleanly: PostgreSQL + pgvector + Redis + Neo4j
- Run existing Hardhat tests — verify all 4 contracts pass
- Confirm Monad Testnet deployment still live (check contract addresses in README)

Exit criterion: `npm run dev` boots all services. Existing MCP tools work against live Testnet.

---

### Phase 1: Memory Classifier (Weeks 3–5)
**Goal:** Write-time classification working end-to-end

Tasks:
- Build rule-based classifier (covers ~70% of cases with no LLM cost):
  - working: contains "current session", "right now", "this conversation"
  - procedural: contains "always", "never", "prefer", "rule", "workflow"
  - semantic: entity names + factual assertions
  - episodic: past tense + timestamp references
  - relational: entity A + verb + entity B patterns
- Build spaCy NER pipeline for entity extraction (extraction service already exists, extend it)
- Route classified memories to correct stores
- Expose `hint_type` parameter in MCP `memory_write` tool
- Add `classifiedType` and `hintTypeUsed` to write response
- Unit tests: classifier accuracy against 50-sample hand-labeled test set (target >80%)

Exit criterion: 10 manually written test memories classified correctly by type. Write path routes to correct store per type.

---

### Phase 2: Two-Stage Retrieval + Token Budget (Weeks 6–9)
**Goal:** The core differentiator working and measurable

Tasks:
- Implement composite scoring function with task-type weights
- Add `task_scope` detection (cosine similarity of query embedding against task_scope embeddings)
- Implement Stage 2 distractor filter (configurable thresholds, defaults: 0.65/0.4)
- Implement token budget knapsack (greedy by score/token_count)
- Expose `budget_tokens`, `task_scope` in MCP `memory_recall` tool
- Add `filteredCount`, `stage2Removed`, `totalTokensUsed` to recall response
- Benchmark: measure recall quality before and after Stage 2 filter on test vault
- Performance test: full two-stage pipeline <200ms p95 under simulated load

Exit criterion: Demo — same query with and without distractor filter, showing Stage 2 removes 2–5 contextually wrong memories that Stage 1 passed. Token budget enforced correctly.

---

### Phase 3: App Connector Layer (Weeks 10–12)
**Goal:** Works in Claude.ai, ChatGPT, Gemini web — not just MCP clients

Tasks:
- Build browser extension (Chrome first, then Firefox/Edge):
  - Manifest V3 (Chrome requirement)
  - Content script detects Claude.ai, ChatGPT, Gemini input fields
  - Background service worker: calls MNEME REST API for recall
  - Memory block injected into user's message, stripped from visible display
  - Settings popup: API key, vault ID, budget_tokens config
- Build GPT Action OpenAPI schema for Custom GPTs
- Build dashboard page `/install` with setup guides for all integration types
- Build System Prompt Snapshot generator (for Claude Projects / Gemini Gems)
- SDK: publish `@mneme/sdk` to npm, `mneme` to PyPI

Exit criterion: In Claude.ai web chat (no MCP), typing a question triggers memory injection from MNEME. Correct memories appear in context. Measurably accurate.

---

### Phase 4: Framework Plugins (Weeks 13–15)
**Goal:** Drop-in for the three major agent frameworks

Tasks:
- LangGraph plugin: `MnemeMemoryPlugin` node that auto-reads/writes memory per graph step
- CrewAI plugin: `MnemeMemory` class implementing CrewAI's memory interface
- AutoGen plugin: `MnemeConversableAgent` wrapper
- Integration test: existing LangGraph agent + MNEME plugin — zero agent code change
- Documentation: plugin setup guide, expected behavior, troubleshooting

Exit criterion: A LangGraph agent with no memory, given the MNEME plugin in 3 lines, retains context across separate Python process invocations.

---

### Phase 5: Production Hardening (Weeks 16–20)
**Goal:** Ready for real traffic, not just demos

Tasks:
- Load test: 1K concurrent writes p95 <100ms, 500 concurrent recalls p95 <200ms
- Monad Mainnet deployment (after testnet stability confirmed)
- Security audit: encryption path, API key handling, ECDSA verification
- Kubernetes Helm charts for full stack deployment
- Monitoring: Prometheus metrics for write latency, recall latency, Stage 2 filter rate, budget utilization, Monad queue depth
- Alerting: p95 write >500ms, Monad RPC unavailable >30s, API error rate >1%
- Documentation: full API reference, SDK guides, plugin docs, browser extension guide
- Public npm/PyPI release of SDK and plugins

Exit criterion: 100 agent vaults live on Monad Mainnet. Zero P1 incidents in first week.

---

### Phase 6: Memory Market (Weeks 21–26)
**Goal:** First marketplace transaction

Tasks:
- PII scanning pipeline (NER-based, regex fallback)
- Pack creation UI: date range, domain tag, anonymisation report
- `MemoryMarket.sol` deployment and audit
- Marketplace UI: browse, filter, sample query
- Pack purchase via USDC on Monad
- Pack ingest API

Exit criterion: End-to-end — create pack → list → purchase → ingest into new vault. On-chain transaction confirmed.

---

## 15. Success Metrics

### Phase 1 (End Week 5)
- [ ] Classifier accuracy >80% on hand-labeled test set
- [ ] Memory write routes to correct store for all 5 types
- [ ] All existing MCP tools still pass integration tests

### Phase 2 (End Week 9)
- [ ] Stage 2 filter removes measurably wrong memories in demo scenario
- [ ] Recall p95 <200ms under 100 concurrent requests
- [ ] Token budget enforced: 0 responses exceed `budget_tokens`
- [ ] `filteredCount` and `stage2Removed` accurate in all responses

### Phase 3 (End Week 12)
- [ ] Browser extension works in Chrome on Claude.ai, ChatGPT, Gemini
- [ ] GPT Action schema importable into Custom GPT and functional
- [ ] SDK published to npm and PyPI with working examples

### 3-Month Target
- [ ] 100 active vaults
- [ ] 50K memory writes processed
- [ ] Browser extension: 500 installs
- [ ] LongMemEval score >90% on standardized benchmark
- [ ] Zero P1 incidents

### 6-Month Target
- [ ] 1K active vaults
- [ ] 500K on-chain attestations (Monad Mainnet)
- [ ] 3 framework plugin integrations live
- [ ] First Memory Market transaction

### North Star Metric
**Active agent vaults** — vaults with at least one recall in the last 30 days.
This is the only metric that proves the memory is actually being used, not just written.

---

## 16. Risk Analysis

### R1: Stage 2 distractor filter reduces recall quality (under-filters OR over-filters)
**Probability:** High in early versions | **Impact:** Medium
**Mitigation:** Configurable thresholds per vault. Default conservatively (only filter high-similarity, low-fit pairs). Expose `filtered_count` so builders can tune. A/B test on benchmark dataset before shipping.

### R2: Monad RPC instability during demo
**Probability:** Medium | **Impact:** High (hackathon context)
**Mitigation:** Write path never blocks on Monad. Memory operations work normally without attestation — attestation catches up async. Demo script uses pre-confirmed transactions on explorer for the on-chain story.

### R3: Browser extension gets blocked by platform CSP changes
**Probability:** Low-medium | **Impact:** High for Tier 4 integration
**Mitigation:** System prompt snapshot (Mechanism A) is always available as fallback. Extension is enhancement, not dependency. GPT Action is independent backup.

### R4: LangGraph/CrewAI API changes break plugins
**Probability:** Medium (frameworks iterate fast) | **Impact:** Medium
**Mitigation:** Pin plugin compatibility against specific framework versions. Document tested versions. Framework plugins are additive — REST API works without them.

### R5: Classifier wrong-types a memory, routes to wrong store
**Probability:** Medium | **Impact:** Low (memory is still stored, just in wrong tier)
**Mitigation:** Wrong-type memories still retrieved — composite scoring catches them. `hint_type` parameter lets callers override. Reclassification endpoint in API backlog.

---

## Appendix: Current Contract Addresses (Monad Testnet, Chain ID 10143)

| Contract | Address |
|----------|---------|
| VaultRegistry | `0x19b31A7F2759Dac9FFe8Bf9C9D7e2C5446068b73` |
| AttestationAggregator | `0x9c36aC707F29f0EfBb147710A288e3c9e4069A93` |
| MemoryMarket | `0x0EE8903784a4f4974003548e0682d484849c7E27` |
| DeletionProver | `0xF66260602E13e05EAcc56c238cD26587A3Cad9ea` |
| Mock USDC | `0x6bbc2600813b109f78D61B2A78DCaFB1D6C1063E` |

Deployed: 2026-07-04T08:12:17Z | Deployer: `0x8e11d906a07F037029409e21fa14A0B733F0B431`
