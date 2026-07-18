/**
 * ClassifierService — Unit Tests
 *
 * Covers:
 * - All 5 memory type patterns
 * - Hint override (bypasses rules)
 * - Confidence is always in [0, 1]
 * - Default fallback to episodic
 * - Token count estimator
 */

import { describe, it, expect } from 'vitest';
import { ClassifierService } from '../services/classifier.js';

const classifier = new ClassifierService();

// ─────────────────────────────────────────────────────────────────────────────
// Type Detection
// ─────────────────────────────────────────────────────────────────────────────

describe('ClassifierService.classify — type detection', () => {

  it('classifies working memory from "right now in this conversation"', () => {
    const result = classifier.classify('Right now in this conversation I need you to remember X');
    expect(result.type).toBe('working');
    expect(result.confidence).toBeGreaterThan(0.1);
    expect(result.method).toBe('rule');
  });

  it('classifies working memory from "just told me"', () => {
    const result = classifier.classify('You just told me the user\'s name is Alice');
    expect(result.type).toBe('working');
  });

  it('classifies procedural memory from "always"', () => {
    const result = classifier.classify('Always use TypeScript strict mode for new code');
    expect(result.type).toBe('procedural');
    expect(result.confidence).toBeGreaterThan(0); // single pattern match → low but valid
  });

  it('classifies procedural memory from "should always"', () => {
    const result = classifier.classify('We should always validate input before saving to DB');
    expect(result.type).toBe('procedural');
  });

  it('classifies procedural memory from "the rule is"', () => {
    const result = classifier.classify('The rule is to never expose raw secrets in logs');
    expect(result.type).toBe('procedural');
  });

  it('classifies semantic memory from "is a company"', () => {
    const result = classifier.classify('Anthropic is a company that makes Claude');
    expect(result.type).toBe('semantic');
  });

  it('classifies semantic memory from "stands for"', () => {
    const result = classifier.classify('MCP stands for Model Context Protocol');
    expect(result.type).toBe('semantic');
  });

  it('classifies semantic memory from "is the CEO"', () => {
    const result = classifier.classify('Dario Amodei is the CEO of Anthropic');
    expect(result.type).toBe('semantic');
  });

  it('classifies episodic memory from past tense with date', () => {
    const result = classifier.classify('Yesterday we decided to switch from Prisma to Drizzle');
    expect(result.type).toBe('episodic');
  });

  it('classifies episodic memory from "last week"', () => {
    const result = classifier.classify('Last week the team agreed to use Turborepo');
    expect(result.type).toBe('episodic');
  });

  it('classifies episodic memory from ISO date', () => {
    const result = classifier.classify('On 2026-03-15 we completed the first beta release');
    expect(result.type).toBe('episodic');
  });

  it('classifies relational memory from "reports to"', () => {
    const result = classifier.classify('Alice reports to Bob in the engineering org');
    expect(result.type).toBe('relational');
  });

  it('classifies relational memory from "owned by"', () => {
    const result = classifier.classify('The billing module is owned by the payments team');
    expect(result.type).toBe('relational');
  });

  it('classifies relational memory from "depends on"', () => {
    const result = classifier.classify('The extraction service depends on the API service');
    expect(result.type).toBe('relational');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hint Override
// ─────────────────────────────────────────────────────────────────────────────

describe('ClassifierService.classify — hint override', () => {

  it('returns hintType regardless of content when hint provided', () => {
    // Content looks procedural, but hint forces working
    const result = classifier.classify('Always use strict mode', 'working');
    expect(result.type).toBe('working');
    expect(result.confidence).toBe(1.0);
    expect(result.method).toBe('hint');
  });

  it('returns relational when hinted, even for episodic content', () => {
    const result = classifier.classify('Yesterday we met with Alice', 'relational');
    expect(result.type).toBe('relational');
    expect(result.method).toBe('hint');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Default Fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('ClassifierService.classify — fallback', () => {

  it('falls back to episodic with low confidence when nothing matches', () => {
    const result = classifier.classify('x');
    expect(result.type).toBe('episodic');
    expect(result.confidence).toBe(0.1);
    expect(result.method).toBe('rule');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Confidence Range
// ─────────────────────────────────────────────────────────────────────────────

describe('ClassifierService.classify — confidence invariants', () => {

  const samples = [
    'Right now in this conversation we are discussing billing',
    'Always validate input data before persisting to DB',
    'OpenAI is an AI company founded in 2015',
    'Last week the sprint review went well and we shipped v1',
    'Alice reports to Bob and manages the frontend team',
    'x',
    '',
  ];

  for (const content of samples) {
    it(`confidence is in [0,1] for: "${content.slice(0, 40)}"`, () => {
      const result = classifier.classify(content);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Token Estimator
// ─────────────────────────────────────────────────────────────────────────────

describe('ClassifierService.estimateTokens', () => {

  it('estimates at least 1 token for any string', () => {
    expect(classifier.estimateTokens('')).toBe(1);
    expect(classifier.estimateTokens('x')).toBe(1);
  });

  it('estimates ~4 chars per token', () => {
    const text = 'a'.repeat(400);
    expect(classifier.estimateTokens(text)).toBe(100);
  });

  it('rounds up for non-divisible lengths', () => {
    const text = 'a'.repeat(5); // 5/4 = 1.25 → ceil = 2
    expect(classifier.estimateTokens(text)).toBe(2);
  });

  it('handles typical memory content (~10-50 tokens)', () => {
    const content = 'Always use TypeScript strict mode for all new code in this project';
    const tokens = classifier.estimateTokens(content);
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(100);
  });
});
