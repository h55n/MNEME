-- Embeddings move from 1536 dimensions (OpenAI only) to 384 (local model by default).
-- Existing vectors cannot be converted, so they are cleared; rows keep their encrypted
-- content and are re-embedded by the reembed job (embedder_id IS NULL marks them).
DROP INDEX IF EXISTS memories_embedding_idx;

ALTER TABLE memories
  ALTER COLUMN embedding TYPE vector(384) USING NULL;

-- Names the embedder that produced each vector, so vectors from different models are never compared.
ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS embedder_id TEXT;

-- HNSW needs no training data and keeps recall steady as the table grows (ivfflat did not).
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING hnsw (embedding vector_cosine_ops);
