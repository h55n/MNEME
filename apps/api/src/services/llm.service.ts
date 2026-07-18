import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('llm-service');

export class LLMService {
  private openai: OpenAI | null = null;
  private readonly model = 'gpt-4o-mini';

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      logger.warn('No OPENAI_API_KEY — LLM generation disabled');
    }
  }

  /**
   * Generates a hypothetical document using HyDE for a given query.
   */
  async generateHyDE(query: string, taskType: string): Promise<string> {
    if (!this.openai) return query; // fallback to raw query

    const prompt = `You are an expert agent. Given the following query, write a hypothetical document or memory that perfectly answers the query or provides the exact context needed. The context of this query is for a task of type: ${taskType}.
Query: "${query}"

Return ONLY the hypothetical document text. Do not add any conversational filler.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      });

      return response.choices[0].message.content?.trim() || query;
    } catch (err) {
      logger.error({ err }, 'HyDE generation failed');
      return query;
    }
  }

  /**
   * Compresses a memory to fit within a tight token budget by removing filler/irrelevant details.
   */
  async compressMemory(text: string, query: string, targetTokens: number): Promise<string> {
    if (!this.openai) return text.substring(0, targetTokens * 4); // naive char cutoff

    const prompt = `Compress the following text so it uses roughly ${targetTokens} tokens. Keep the information most relevant to this query: "${query}". 
    Text: "${text}"
    Return ONLY the compressed text.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: targetTokens + 50, // margin
      });

      return response.choices[0].message.content?.trim() || text.substring(0, targetTokens * 4);
    } catch (err) {
      logger.error({ err }, 'Compression failed');
      return text.substring(0, targetTokens * 4);
    }
  }
}

export const llmService = new LLMService();
