import type { MemoryType, ClassificationResult } from '@mneme/shared';
import { TOKEN_COUNT_ESTIMATE_RATIO } from '@mneme/shared';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('classifier');

// ─────────────────────────────────────────────────────────────────────────────
// Rule Patterns
// Each entry is a tuple of [regex, score_weight]. We collect scores per type
// and pick the highest. Confidence = winner_score / max_possible_score.
// ─────────────────────────────────────────────────────────────────────────────

type PatternEntry = [RegExp, number];

const PATTERNS: Record<MemoryType, PatternEntry[]> = {
  working: [
    [/\bcurrent(ly)?\b/i, 1],
    [/\bright now\b/i, 2],
    [/\bthis (conversation|chat|session)\b/i, 2],
    [/\bin this (chat|conversation)\b/i, 2],
    [/\bjust told me\b/i, 2],
    [/\bthis message\b/i, 1],
    [/\bwe('re| are) (currently|now)\b/i, 1],
  ],

  procedural: [
    [/\balways\b/i, 2],
    [/\bnever\b/i, 2],
    [/\bprefer\b/i, 1],
    [/\bthe rule is\b/i, 3],
    [/\bworkflow\b/i, 2],
    [/\bshould always\b/i, 3],
    [/\bbest practice\b/i, 2],
    [/\bwhenever\b/i, 1],
    [/\bmake sure to\b/i, 2],
    [/\bstandard (procedure|process)\b/i, 2],
    [/\buse\b.{0,30}\bby default\b/i, 2],
    [/\bdo(n't| not)\b.{0,30}\b(unless|except)\b/i, 2],
  ],

  semantic: [
    [/\bis (a|an)\b/i, 2],
    [/\bworks? at\b/i, 2],
    [/\bmeans?\b/i, 1],
    [/\bdefined? as\b/i, 2],
    [/\bstands? for\b/i, 2],
    [/\brefers? to\b/i, 2],
    [/\bis (the|a) (ceo|cto|founder|director|head|lead|manager)\b/i, 3],
    [/\b[A-Z][a-z]+ [A-Z][a-z]+\b/, 1], // Proper nouns (two capitalized words)
    [/\bis (located|based) (in|at)\b/i, 2],
    [/\bknown as\b/i, 1],
  ],

  episodic: [
    [/\b\w+ed\b/, 1], // past tense verbs ending in -ed
    [/\bhappened\b/i, 2],
    [/\bdecided\b/i, 2],
    [/\bcompleted?\b/i, 1],
    [/\byesterday\b/i, 2],
    [/\blast (week|month|year|time)\b/i, 2],
    [/\b(on|in) (january|february|march|april|may|june|july|august|september|october|november|december)\b/i, 2],
    [/\b\d{4}-\d{2}-\d{2}\b/, 2], // ISO date
    [/\bmeeting\b/i, 1],
    [/\bdiscussed?\b/i, 1],
    [/\bagreed?\b/i, 1],
    [/\bI (was|had|went|did|made|said)\b/i, 2],
  ],

  relational: [
    [/\breports? to\b/i, 3],
    [/\bowned? by\b/i, 2],
    [/\bdepends? on\b/i, 2],
    [/\brelated to\b/i, 2],
    [/\bworks? with\b/i, 2],
    [/\bmanages?\b/i, 2],
    [/\bbelongs? to\b/i, 2],
    [/\bpart of\b/i, 1],
    [/\bparent (of|company)\b/i, 2],
    [/\bsubsidiary (of)?\b/i, 2],
    [/\b[A-Z][a-z]+ (and|vs\.?) [A-Z][a-z]+\b/, 1], // "A and B" proper nouns
  ],
};

// Max possible score per type (sum of all pattern weights)
const MAX_SCORES: Record<MemoryType, number> = Object.fromEntries(
  Object.entries(PATTERNS).map(([type, entries]) => [
    type,
    entries.reduce((sum, [, w]) => sum + w, 0),
  ]),
) as Record<MemoryType, number>;

// Default when nothing matches
const DEFAULT_TYPE: MemoryType = 'episodic';

// ─────────────────────────────────────────────────────────────────────────────
// ClassifierService
// ─────────────────────────────────────────────────────────────────────────────

export class ClassifierService {
  /**
   * Classify a memory into one of the 5 types.
   *
   * - If hintType is provided, it is used as-is (method: 'hint', confidence: 1.0).
   * - Otherwise, rule-based pattern matching is run (method: 'rule').
   * - If no patterns match, falls back to 'episodic' (confidence: 0.1).
   */
  classify(content: string, hintType?: MemoryType): ClassificationResult {
    // Fast path: caller knows the type
    if (hintType) {
      logger.debug({ hintType }, 'Classifier: using caller hint');
      return { type: hintType, confidence: 1.0, method: 'hint' };
    }

    const scores: Partial<Record<MemoryType, number>> = {};

    for (const [type, patterns] of Object.entries(PATTERNS) as [MemoryType, PatternEntry[]][]) {
      let score = 0;
      for (const [pattern, weight] of patterns) {
        if (pattern.test(content)) {
          score += weight;
        }
      }
      if (score > 0) {
        scores[type] = score;
      }
    }

    // Find winner
    let bestType: MemoryType = DEFAULT_TYPE;
    let bestScore = 0;

    for (const [type, score] of Object.entries(scores) as [MemoryType, number][]) {
      if (score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    // Compute confidence: ratio of matched score to max possible for that type
    const confidence = bestScore > 0
      ? Math.min(1, bestScore / MAX_SCORES[bestType])
      : 0.1; // low-confidence default

    logger.debug({ type: bestType, confidence, scores }, 'Classifier: rule-based result');

    return { type: bestType, confidence, method: 'rule' };
  }

  /**
   * Estimate token count for a string using a char/4 heuristic.
   * Good enough for knapsack budget — not GPT-exact.
   */
  estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / TOKEN_COUNT_ESTIMATE_RATIO));
  }
}

export const classifierService = new ClassifierService();
