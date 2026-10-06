import { createLogger } from '../utils/logger.js';

const logger = createLogger('embedding-service');

/** Every vector MNEME stores has this many dimensions, whichever embedder produced it. */
export const EMBEDDING_DIMS = 384;

export class EmbeddingError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EmbeddingError';
  }
}

type Extractor = (
  input: string | string[],
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

const LOCAL_MODEL = 'Xenova/all-MiniLM-L6-v2';
// all-MiniLM-L6-v2 truncates at 256 word pieces; cutting the text first keeps long
// inputs from costing time for tokens the model would drop anyway.
const MAX_CHARS = 2000;

/**
 * Turns text into 384-dimension unit vectors.
 *
 * EMBEDDER=local (default): all-MiniLM-L6-v2 runs inside this process. No key, no network
 * calls after the one-time model download, and memory text never leaves the server.
 * EMBEDDER=openai: text-embedding-3-small, asked for 384 dimensions so the schema is the
 * same. Needs OPENAI_API_KEY. Optional; nothing requires it.
 *
 * A failure throws EmbeddingError. There is no fallback vector: a zero vector would make
 * semantic search silently return nothing.
 */
export class EmbeddingService {
  readonly dimensions = EMBEDDING_DIMS;
  readonly provider: 'local' | 'openai';
  private extractor: Promise<Extractor> | null = null;

  constructor() {
    const wanted = (process.env.EMBEDDER ?? 'local').toLowerCase();
    if (wanted !== 'local' && wanted !== 'openai') {
      throw new EmbeddingError(`EMBEDDER must be "local" or "openai", got "${wanted}"`);
    }
    if (wanted === 'openai' && !process.env.OPENAI_API_KEY) {
      throw new EmbeddingError('EMBEDDER=openai needs OPENAI_API_KEY');
    }
    this.provider = wanted;
  }

  /** Identifies the embedder in stored rows, so vectors from different models are never mixed. */
  get id(): string {
    return this.provider === 'local'
      ? `local:${LOCAL_MODEL}:${EMBEDDING_DIMS}`
      : `openai:text-embedding-3-small:${EMBEDDING_DIMS}`;
  }

  private loadLocal(): Promise<Extractor> {
    if (!this.extractor) {
      this.extractor = (async () => {
        const { pipeline } = await import('@huggingface/transformers');
        const started = Date.now();
        const extractor = (await pipeline('feature-extraction', LOCAL_MODEL, {
          dtype: 'fp32',
        })) as unknown as Extractor;
        logger.info({ model: LOCAL_MODEL, ms: Date.now() - started }, 'Local embedder ready');
        return extractor;
      })();
      // Let a later call retry if the first load failed (for example, no network).
      this.extractor.catch(() => {
        this.extractor = null;
      });
    }
    return this.extractor;
  }

  /** Loads the model now instead of on the first request. Safe to call more than once. */
  async warmUp(): Promise<void> {
    if (this.provider === 'local') await this.loadLocal();
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const inputs = texts.map(t => t.slice(0, MAX_CHARS));
    try {
      const vectors =
        this.provider === 'local' ? await this.embedLocal(inputs) : await this.embedOpenAI(inputs);
      for (const vector of vectors) {
        if (vector.length !== EMBEDDING_DIMS) {
          throw new EmbeddingError(
            `Embedder returned ${vector.length} dimensions, expected ${EMBEDDING_DIMS}`,
          );
        }
      }
      return vectors;
    } catch (err) {
      if (err instanceof EmbeddingError) throw err;
      throw new EmbeddingError('Embedding failed', { cause: err });
    }
  }

  private async embedLocal(inputs: string[]): Promise<number[][]> {
    const extractor = await this.loadLocal();
    const output = await extractor(inputs, { pooling: 'mean', normalize: true });
    return output.tolist();
  }

  private async embedOpenAI(inputs: string[]): Promise<number[][]> {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: inputs,
      dimensions: EMBEDDING_DIMS,
    });
    return response.data.map(d => d.embedding);
  }
}

export const embeddingService = new EmbeddingService();
