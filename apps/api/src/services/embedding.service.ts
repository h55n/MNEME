import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('embedding-service');

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private readonly model = 'text-embedding-3-small';
  private readonly dimensions = 1536;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      logger.warn('No OPENAI_API_KEY — embeddings disabled, falling back to text search');
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.openai) {
      // Return a zero vector as fallback
      return new Array(this.dimensions).fill(0);
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text.slice(0, 8000), // Token limit
        dimensions: this.dimensions,
      });

      return response.data[0].embedding;
    } catch (err) {
      logger.error({ err }, 'Embedding API error');
      return new Array(this.dimensions).fill(0);
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.openai || texts.length === 0) {
      return texts.map(() => new Array(this.dimensions).fill(0));
    }

    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts.map(t => t.slice(0, 8000)),
        dimensions: this.dimensions,
      });

      return response.data.map(d => d.embedding);
    } catch (err) {
      logger.error({ err }, 'Batch embedding API error');
      return texts.map(() => new Array(this.dimensions).fill(0));
    }
  }
}

export const embeddingService = new EmbeddingService();
