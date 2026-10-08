# Security and dependency risk

## Deployment boundaries

Production API/web/MCP installations must omit development dependencies. Run
`npm audit --omit=dev --audit-level=moderate` before shipping. A clean runtime
audit is not a guarantee of application security.

The MCP endpoint requires a vault UUID and that vault's bearer API key. Never
put the API key in the URL or share a populated MCP config. Keys are not OAuth:
clients without custom-header support need the local stdio adapter until an
OAuth flow is implemented. Never remove authentication to connect a client.

## Dependency review: 2026-10-08

Non-force, lockfile-only `npm audit fix --package-lock-only --ignore-scripts`
was run in the root and indexer. No dependency manifest was upgraded by this
cleanup. The root API manifest additionally depends on the existing local MCP
workspace so one deployment can serve both REST and MCP.

- Root audit after cleanup: 64 package findings (28 high, 17 moderate, 19 low).
  Root production audit with `--omit=dev`: 0 findings.
- Indexer audit after cleanup: 11 package findings (4 high, 3 moderate, 4 low),
  down from 13 including one critical finding before cleanup.

These are package findings, not unique advisories or Dependabot alert counts.

### Temporarily accepted development risk

Root findings are in contract/test/build tooling: Hardhat and plugins,
TypeChain, Solidity coverage/gas reporting, ethers v5 dependencies, ESLint and
TypeScript ESLint, Tailwind's file-matching dependencies, and Drizzle Kit's
esbuild loader. Many proposed fixes require major migrations or downgrades.
Do not apply `npm audit fix --force` blindly.

Development-only does not mean harmless. Malicious source files, artifacts,
network responses, or locally exposed dev servers can still affect a developer
or CI runner. Run untrusted contributions without deployment secrets, keep dev
servers bound to localhost, and do not serve these packages in production.
Accepted risk is temporary pending tested toolchain migrations. Review on every
Dependabot update and before changing how a dependency is used.

### Indexer: deployment gate, not a clean runtime

The separate `indexer/` tree includes Envio's Express stack and dependencies.
Remaining findings include Express/body-parser/path-to-regexp/ws (high),
qs/viem/envio (moderate), and cookie/send/serve-static/esbuild (low).
The suggested Envio replacement changes the declared major version; this pass
keeps 3.2.1 rather than making that migration without functional validation.

The indexer is not included in the API/web images. This note does NOT certify
that no indexer is deployed elsewhere. Do not expose its HTTP services publicly
until upstream patches or a tested migration remove the relevant vulnerabilities.
When a private development indexer is used, bind locally and isolate its access.
Dependabot now scans `/indexer` weekly as well as the root.

## Reporting

Use GitHub's private vulnerability reporting if enabled on this repository.
Do not include vault keys, customer memories, auth headers, or database secrets
in public issues. Review this note before a production release.
