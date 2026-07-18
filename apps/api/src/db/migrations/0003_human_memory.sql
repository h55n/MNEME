-- 1. Add missing columns to memories
ALTER TABLE memories 
  ADD COLUMN IF NOT EXISTS retrieval_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retrieved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decay_rate FLOAT NOT NULL DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS segment_id UUID;

-- 2. Create segments table
CREATE TABLE IF NOT EXISTS segments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id      UUID NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('topic', 'temporal', 'task')),
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  importance    FLOAT NOT NULL DEFAULT 0.5,
  memory_count  INTEGER NOT NULL DEFAULT 0,
  last_accessed TIMESTAMPTZ,
  session_id    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add FK from memories to segments
ALTER TABLE memories
  ADD CONSTRAINT fk_memory_segment 
  FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE SET NULL;

-- 4. Index for decay job
CREATE INDEX IF NOT EXISTS idx_memories_decay 
  ON memories (vault_id, last_retrieved_at, importance) 
  WHERE deleted_at IS NULL;

-- 5. Index for segment recall
CREATE INDEX IF NOT EXISTS idx_memories_segment 
  ON memories (segment_id) 
  WHERE deleted_at IS NULL;
