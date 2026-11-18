import { beforeAll, afterAll, vi } from 'vitest';

// Mock environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_SECRET = 'test-secret';
  process.env.LEMONSQUEEZY_API_KEY = 'test-key';
  process.env.LEMONSQUEEZY_STORE_ID = 'test-store';
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';
});

// Clean up after all tests
afterAll(() => {
  vi.clearAllMocks();
});

// Mock external dependencies
vi.mock('../config/database.js', () => ({
  getDatabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));