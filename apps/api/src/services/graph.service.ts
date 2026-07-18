import neo4j, { type Driver, type Session } from 'neo4j-driver';
import { createLogger } from '../utils/logger.js';
import type { GraphFact } from '@mneme/shared';

const logger = createLogger('graph-service');

// ── Types ────────────────────────────────────────────────────────────────────

interface StoreFact {
  subjectLabel: string;
  subjectType: string;
  objectLabel: string;
  objectType: string;
  factContent: string;
  confidence: number;
  sourceMemoryId: string;
  validFrom: Date;
}

interface SupersedeFact {
  vaultId: string;
  subjectLabel: string;
  factPattern: string;
  validUntil: Date;
}

// ── Service ──────────────────────────────────────────────────────────────────

export class GraphService {
  private driver: Driver | null = null;
  private _available = false;
  private _warnedOnce = false;

  constructor() {
    this.initDriver();
  }

  private initDriver(): void {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER ?? 'neo4j';
    const password = process.env.NEO4J_PASSWORD ?? 'password';

    if (!uri) {
      logger.warn('NEO4J_URI not set — graph features disabled');
      return;
    }

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        connectionTimeout: 5000,
        maxConnectionPoolSize: 10,
        connectionAcquisitionTimeout: 3000,
      });

      // Verify connectivity async — don't block startup
      this.driver.verifyConnectivity()
        .then(() => {
          this._available = true;
          logger.info({ uri }, 'Neo4j connected');
        })
        .catch((err) => {
          logger.warn({ err: err.message }, 'Neo4j unavailable — graph features disabled');
          this._available = false;
        });
    } catch (err) {
      logger.warn({ err }, 'Failed to create Neo4j driver — graph features disabled');
      this._available = false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.driver) return false;
    try {
      await this.driver.verifyConnectivity();
      this._available = true;
      return true;
    } catch {
      this._available = false;
      return false;
    }
  }

  /** Synchronous availability check — uses cached status */
  isAvailableSync(): boolean {
    return this._available;
  }

  private logUnavailable(): void {
    if (!this._warnedOnce) {
      logger.warn('Graph service called but Neo4j is unavailable — operation skipped');
      this._warnedOnce = true;
    }
  }

  private async withSession<T>(fn: (session: Session) => Promise<T>): Promise<T | null> {
    if (!this.driver || !this._available) {
      this.logUnavailable();
      return null;
    }
    const session = this.driver.session();
    try {
      return await fn(session);
    } catch (err) {
      logger.warn({ err }, 'Neo4j query failed');
      this._available = false;
      return null;
    } finally {
      await session.close();
    }
  }

  // ── Agent node ────────────────────────────────────────────────────────────

  /** Upsert an Agent node for this vault */
  async ensureAgent(vaultId: string): Promise<void> {
    await this.withSession(async (session) => {
      await session.run(
        `MERGE (a:Agent {vaultId: $vaultId})
         ON CREATE SET a.createdAt = datetime()`,
        { vaultId }
      );
    });
  }

  // ── Fact storage ──────────────────────────────────────────────────────────

  /**
   * Store an extracted fact as a temporal KNOWS edge between two Entity nodes.
   * Creates or updates entities and inserts a new KNOWS relationship.
   */
  async storeFact(params: {
    vaultId: string;
  } & StoreFact): Promise<void> {
    const { vaultId, subjectLabel, subjectType, objectLabel, objectType,
            factContent, confidence, sourceMemoryId, validFrom } = params;

    await this.withSession(async (session) => {
      await session.run(`
        MERGE (agent:Agent {vaultId: $vaultId})
        ON CREATE SET agent.createdAt = datetime()

        MERGE (subject:Entity {label: $subjectLabel, vaultId: $vaultId})
        ON CREATE SET subject.type = $subjectType, subject.id = randomUUID()

        MERGE (object:Entity {label: $objectLabel, vaultId: $vaultId})
        ON CREATE SET object.type = $objectType, object.id = randomUUID()

        CREATE (subject)-[:KNOWS {
          factContent: $factContent,
          confidence: $confidence,
          sourceMemoryId: $sourceMemoryId,
          validFrom: datetime($validFrom),
          validUntil: null,
          vaultId: $vaultId
        }]->(object)
      `, {
        vaultId,
        subjectLabel, subjectType,
        objectLabel, objectType,
        factContent, confidence, sourceMemoryId,
        validFrom: validFrom.toISOString(),
      });
    });
  }

  /**
   * Store multiple facts from an extraction result in a single transaction.
   */
  async storeFacts(
    vaultId: string,
    memoryId: string,
    facts: Array<{
      subject: string;
      subjectType: string;
      object: string;
      objectType: string;
      fact: string;
      confidence: number;
    }>,
    validFrom: Date,
  ): Promise<void> {
    if (facts.length === 0) return;

    for (const fact of facts) {
      await this.storeFact({
        vaultId,
        subjectLabel: fact.subject,
        subjectType: fact.subjectType,
        objectLabel: fact.object,
        objectType: fact.objectType,
        factContent: fact.fact,
        confidence: fact.confidence,
        sourceMemoryId: memoryId,
        validFrom,
      });
    }
  }

  /**
   * Close the validity window on facts matching a pattern — used when a
   * contradicting fact arrives (temporal graph evolution).
   */
  async supersedeFact(params: SupersedeFact): Promise<void> {
    const { vaultId, subjectLabel, factPattern, validUntil } = params;

    await this.withSession(async (session) => {
      await session.run(`
        MATCH (subject:Entity {label: $subjectLabel, vaultId: $vaultId})
              -[r:KNOWS {vaultId: $vaultId}]->(:Entity)
        WHERE r.validUntil IS NULL
          AND r.factContent CONTAINS $factPattern
        SET r.validUntil = datetime($validUntil)
      `, {
        vaultId, subjectLabel, factPattern,
        validUntil: validUntil.toISOString(),
      });
    });
  }

  // ── Temporal queries ──────────────────────────────────────────────────────

  /**
   * Get all facts valid at a specific timestamp (bitemporal query).
   */
  async getFactsAt(vaultId: string, timestamp: Date): Promise<GraphFact[]> {
    const result = await this.withSession(async (session) => {
      const res = await session.run(`
        MATCH (subject:Entity {vaultId: $vaultId})-[r:KNOWS]->(object:Entity)
        WHERE r.vaultId = $vaultId
          AND r.validFrom <= datetime($timestamp)
          AND (r.validUntil IS NULL OR r.validUntil > datetime($timestamp))
        RETURN subject.label AS subject, r.factContent AS predicate,
               object.label AS object, r.validFrom AS validFrom,
               r.validUntil AS validUntil, r.confidence AS confidence,
               r.sourceMemoryId AS sourceMemoryId
        ORDER BY r.confidence DESC
        LIMIT 100
      `, { vaultId, timestamp: timestamp.toISOString() });

      return res.records.map(r => ({
        subject: r.get('subject'),
        predicate: r.get('predicate'),
        object: r.get('object'),
        validFrom: r.get('validFrom')?.toString() ?? new Date().toISOString(),
        validUntil: r.get('validUntil')?.toString(),
        confidence: r.get('confidence'),
        sourceMemoryId: r.get('sourceMemoryId'),
      })) as GraphFact[];
    });

    return result ?? [];
  }

  /**
   * Get all facts about a specific entity label in this vault.
   */
  async getEntityFacts(vaultId: string, entityLabel: string): Promise<GraphFact[]> {
    const result = await this.withSession(async (session) => {
      const res = await session.run(`
        MATCH (subject:Entity {label: $entityLabel, vaultId: $vaultId})-[r:KNOWS]->(object:Entity)
        RETURN subject.label AS subject, r.factContent AS predicate,
               object.label AS object, r.validFrom AS validFrom,
               r.validUntil AS validUntil, r.confidence AS confidence,
               r.sourceMemoryId AS sourceMemoryId
        ORDER BY r.validFrom DESC
        LIMIT 50
      `, { vaultId, entityLabel });

      return res.records.map(r => ({
        subject: r.get('subject'),
        predicate: r.get('predicate'),
        object: r.get('object'),
        validFrom: r.get('validFrom')?.toString() ?? '',
        validUntil: r.get('validUntil')?.toString(),
        confidence: r.get('confidence'),
        sourceMemoryId: r.get('sourceMemoryId'),
      })) as GraphFact[];
    });

    return result ?? [];
  }

  /** Close the driver on graceful shutdown */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this._available = false;
    }
  }
}

export const graphService = new GraphService();
