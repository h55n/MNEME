-- MNEME Migration 0002: Classifier + Two-Stage Recall
-- Expands type CHECK constraint, adds task_scope, token_count, distractor thresholds

-- 1. Expand the memory type CHECK constraint to include 'working' and 'relational'
ALTER TABLE memories DROP CONSTRAINT IF EXISTS memories_type_check;
ALTER TABLE memories
  ADD CONSTRAINT memories_type_check
  CHECK (type IN ('working', 'episodic', 'semantic', 'procedural', 'relational'));

-- 2. Add classifier and recall columns to memories
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS task_scope TEXT,
  ADD COLUMN IF NOT EXISTS token_count INTEGER NOT NULL DEFAULT 0;

-- 3. Backfill token_count for existing memories (rough estimate: chars / 4)
UPDATE memories
  SET token_count = GREATEST(1, length(content) / 4)
  WHERE token_count = 0;

-- 4. Index for task-scope-scoped recall performance
CREATE INDEX IF NOT EXISTS idx_memories_task_scope
  ON memories (vault_id, task_scope, created_at DESC);

-- 5. Add distractor filter thresholds per vault (configurable per vault)
ALTER TABLE vaults
  ADD COLUMN IF NOT EXISTS distractor_sim_threshold FLOAT NOT NULL DEFAULT 0.65,
  ADD COLUMN IF NOT EXISTS distractor_fit_threshold FLOAT NOT NULL DEFAULT 0.40;
