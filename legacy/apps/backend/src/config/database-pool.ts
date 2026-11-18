import { Pool } from 'pg';
import { logger } from '../utils/logger.js';

/**
 * PostgreSQL connection pool configuration
 * Provides optimized database connections for high-performance operations
 */

let pool: Pool | null = null;

export interface PoolConfig {
  connectionString: string;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  maxUses?: number;
  allowExitOnIdle?: boolean;
}

/**
 * Initialize connection pool with optimized settings
 */
export const initializePool = (config?: Partial<PoolConfig>): Pool => {
  if (pool) {
    return pool;
  }

  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL!,
    // Connection pool settings optimized for SaaS workload
    max: config?.max || 20, // Maximum number of connections
    min: config?.min || 2,  // Minimum number of connections to maintain
    idleTimeoutMillis: config?.idleTimeoutMillis || 30000, // 30 seconds
    connectionTimeoutMillis: config?.connectionTimeoutMillis || 10000, // 10 seconds
    maxUses: config?.maxUses || 7500, // Maximum uses per connection before recycling
    allowExitOnIdle: config?.allowExitOnIdle || true,
  };

  pool = new Pool(poolConfig);

  // Connection event handlers
  pool.on('connect', (client) => {
    logger.debug('New database connection established', {
      processId: client.processID,
      totalCount: pool?.totalCount,
      idleCount: pool?.idleCount,
      waitingCount: pool?.waitingCount,
    });
  });

  pool.on('acquire', (client) => {
    logger.debug('Connection acquired from pool', {
      processId: client.processID,
      totalCount: pool?.totalCount,
      idleCount: pool?.idleCount,
      waitingCount: pool?.waitingCount,
    });
  });

  pool.on('release', (client) => {
    logger.debug('Connection released back to pool', {
      processId: client.processID,
      totalCount: pool?.totalCount,
      idleCount: pool?.idleCount,
      waitingCount: pool?.waitingCount,
    });
  });

  pool.on('remove', (client) => {
    logger.debug('Connection removed from pool', {
      processId: client.processID,
      totalCount: pool?.totalCount,
      idleCount: pool?.idleCount,
      waitingCount: pool?.waitingCount,
    });
  });

  pool.on('error', (err, client) => {
    logger.error('Database pool error:', {
      error: err.message,
      processId: client?.processID,
      totalCount: pool?.totalCount,
      idleCount: pool?.idleCount,
      waitingCount: pool?.waitingCount,
    });
  });

  logger.info('Database connection pool initialized', {
    max: poolConfig.max,
    min: poolConfig.min,
    idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
  });

  return pool;
};

/**
 * Get the connection pool instance
 */
export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Connection pool not initialized. Call initializePool() first.');
  }
  return pool;
};

/**
 * Execute a query with automatic connection management
 */
export const executeQuery = async <T = any>(
  text: string,
  params?: any[]
): Promise<T[]> => {
  const client = await getPool().connect();
  try {
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      logger.debug('Query executed', {
        query: text,
        params,
        duration: `${duration}ms`,
        rowCount: result.rowCount,
      });
    }

    return result.rows;
  } catch (error) {
    logger.error('Query execution failed:', {
      error: error instanceof Error ? error.message : error,
      query: text,
      params,
    });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute a transaction with automatic rollback on error
 */
export const executeTransaction = async <T>(
  callback: (client: any) => Promise<T>
): Promise<T> => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back:', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get pool statistics
 */
export const getPoolStats = () => {
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: pool.options.max,
    minConnections: pool.options.min,
  };
};

/**
 * Close the connection pool
 */
export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
};

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await closePool();
});

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});