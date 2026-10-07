import { createLogger } from '../utils/logger.js';

const logger = createLogger('extraction-service');

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractionResult {
  entities: Array<{ label: string; type: string }>;
  facts: Array<{
    subject: string;
    subjectType: string;
    object: string;
    objectType: string;
    fact: string;
    confidence: number;
  }>;
}

interface ExtractParams {
  content: string;
  vaultId: string;
  memoryId: string;
  memoryType: string;
}

const EMPTY_RESULT: ExtractionResult = { entities: [], facts: [] };

// ── Extraction prompt ─────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a knowledge graph extraction engine. Extract named entities and relationships from the given text.

Return ONLY valid JSON in this exact format:
{
  "entities": [
    { "label": "Entity Name", "type": "PERSON|ORGANIZATION|CONCEPT|SKILL|LOCATION|DATE|PRODUCT" }
  ],
  "facts": [
    {
      "subject": "Entity Name",
      "subjectType": "PERSON|ORGANIZATION|CONCEPT|SKILL|LOCATION|DATE|PRODUCT",
      "object": "Entity Name",
      "objectType": "PERSON|ORGANIZATION|CONCEPT|SKILL|LOCATION|DATE|PRODUCT",
      "fact": "brief description of the relationship",
      "confidence": 0.0-1.0
    }
  ]
}

Rules:
- Only extract clear, factual relationships. Do not infer.
- Minimum confidence threshold: 0.6
- Maximum 20 entities and 20 facts per text.
- Return empty arrays if no clear entities/facts found.
- Never include PII or sensitive data as entity labels.`;

// ── Python microservice client ─────────────────────────────────────────────────

const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL
  ?? (process.env.NODE_ENV === 'production' ? 'http://extraction:8001' : 'http://localhost:8001');

function validateExtraction(value: unknown): ExtractionResult | null {
  if (!value || typeof value !== 'object') return null;
  const result = value as Partial<ExtractionResult>;
  if (!Array.isArray(result.entities) || !Array.isArray(result.facts)) return null;
  const text = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 2000;
  return {
    entities: result.entities.filter(entity => entity && text(entity.label) && text(entity.type)).slice(0, 20),
    facts: result.facts.filter(fact => fact && text(fact.subject) && text(fact.subjectType) &&
      text(fact.object) && text(fact.objectType) && text(fact.fact) &&
      typeof fact.confidence === 'number' && Number.isFinite(fact.confidence) &&
      fact.confidence >= 0.6 && fact.confidence <= 1).slice(0, 20),
  };
}

async function callPythonService(params: ExtractParams): Promise<ExtractionResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {

    const res = await fetch(`${EXTRACTION_SERVICE_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: params.content,
        memory_type: params.memoryType,
        vault_id: params.vaultId,
        memory_id: params.memoryId,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    return validateExtraction(await res.json());
  } catch {
    return null; // Python service unavailable — fall back to Node
  } finally {
    clearTimeout(timeout);
  }
}

// ── Anthropic fallback ─────────────────────────────────────────────────────────

async function callAnthropic(content: string): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return EMPTY_RESULT;

  try {
    // Dynamic import — Anthropic SDK is optional
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307', // Fast and cheap for extraction
      max_tokens: 1024,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract entities and facts from this memory:\n\n${content.slice(0, 4000)}`,
        },
      ],
    });

    const rawText = message.content[0]?.type === 'text' ? message.content[0].text : '';
    if (!rawText) return EMPTY_RESULT;

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? [null, rawText];
    const jsonStr = jsonMatch[1] ?? rawText;

    const parsed = JSON.parse(jsonStr.trim());
    return validateExtraction(parsed) ?? EMPTY_RESULT;
  } catch (err) {
    logger.warn({ err }, 'Anthropic extraction failed');
    return EMPTY_RESULT;
  }
}

// ── OpenAI fallback ────────────────────────────────────────────────────────────

async function callOpenAI(content: string): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return EMPTY_RESULT;

  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: `Extract entities and facts from this memory:\n\n${content.slice(0, 4000)}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1024,
    });

    const rawText = response.choices[0]?.message?.content ?? '';
    if (!rawText) return EMPTY_RESULT;

    const parsed = JSON.parse(rawText);
    return validateExtraction(parsed) ?? EMPTY_RESULT;
  } catch (err) {
    logger.warn({ err }, 'OpenAI extraction fallback failed');
    return EMPTY_RESULT;
  }
}

// ── ExtractionService ──────────────────────────────────────────────────────────

export class ExtractionService {

  /**
   * Extract entities and facts from a memory's plaintext content.
   * Never throws — returns empty arrays on any failure.
   *
   * Priority: Python microservice → Anthropic → OpenAI → empty result
   */
  async extract(params: ExtractParams): Promise<ExtractionResult> {
    // 1. Try Python microservice first (dedicated extraction container)
    const pythonResult = await callPythonService(params);
    if (pythonResult) {
      logger.debug({ memoryId: params.memoryId, entityCount: pythonResult.entities.length }, 'Extraction via Python service');
      return pythonResult;
    }

    // 2. Anthropic fallback
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropicResult = await callAnthropic(params.content);
      if (anthropicResult.entities.length > 0 || anthropicResult.facts.length > 0) {
        logger.debug({ memoryId: params.memoryId, entityCount: anthropicResult.entities.length }, 'Extraction via Anthropic');
        return anthropicResult;
      }
    }

    // 3. OpenAI fallback
    if (process.env.OPENAI_API_KEY) {
      const openaiResult = await callOpenAI(params.content);
      logger.debug({ memoryId: params.memoryId, entityCount: openaiResult.entities.length }, 'Extraction via OpenAI');
      return openaiResult;
    }

    // 4. All extraction unavailable — return empty (non-blocking)
    return EMPTY_RESULT;
  }
}

export const extractionService = new ExtractionService();
