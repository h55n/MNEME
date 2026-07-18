-- MNEME Initial Migration
-- Creates all core tables with indexes

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Vaults
CREATE TABLE IF NOT EXISTS vaults (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did              TEXT UNIQUE NOT NULL,
  operator_address TEXT NOT NULL,
  name             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  destroyed_at     TIMESTAMPTZ,
  plan             TEXT NOT NULL DEFAULT 'free',
  settings         JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS vaults_did_idx ON vaults(did);
CREATE INDEX IF NOT EXISTS vaults_operator_idx ON vaults(operator_address);

-- Memory Packs (referenced by memories)
CREATE TABLE IF NOT EXISTS memory_packs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_vault_id       UUID NOT NULL REFERENCES vaults(id),
  seller_address        TEXT NOT NULL,
  domain_tag            TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  interaction_count     INTEGER NOT NULL,
  date_range_from       TIMESTAMPTZ NOT NULL,
  date_range_to         TIMESTAMPTZ NOT NULL,
  price_usdc            NUMERIC(18,6) NOT NULL,
  content_hash          TEXT NOT NULL,
  monad_tx_hash         TEXT,
  pii_scan_passed       BOOLEAN NOT NULL DEFAULT FALSE,
  anonymisation_report  JSONB,
  status                TEXT NOT NULL DEFAULT 'pending',
  listed_at             TIMESTAMPTZ,
  purchase_count        INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS packs_seller_idx ON memory_packs(seller_vault_id);
CREATE INDEX IF NOT EXISTS packs_status_idx ON memory_packs(status);
CREATE INDEX IF NOT EXISTS packs_domain_idx ON memory_packs(domain_tag);

-- Memories
CREATE TABLE IF NOT EXISTS memories (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id             UUID NOT NULL REFERENCES vaults(id),
  type                 TEXT NOT NULL CHECK (type IN ('episodic', 'semantic', 'procedural')),
  content              TEXT NOT NULL,
  content_iv           TEXT NOT NULL,
  content_tag          TEXT NOT NULL,
  embedding            vector(1536),
  tags                 TEXT[] NOT NULL DEFAULT '{}',
  importance           REAL NOT NULL DEFAULT 0.5,
  source_model         TEXT,
  session_id           UUID,
  valid_from           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  content_hash         TEXT NOT NULL,
  provenance_pack_id   UUID REFERENCES memory_packs(id)
);

CREATE INDEX IF NOT EXISTS memories_vault_idx ON memories(vault_id);
CREATE INDEX IF NOT EXISTS memories_vault_type_idx ON memories(vault_id, type);
CREATE INDEX IF NOT EXISTS memories_vault_valid_idx ON memories(vault_id, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS memories_hash_idx ON memories(content_hash);
CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Attestations
CREATE TABLE IF NOT EXISTS attestations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id         UUID NOT NULL REFERENCES vaults(id),
  operation        TEXT NOT NULL CHECK (operation IN ('WRITE','UPDATE','DELETE','EXPORT')),
  memory_ids       UUID[],
  content_hash     TEXT NOT NULL,
  vault_state_hash TEXT NOT NULL,
  monad_tx_hash    TEXT,
  monad_block      BIGINT,
  batch_id         UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS attestations_vault_idx ON attestations(vault_id);
CREATE INDEX IF NOT EXISTS attestations_tx_hash_idx ON attestations(monad_tx_hash);
CREATE INDEX IF NOT EXISTS attestations_created_idx ON attestations(vault_id, created_at);

-- Pack Purchases
CREATE TABLE IF NOT EXISTS pack_purchases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id           UUID NOT NULL REFERENCES memory_packs(id),
  buyer_vault_id    UUID NOT NULL REFERENCES vaults(id),
  buyer_address     TEXT NOT NULL,
  price_paid_usdc   NUMERIC(18,6) NOT NULL,
  monad_tx_hash     TEXT NOT NULL,
  ingested_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchases_pack_idx ON pack_purchases(pack_id);
CREATE INDEX IF NOT EXISTS purchases_buyer_idx ON pack_purchases(buyer_vault_id);

-- Compliance Reports
CREATE TABLE IF NOT EXISTS compliance_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id      UUID NOT NULL REFERENCES vaults(id),
  requested_by  TEXT NOT NULL,
  report_type   TEXT NOT NULL,
  date_from     TIMESTAMPTZ,
  date_to       TIMESTAMPTZ,
  report_hash   TEXT NOT NULL,
  storage_key   TEXT NOT NULL,
  signed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS compliance_vault_idx ON compliance_reports(vault_id);

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id      UUID NOT NULL REFERENCES vaults(id),
  key_hash      TEXT NOT NULL UNIQUE,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS api_keys_vault_idx ON api_keys(vault_id);
