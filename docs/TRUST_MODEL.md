# Memory trust model

This describes the current implementation, not a future client-side encryption design.

## Hosted deployment

The caller sends memory content to the API as plaintext over HTTPS. The API classifies it, computes its hash and embedding, then encrypts the content with AES-256-GCM for database storage. Each vault key is derived from the server's `ENCRYPTION_SECRET` and the vault ID using HKDF-SHA256. Stored ciphertext includes an IV and authentication tag.

The API also decrypts content for recall and other memory processing. Whoever controls the API process or its encryption secret can read memory content. Encryption at rest does not make the service end-to-end encrypted or zero-knowledge. A database-only theft without the secret does not reveal encrypted content, but embeddings, metadata and content hashes are not covered by the content-encryption guarantee.

A vault API key authorizes requests. It is not a content-encryption key. A wallet address or DID identifies a vault; it does not prevent the API from decrypting content. On-chain hashes and deletion tombstones are records, not a confidentiality boundary or proof that every off-chain copy has disappeared.

The local embedding model avoids sending text to an external embedding provider. Optional extraction or graph services are separate processing boundaries: check their deployment and data handling before enabling them. This document does not approve or change the market route.

## Self-hosted deployment

Self-hosting lets you control the API, its secret, database, backups and enabled services. The administrator of that deployment can still read plaintext. It does not add client-side encryption or protect content from that administrator.

Restrict access to the server secret and database, use HTTPS, secure backups, and review retention and deletion practices. Losing the secret can make encrypted memories unreadable. Moving to a different secret needs an explicit migration; this copy correction does not implement rotation or crypto-shredding.

## Meaning of ownership

Portability, vault-scoped authorization and control over a self-hosted deployment are distinct from cryptographic protection against a hosted operator. Public wording should say "portable memory" and "encrypted at rest," not "only you can decrypt" or "the platform cannot read your memories."

## Source anchors

- `packages/shared/src/utils.ts`: `deriveVaultKey`, `encrypt`, `decrypt`.
- `apps/api/src/services/memory.service.ts`: server-secret access, write processing and encrypted content storage.
- `apps/api/src/services/recall.ts`: server-side decryption for recall.

No encryption algorithm, API behavior, market behavior or deployment secret is changed by this documentation update.
