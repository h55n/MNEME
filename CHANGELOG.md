# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-07-17

### Added
- **Authentication / Login Portal**: Created a new dedicated `/login` page (`apps/web/src/app/login/page.tsx`) to allow users to authenticate using their Vault ID and API Key.
- **Homepage Navigation**: Updated the main landing page (`apps/web/src/app/page.tsx`) to include a "Login" button alongside vault creation tools.
- **Mock API Vault Resolution**: Added the `GET /vaults/:vaultId` endpoint mock to `apps/web/src/lib/api.ts` to support local UI authentication flows.
- **MCP Integration**: Created workspace MCP configuration (`.agents/mcp.json`) to natively integrate MNEME's memory tools (`@mneme/mcp`) directly into AI agent environments like Claude Desktop, Cursor, and Antigravity.
- **Dynamic Context Ingestion**: Added a dynamic script (`store-context.mjs`) to parse project documentation (`README.md`) and submit the application context programmatically via the MNEME SDK/API into the vault.
- **Mock API Server**: Created an internal `mock-api.js` to simulate the MNEME Fastify backend for MCP server interaction tests.

### Changed
- **Strict Type Safety**: Conducted a massive refactor across the entire codebase (`apps/api`, `apps/web`, `apps/mcp`, `packages/shared`). Eliminated all `as any` type bypasses and replaced them with robust TypeScript interfaces, generics, and strict parsing.
- **Date Parsing Logic**: Hardened database date parsing pipelines to natively resolve timestamp mismatch and strict typing, removing unstable fallback wrappers.
- **Micro-Animations**: Enhanced UI fluidity by adding smooth micro-animations to core interactable elements.

### Fixed
- **E2E Testing Stability**: Addressed flakiness in end-to-end memory inspect tests by resolving timestamp extraction errors and compensating for local environment clock skew.
- **Docker & CI/Build Issues**: Fixed Next.js static build failures (`next.config.mjs` standalone configurations).
- **TypeScript Errors**: Rectified all isolated type errors generated during production docker container compilation.

## [1.0.0] - 2026-07-04
*Initial Monorepo Launch for Monad Blitz Pune V2*

### Added
- **Sovereign Vaults**: Base mapping of W3C DIDs to Vault structures.
- **Fastify REST API**: Implemented core REST routing for memories, vaults, market, and compliance endpoints (`apps/api`).
- **Next.js Dashboard**: Launched the user-facing dashboard for Memory visualization, generation, and Market curation.
- **Smart Contracts**: Deployed `VaultRegistry.sol`, `AttestationAggregator.sol`, `MemoryMarket.sol`, and `DeletionProver.sol` on Monad Testnet (`chainId 10143`).
- **Demo Mode**: Introduced an offline-resilient mock API interceptor enabling instant local or remote demo capabilities without a wallet or database.
- **GDPR Deletion Prover**: Cryptographic tombstone pipeline to allow AI agents to comply natively with Article 17 (Right to Erasure).
- **Temporal Inspect**: Feature enabling users to execute spatial-temporal snapshot queries against memory clusters.
- **Chrome Extension Compatibility**: Setup fallback API URLs pointed at Vercel edge endpoints for extension interactions.

### Changed
- **Architecture Documentation**: Revamped `README.md` to industry standard — inclusive of detailed Architecture (Mermaid diagrams), deployment graphs, team compositions, and Monad live addresses.
- **Monorepo Deployments**: Overhauled Vercel / Turborepo deployment pipelines by downgrading `next.js` safely to `14.2.5` to ensure `React 18` edge compatibility.
- **Database Statement Parsing**: Corrected internal SQL statement parsing engine to accurately handle lines with code comments.

### Fixed
- **Redis Queue Fallback**: Implemented the missing logic handling scenarios where Redis is offline, gracefully failing back or caching instead of crashing.
- **Logo Cropping**: Fixed aspect ratios for `mneme.svg` wordmark scaling across responsive views.
- **Audit Compliance**: Patched testnet labels, sanitized demo data, and corrected DB field structures prior to the official V2 audit pass.
