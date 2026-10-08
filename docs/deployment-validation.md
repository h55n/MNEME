# Deployment validation

Validated on 2026-10-08 with Node 22 and a disposable PostgreSQL 16 + pgvector database.

## Passed locally

- Fresh npm ci, all five workspace builds, strict application lint.
- API: 90 tests; MCP: 17; TypeScript SDK: 9; contracts: 12; extension: 5.
- Compiled API startup and real HTTP health, signup, local embedding write/recall, unauthorized write, delete, repeated-delete and vault cleanup.
- Compiled standalone web homepage: HTTP 200 and rendered visual inspection.
- npm audit --omit=dev: zero findings at validation time. CI now gates production audit at moderate severity.

## Fixes

Patched runtime dependencies, canonical IPv4/IPv6 rate-limit keys, explicit proxy-hop trust, packaged SQL migrations, fail-closed migration startup, Next public API URL build-cache inputs and runtime-only container dependencies. Removed unused dependencies and README build-tool attribution.

## Limits

The full development/toolchain audit still reports 65 findings (18 low, 18 moderate, 29 high, zero critical), principally Hardhat, lint and Tailwind dependency chains. Production-only audit is not a claim that build tooling is risk-free. Run build tooling only on trusted code and inputs.

Core memory validation does not prove hosted production readiness. Production database connectivity, secrets, TLS/domain/CORS configuration, backups, monitoring, graph integration, on-chain attestations and paid settlement must be verified in the chosen environment. No hosted deployment or paid integration was performed.

Run the HTTP smoke only on a disposable database, after applying migrations and starting the compiled API in production mode:

    SMOKE_ALLOW_WRITE=1 node scripts/deployment-smoke.mjs

The smoke creates and deletes a test vault and performs real embedding work. Never point it at a customer database.
