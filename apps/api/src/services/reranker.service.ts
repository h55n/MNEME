import { createLogger } from '../utils/logger.js';

const logger = createLogger('reranker-service');

export interface RerankDocument {
  id: string;
  text: string;
}

export interface RerankResult {
  id: string;
  score: number;
}

interface RerankResponse {
  results: RerankResult[];
}

export class RerankerService {
  private get baseUrl(): string {
    return process.env.EXTRACTION_SERVICE_URL ?? process.env.EXTRACTION_API_URL ?? 'http://localhost:8001';
  }

  async rerank(query: string, documents: RerankDocument[], topN?: number): Promise<RerankResult[]> {
    if (documents.length === 0) return [];

    try {
      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, documents, top_n: topN }),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'Reranker service returned non-ok status');
        return [];
      }

      const data = (await response.json()) as RerankResponse;
      return data.results;
    } catch (err) {
      logger.warn({ err }, 'Failed to reach extraction service for reranking');
      return [];
    }
  }
}

export const rerankerService = new RerankerService();
