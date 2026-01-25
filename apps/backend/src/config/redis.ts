import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('ready', () => {
      logger.info('Redis ready');
    });

    redis.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  return redis;
};

export const connectRedis = async (): Promise<Redis> => {
  const client = getRedisClient();
  
  try {
    await client.connect();
    
    // Test the connection
    await client.ping();
    logger.info('Redis connection test successful');
    
    return client;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('Redis disconnected');
  }
};

// Cache utilities
export const cache = {
  get: async (key: string): Promise<string | null> => {
    const client = getRedisClient();
    return await client.get(key);
  },

  set: async (key: string, value: string, ttl?: number): Promise<void> => {
    const client = getRedisClient();
    if (ttl) {
      await client.setex(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  },

  del: async (key: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(key);
  },

  exists: async (key: string): Promise<boolean> => {
    const client = getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  expire: async (key: string, ttl: number): Promise<void> => {
    const client = getRedisClient();
    await client.expire(key, ttl);
  },

  // Hash operations
  hget: async (key: string, field: string): Promise<string | null> => {
    const client = getRedisClient();
    return await client.hget(key, field);
  },

  hset: async (key: string, field: string, value: string): Promise<void> => {
    const client = getRedisClient();
    await client.hset(key, field, value);
  },

  hgetall: async (key: string): Promise<Record<string, string>> => {
    const client = getRedisClient();
    return await client.hgetall(key);
  },

  // List operations
  lpush: async (key: string, ...values: string[]): Promise<number> => {
    const client = getRedisClient();
    return await client.lpush(key, ...values);
  },

  rpop: async (key: string): Promise<string | null> => {
    const client = getRedisClient();
    return await client.rpop(key);
  },

  llen: async (key: string): Promise<number> => {
    const client = getRedisClient();
    return await client.llen(key);
  },

  // Set operations
  sadd: async (key: string, ...members: string[]): Promise<number> => {
    const client = getRedisClient();
    return await client.sadd(key, ...members);
  },

  srem: async (key: string, ...members: string[]): Promise<number> => {
    const client = getRedisClient();
    return await client.srem(key, ...members);
  },

  smembers: async (key: string): Promise<string[]> => {
    const client = getRedisClient();
    return await client.smembers(key);
  },
};