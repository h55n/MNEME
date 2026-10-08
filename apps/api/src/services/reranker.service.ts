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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseUrl}/rerank`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, documents, top_n: topN }),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'Reranker service returned non-ok status');
        return [];
      }

      const data = (await response.json()) as Partial<RerankResponse> | null;
      if (!data || !Array.isArray(data.results)) return [];
      const allowedIds = new Set(documents.map(document => document.id));
      const seen = new Set<string>();
      return data.results.filter(result => {
        if (!result || typeof result.id !== 'string' || !allowedIds.has(result.id) ||
            typeof result.score !== 'number' || !Number.isFinite(result.score) || seen.has(result.id)) return false;
        seen.add(result.id);
        return true;
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to reach extraction service for reranking');
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const rerankerService = new RerankerService();
