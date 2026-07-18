import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('decay-job');

export class DecayJob {
  /**
   * Applies the Ebbinghaus forgetting curve decay to all untouched memories.
   * Runs as a cron job or scheduled task.
   */
  async run() {
    logger.info('Starting Memory Decay Job...');
    try {
      // Apply decay formula directly in Postgres.
      // importance = MAX(0.05, importance * EXP(-decay_rate * days_since_last_retrieved))
      // where days_since_last_retrieved is calculated from last_retrieved_at (or created_at if never retrieved).
      const result = await db.execute(sql`
        UPDATE memories
        SET importance = GREATEST(
          0.05,
          importance * EXP(-decay_rate * EXTRACT(EPOCH FROM (NOW() - COALESCE(last_retrieved_at, created_at))) / 86400)
        )
        WHERE deleted_at IS NULL
          AND importance > 0.05;
      `);

      logger.info({ rowsAffected: result.count }, 'Decay Job completed successfully');
    } catch (err) {
      logger.error({ err }, 'Decay Job failed');
    }
  }
}

export const decayJob = new DecayJob();
