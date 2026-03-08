import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Global variable to store the Prisma client instance
let prisma: PrismaClient | null = null;

/**
 * Initialize Prisma client with proper configuration
 */
export const initializePrisma = async (): Promise<PrismaClient> => {
  try {
    if (prisma) {
      return prisma;
    }

    // Create Prisma client with optimized configuration
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Set up logging
    prisma.$on('query', (e) => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Prisma Query:', {
          query: e.query,
          params: e.params,
          duration: `${e.duration}ms`,
        });
      }
    });

    prisma.$on('error', (e) => {
      logger.error('Prisma Error:', e);
    });

    prisma.$on('info', (e) => {
      logger.info('Prisma Info:', e);
    });

    prisma.$on('warn', (e) => {
      logger.warn('Prisma Warning:', e);
    });

    // Test the connection
    await prisma.$connect();
    
    // Verify database connection with a simple query
    await prisma.user.findFirst({
      take: 1,
    });

    logger.info('Prisma client initialized successfully');
    return prisma;
  } catch (error) {
    logger.error('Failed to initialize Prisma client:', error);
    throw error;
  }
};

/**
 * Get the Prisma client instance
 */
export const getPrisma = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Prisma client not initialized. Call initializePrisma() first.');
  }
  return prisma;
};

/**
 * Disconnect Prisma client
 */
export const disconnectPrisma = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Prisma client disconnected');
  }
};

/**
 * Health check for database connection
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    if (!prisma) {
      return false;
    }
    
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};

/**
 * Get database connection info
 */
export const getDatabaseInfo = async () => {
  try {
    if (!prisma) {
      throw new Error('Prisma client not initialized');
    }

    const result = await prisma.$queryRaw`
      SELECT 
        version() as version,
        current_database() as database,
        current_user as user,
        inet_server_addr() as host,
        inet_server_port() as port
    ` as any[];

    return result[0];
  } catch (error) {
    logger.error('Failed to get database info:', error);
    throw error;
  }
};

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await disconnectPrisma();
});

process.on('SIGINT', async () => {
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectPrisma();
  process.exit(0);
});