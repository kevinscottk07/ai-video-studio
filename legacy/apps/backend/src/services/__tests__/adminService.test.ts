import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminService } from '../adminService';
import { databaseService } from '../databaseService';

// Mock the database service
vi.mock('../databaseService', () => ({
  databaseService: {
    db: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            count: 100
          })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              count: 10
            })),
            lt: vi.fn(() => ({
              count: 5
            }))
          }))
        }))
      }))
    },
    getUserById: vi.fn(),
    getUserByAuthProviderId: vi.fn(),
    getUserByEmail: vi.fn(),
    updateUser: vi.fn(),
    updateLastLogin: vi.fn(),
    softDeleteUser: vi.fn()
  }
}));

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      const metrics = await adminService.getDashboardMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.users).toBeDefined();
      expect(metrics.revenue).toBeDefined();
      expect(metrics.usage).toBeDefined();
      expect(metrics.system).toBeDefined();
    });

    it('should handle date range filtering', async () => {
      const dateRange = {
        start: new Date('2023-01-01'),
        end: new Date('2023-12-31')
      };
      
      const metrics = await adminService.getDashboardMetrics(dateRange);
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.users.total).toBe('number');
      expect(typeof metrics.revenue.total).toBe('number');
    });
  });

  describe('getPricingConfig', () => {
    it('should return pricing configuration', async () => {
      const config = await adminService.getPricingConfig();
      
      expect(config).toBeDefined();
      expect(config.creditPrice).toBeDefined();
      expect(config.operationCosts).toBeDefined();
      expect(config.subscriptionPlans).toBeDefined();
      expect(Array.isArray(config.subscriptionPlans)).toBe(true);
    });
  });

  describe('updatePricingConfig', () => {
    it('should update pricing configuration', async () => {
      const updates = {
        creditPrice: 60 // 60 cents per credit
      };
      
      const result = await adminService.updatePricingConfig({ config: updates });
      
      expect(result).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.config.creditPrice).toBe(60);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      // Mock the database response
      const mockUsers = [
        {
          id: '1',
          email: 'test@example.com',
          auth_provider_id: 'auth0|123',
          display_name: 'Test User',
          profile_image: null,
          language: 'en',
          timezone: 'UTC',
          credit_balance: 100,
          total_credits_ever: 100,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
          is_active: true,
          role: 'user'
        }
      ];

      // Mock the database query chain
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockUsers,
          error: null,
          count: 1
        })
      };

      vi.mocked(databaseService.db.from).mockReturnValue(mockQuery as any);

      const result = await adminService.getUsers({
        pagination: { page: 1, limit: 20 }
      });
      
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});