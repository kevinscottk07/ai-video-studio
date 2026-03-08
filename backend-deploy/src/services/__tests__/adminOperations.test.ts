import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { adminService } from '../adminService.js';
import { databaseService } from '../databaseService.js';
import { creditService } from '../creditService.js';
import { realTimeService } from '../realTimeService.js';
import type { 
  User, 
  UserRole, 
  AdminDashboardMetrics, 
  UpdateUserRequest,
  PricingConfig,
  AuditLogEntry 
} from '../types/index.js';

// Mock dependencies
jest.mock('../databaseService.js');
jest.mock('../creditService.js');
jest.mock('../realTimeService.js');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;
const mockCreditService = creditService as jest.Mocked<typeof creditService>;
const mockRealTimeService = realTimeService as jest.Mocked<typeof realTimeService>;

describe('Admin Operations - Unit Tests', () => {
  const mockAdminId = 'admin-123';
  const mockUserId = 'user-456';

  const mockAdmin: User = {
    id: mockAdminId,
    email: 'admin@example.com',
    authProviderId: 'auth0|admin123',
    displayName: 'Admin User',
    profileImage: null,
    language: 'en',
    timezone: 'UTC',
    creditBalance: 1000,
    totalCreditsEver: 5000,
    role: 'admin',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockUser: User = {
    id: mockUserId,
    email: 'user@example.com',
    authProviderId: 'auth0|user456',
    displayName: 'Regular User',
    profileImage: null,
    language: 'en',
    timezone: 'UTC',
    creditBalance: 100,
    totalCreditsEver: 500,
    role: 'user',
    isActive: true,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDatabaseService.getUserById.mockImplementation(async (id) => {
      if (id === mockAdminId) return mockAdmin;
      if (id === mockUserId) return mockUser;
      return null;
    });
    
    mockDatabaseService.createAuditLog.mockResolvedValue({
      id: 'audit-123',
      userId: mockAdminId,
      action: 'test_action',
      resource: 'test_resource',
      createdAt: new Date(),
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('User Management Operations', () => {
    it('should get users with filtering and pagination', async () => {
      const mockUsers = [mockUser, { ...mockUser, id: 'user-789', email: 'user2@example.com' }];
      
      mockDatabaseService.getUsers = jest.fn().mockResolvedValue({
        users: mockUsers,
        total: 2,
        hasMore: false,
      });

      const result = await adminService.getUsers({
        filters: {
          role: ['user'],
          isActive: true,
          search: 'user',
        },
        pagination: {
          page: 1,
          limit: 20,
        },
      });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      
      expect(mockDatabaseService.getUsers).toHaveBeenCalledWith({
        filters: {
          role: ['user'],
          isActive: true,
          search: 'user',
        },
        pagination: {
          page: 1,
          limit: 20,
        },
      });
    });

    it('should update user details with proper validation', async () => {
      const updateRequest: UpdateUserRequest = {
        userId: mockUserId,
        updates: {
          displayName: 'Updated User Name',
          role: 'moderator',
          creditBalance: 200,
          isActive: true,
        },
      };

      const updatedUser = {
        ...mockUser,
        displayName: 'Updated User Name',
        role: 'moderator' as UserRole,
        creditBalance: 200,
        updatedAt: new Date(),
      };

      mockDatabaseService.updateUser.mockResolvedValue(updatedUser);

      const result = await adminService.updateUser(updateRequest);

      expect(result.user).toEqual(updatedUser);
      expect(result.success).toBe(true);

      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith(
        mockUserId,
        updateRequest.updates
      );

      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: undefined, // Admin ID would be passed in real implementation
        action: 'update_user',
        resource: 'user',
        resourceId: mockUserId,
        oldValues: expect.any(Object),
        newValues: updateRequest.updates,
      });
    });

    it('should prevent unauthorized role escalation', async () => {
      const updateRequest: UpdateUserRequest = {
        userId: mockUserId,
        updates: {
          role: 'admin', // Trying to escalate to admin
        },
      };

      // Mock that the requesting user is a moderator, not admin
      const moderatorUser = { ...mockAdmin, role: 'moderator' as UserRole };
      mockDatabaseService.getUserById.mockResolvedValue(moderatorUser);

      await expect(
        adminService.updateUser(updateRequest)
      ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');

      expect(mockDatabaseService.updateUser).not.toHaveBeenCalled();
    });

    it('should handle user deactivation properly', async () => {
      const updateRequest: UpdateUserRequest = {
        userId: mockUserId,
        updates: {
          isActive: false,
        },
      };

      const deactivatedUser = {
        ...mockUser,
        isActive: false,
        updatedAt: new Date(),
      };

      mockDatabaseService.updateUser.mockResolvedValue(deactivatedUser);
      mockDatabaseService.cancelUserSubscriptions = jest.fn().mockResolvedValue();
      mockDatabaseService.cancelUserJobs = jest.fn().mockResolvedValue();

      const result = await adminService.updateUser(updateRequest);

      expect(result.user.isActive).toBe(false);
      
      // Should cancel active subscriptions and jobs
      expect(mockDatabaseService.cancelUserSubscriptions).toHaveBeenCalledWith(mockUserId);
      expect(mockDatabaseService.cancelUserJobs).toHaveBeenCalledWith(mockUserId);

      // Should notify user of deactivation
      expect(mockRealTimeService.notifyUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          type: 'warning',
          title: 'Account Deactivated',
        })
      );
    });

    it('should handle bulk user operations', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const bulkUpdate = {
        role: 'moderator' as UserRole,
        isActive: true,
      };

      mockDatabaseService.bulkUpdateUsers = jest.fn().mockResolvedValue({
        updatedCount: 3,
        failedUpdates: [],
      });

      const result = await adminService.bulkUpdateUsers(userIds, bulkUpdate);

      expect(result.updatedCount).toBe(3);
      expect(result.failedUpdates).toHaveLength(0);

      expect(mockDatabaseService.bulkUpdateUsers).toHaveBeenCalledWith(
        userIds,
        bulkUpdate
      );

      // Should create audit log for bulk operation
      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: undefined,
        action: 'bulk_update_users',
        resource: 'user',
        resourceId: userIds.join(','),
        newValues: bulkUpdate,
      });
    });

    it('should validate user data before updates', async () => {
      const invalidUpdateRequest: UpdateUserRequest = {
        userId: mockUserId,
        updates: {
          email: 'invalid-email', // Invalid email format
          creditBalance: -100, // Negative credit balance
        },
      };

      await expect(
        adminService.updateUser(invalidUpdateRequest)
      ).rejects.toThrow('VALIDATION_ERROR');

      expect(mockDatabaseService.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('System Monitoring and Analytics', () => {
    it('should generate comprehensive dashboard metrics', async () => {
      // Mock database queries for metrics
      mockDatabaseService.db = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        sum: jest.fn().mockReturnThis(),
      } as any;

      // Mock user metrics
      (mockDatabaseService.db.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 1000 }), // Total users
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({ count: 750 }), // Active users
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({ count: 50 }), // New users current period
            }),
          }),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({ count: 40 }), // New users previous period
            }),
          }),
        });

      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const metrics = await adminService.getDashboardMetrics(dateRange);

      expect(metrics).toHaveProperty('users');
      expect(metrics).toHaveProperty('revenue');
      expect(metrics).toHaveProperty('usage');
      expect(metrics).toHaveProperty('system');

      expect(metrics.users.total).toBe(1000);
      expect(metrics.users.active).toBe(750);
      expect(metrics.users.new).toBe(50);
      expect(metrics.users.growth).toBeCloseTo(25); // (50-40)/40 * 100
    });

    it('should track system performance metrics', async () => {
      mockDatabaseService.getSystemHealth = jest.fn().mockResolvedValue({
        database: { status: 'healthy', responseTime: 15 },
        redis: { status: 'healthy', responseTime: 5 },
        s3: { status: 'healthy', responseTime: 100 },
        sagemaker: { status: 'healthy', responseTime: 200 },
      });

      mockDatabaseService.getActiveJobsCount = jest.fn().mockResolvedValue(25);

      const metrics = await adminService.getSystemMetrics();

      expect(metrics.health.database.status).toBe('healthy');
      expect(metrics.health.redis.responseTime).toBe(5);
      expect(metrics.activeJobs).toBe(25);
    });

    it('should calculate revenue metrics accurately', async () => {
      // Mock credit purchases data
      const mockCreditPurchases = [
        { totalCost: 1999, createdAt: new Date('2024-01-15') }, // $19.99
        { totalCost: 4999, createdAt: new Date('2024-01-20') }, // $49.99
        { totalCost: 999, createdAt: new Date('2024-01-25') },  // $9.99
      ];

      mockDatabaseService.getCreditPurchases = jest.fn().mockResolvedValue(mockCreditPurchases);
      mockDatabaseService.getSubscriptionRevenue = jest.fn().mockResolvedValue(15000); // $150.00

      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const metrics = await adminService.getDashboardMetrics(dateRange);

      expect(metrics.revenue.total).toBe(22997); // 79.97 + 150.00 in cents
      expect(metrics.revenue.credits).toBe(7997); // Credit purchases total
      expect(metrics.revenue.subscriptions).toBe(15000); // Subscription revenue
    });

    it('should handle metrics calculation errors gracefully', async () => {
      mockDatabaseService.db = {
        from: jest.fn().mockImplementation(() => {
          throw new Error('Database connection failed');
        }),
      } as any;

      await expect(
        adminService.getDashboardMetrics()
      ).rejects.toThrow('METRICS_FETCH_FAILED');
    });
  });

  describe('Pricing Configuration Management', () => {
    it('should get current pricing configuration', async () => {
      const mockPricingConfig: PricingConfig = {
        creditCosts: {
          video_generation: {
            baseCredits: 50,
            multipliers: {
              duration: { min: 0.5, max: 10.0 },
              resolution: { standard: 1.0, hd: 2.0, ultra: 4.0 },
              style: { social_media: 1.0, cinematic: 2.5, vr: 5.0 },
              quality: { draft: 0.5, standard: 1.0, high: 1.5, ultra: 2.0 },
            },
          },
          script_generation: { baseCredits: 10 },
          music_generation: { baseCredits: 20 },
        },
        profitMargins: {
          video_generation: 2.0, // 200% markup
          script_generation: 1.5, // 150% markup
          music_generation: 1.8, // 180% markup
        },
        subscriptionPlans: {
          starter: { price: 1999, creditsIncluded: 100 },
          pro: { price: 4999, creditsIncluded: 300 },
          ultra: { price: 9999, creditsIncluded: 1000 },
        },
      };

      mockDatabaseService.getPricingConfig = jest.fn().mockResolvedValue(mockPricingConfig);

      const config = await adminService.getPricingConfig();

      expect(config.creditCosts.video_generation.baseCredits).toBe(50);
      expect(config.profitMargins.video_generation).toBe(2.0);
      expect(config.subscriptionPlans.pro.price).toBe(4999);
    });

    it('should update pricing configuration with validation', async () => {
      const updateRequest = {
        creditCosts: {
          video_generation: {
            baseCredits: 60, // Increased from 50
            multipliers: {
              resolution: { standard: 1.0, hd: 2.2, ultra: 4.5 }, // Increased HD and Ultra
            },
          },
        },
        profitMargins: {
          video_generation: 2.2, // Increased margin
        },
      };

      mockDatabaseService.updatePricingConfig = jest.fn().mockResolvedValue({
        success: true,
        updatedAt: new Date(),
      });

      const result = await adminService.updatePricingConfig({
        updates: updateRequest,
        effectiveDate: new Date(),
      });

      expect(result.success).toBe(true);
      expect(mockDatabaseService.updatePricingConfig).toHaveBeenCalledWith(updateRequest);

      // Should create audit log for pricing changes
      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: undefined,
        action: 'update_pricing_config',
        resource: 'pricing_config',
        newValues: updateRequest,
      });
    });

    it('should validate pricing configuration changes', async () => {
      const invalidUpdateRequest = {
        creditCosts: {
          video_generation: {
            baseCredits: -10, // Invalid negative value
          },
        },
        profitMargins: {
          video_generation: 0.5, // Below minimum margin
        },
      };

      await expect(
        adminService.updatePricingConfig({
          updates: invalidUpdateRequest,
          effectiveDate: new Date(),
        })
      ).rejects.toThrow('INVALID_PRICING_CONFIG');

      expect(mockDatabaseService.updatePricingConfig).not.toHaveBeenCalled();
    });

    it('should handle pricing rollback scenarios', async () => {
      const rollbackRequest = {
        rollbackToDate: new Date('2024-01-01'),
        reason: 'Pricing update caused issues',
      };

      mockDatabaseService.rollbackPricingConfig = jest.fn().mockResolvedValue({
        success: true,
        rolledBackTo: rollbackRequest.rollbackToDate,
      });

      const result = await adminService.rollbackPricingConfig(rollbackRequest);

      expect(result.success).toBe(true);
      expect(mockDatabaseService.rollbackPricingConfig).toHaveBeenCalledWith(
        rollbackRequest.rollbackToDate
      );

      // Should create audit log for rollback
      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: undefined,
        action: 'rollback_pricing_config',
        resource: 'pricing_config',
        newValues: rollbackRequest,
      });
    });
  });

  describe('Audit Logging and Compliance', () => {
    it('should create detailed audit logs for admin actions', async () => {
      const auditData = {
        action: 'delete_user',
        resource: 'user',
        resourceId: mockUserId,
        oldValues: { isActive: true },
        newValues: { isActive: false },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      };

      await adminService.logAdminAction(
        mockAdminId,
        auditData.action,
        auditData.resource,
        auditData.resourceId,
        auditData.oldValues,
        auditData.newValues,
        auditData.ipAddress,
        auditData.userAgent
      );

      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: mockAdminId,
        action: auditData.action,
        resource: auditData.resource,
        resourceId: auditData.resourceId,
        oldValues: auditData.oldValues,
        newValues: auditData.newValues,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
      });
    });

    it('should retrieve audit logs with filtering and pagination', async () => {
      const mockAuditLogs: AuditLogEntry[] = [
        {
          id: 'audit-1',
          userId: mockAdminId,
          action: 'update_user',
          resource: 'user',
          resourceId: mockUserId,
          oldValues: { role: 'user' },
          newValues: { role: 'moderator' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: new Date(),
        },
        {
          id: 'audit-2',
          userId: mockAdminId,
          action: 'update_pricing_config',
          resource: 'pricing_config',
          resourceId: null,
          oldValues: { baseCredits: 50 },
          newValues: { baseCredits: 60 },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: new Date(),
        },
      ];

      mockDatabaseService.getAuditLogs = jest.fn().mockResolvedValue({
        logs: mockAuditLogs,
        total: 2,
        hasMore: false,
      });

      const result = await adminService.getAuditLogs({
        filters: {
          userId: mockAdminId,
          actions: ['update_user', 'update_pricing_config'],
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
        },
        pagination: {
          page: 1,
          limit: 50,
        },
      });

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockDatabaseService.getAuditLogs).toHaveBeenCalledWith({
        filters: {
          userId: mockAdminId,
          actions: ['update_user', 'update_pricing_config'],
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
        },
        pagination: {
          page: 1,
          limit: 50,
        },
      });
    });

    it('should handle sensitive data redaction in audit logs', async () => {
      const sensitiveData = {
        email: 'user@example.com',
        password: 'secret123',
        creditCardNumber: '4111111111111111',
        ssn: '123-45-6789',
      };

      await adminService.logAdminAction(
        mockAdminId,
        'update_user_sensitive',
        'user',
        mockUserId,
        sensitiveData,
        { email: 'newemail@example.com' }
      );

      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: mockAdminId,
        action: 'update_user_sensitive',
        resource: 'user',
        resourceId: mockUserId,
        oldValues: {
          email: 'user@example.com',
          password: '[REDACTED]',
          creditCardNumber: '[REDACTED]',
          ssn: '[REDACTED]',
        },
        newValues: { email: 'newemail@example.com' },
      });
    });

    it('should export audit logs for compliance reporting', async () => {
      const exportRequest = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        format: 'csv',
        includeUserData: true,
      };

      mockDatabaseService.exportAuditLogs = jest.fn().mockResolvedValue({
        exportId: 'export-123',
        downloadUrl: 'https://secure-download.com/audit-export-123.csv',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      const result = await adminService.exportAuditLogs(exportRequest);

      expect(result.exportId).toBe('export-123');
      expect(result.downloadUrl).toContain('audit-export-123.csv');
      expect(mockDatabaseService.exportAuditLogs).toHaveBeenCalledWith(exportRequest);
    });
  });

  describe('System Administration', () => {
    it('should handle system maintenance mode', async () => {
      const maintenanceConfig = {
        enabled: true,
        message: 'System maintenance in progress. Please try again later.',
        allowedUsers: [mockAdminId], // Only admins can access
        estimatedDuration: 60, // minutes
      };

      mockDatabaseService.setMaintenanceMode = jest.fn().mockResolvedValue({
        success: true,
        activatedAt: new Date(),
      });

      const result = await adminService.setMaintenanceMode(maintenanceConfig);

      expect(result.success).toBe(true);
      expect(mockDatabaseService.setMaintenanceMode).toHaveBeenCalledWith(maintenanceConfig);

      // Should broadcast maintenance notification to all users
      expect(mockRealTimeService.broadcastToAll).toHaveBeenCalledWith({
        type: 'system_maintenance',
        message: maintenanceConfig.message,
        estimatedDuration: maintenanceConfig.estimatedDuration,
      });
    });

    it('should manage system configuration settings', async () => {
      const configUpdates = {
        maxConcurrentJobs: 100,
        defaultCreditAllocation: 50,
        enableNewUserRegistration: true,
        maintenanceWindow: {
          start: '02:00',
          end: '04:00',
          timezone: 'UTC',
        },
      };

      mockDatabaseService.updateSystemConfig = jest.fn().mockResolvedValue({
        success: true,
        updatedSettings: configUpdates,
      });

      const result = await adminService.updateSystemConfig(configUpdates);

      expect(result.success).toBe(true);
      expect(mockDatabaseService.updateSystemConfig).toHaveBeenCalledWith(configUpdates);

      // Should create audit log for system config changes
      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: undefined,
        action: 'update_system_config',
        resource: 'system_config',
        newValues: configUpdates,
      });
    });

    it('should handle emergency system shutdown', async () => {
      const shutdownReason = 'Critical security vulnerability detected';

      mockDatabaseService.initiateEmergencyShutdown = jest.fn().mockResolvedValue({
        success: true,
        shutdownAt: new Date(),
      });

      const result = await adminService.initiateEmergencyShutdown(shutdownReason);

      expect(result.success).toBe(true);
      expect(mockDatabaseService.initiateEmergencyShutdown).toHaveBeenCalledWith(shutdownReason);

      // Should immediately notify all users and cancel active jobs
      expect(mockRealTimeService.broadcastToAll).toHaveBeenCalledWith({
        type: 'emergency_shutdown',
        message: 'System is temporarily unavailable due to maintenance.',
      });

      // Should create critical audit log
      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: undefined,
        action: 'emergency_shutdown',
        resource: 'system',
        newValues: { reason: shutdownReason },
      });
    });
  });

  describe('Permission and Access Control', () => {
    it('should validate admin permissions for sensitive operations', async () => {
      const regularUser = { ...mockUser, role: 'user' as UserRole };
      mockDatabaseService.getUserById.mockResolvedValue(regularUser);

      await expect(
        adminService.updatePricingConfig({
          updates: { profitMargins: { video_generation: 2.5 } },
          effectiveDate: new Date(),
        })
      ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow moderators limited admin access', async () => {
      const moderator = { ...mockAdmin, role: 'moderator' as UserRole };
      mockDatabaseService.getUserById.mockResolvedValue(moderator);

      // Moderators can manage users but not pricing
      const userUpdateRequest: UpdateUserRequest = {
        userId: mockUserId,
        updates: { isActive: false },
      };

      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await adminService.updateUser(userUpdateRequest);
      expect(result.success).toBe(true);

      // But cannot update pricing
      await expect(
        adminService.updatePricingConfig({
          updates: { profitMargins: { video_generation: 2.5 } },
          effectiveDate: new Date(),
        })
      ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');
    });

    it('should log all permission violations', async () => {
      const regularUser = { ...mockUser, role: 'user' as UserRole };
      mockDatabaseService.getUserById.mockResolvedValue(regularUser);

      try {
        await adminService.updatePricingConfig({
          updates: { profitMargins: { video_generation: 2.5 } },
          effectiveDate: new Date(),
        });
      } catch (error) {
        // Expected to fail
      }

      expect(mockDatabaseService.createAuditLog).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'permission_violation',
        resource: 'pricing_config',
        newValues: {
          attemptedAction: 'update_pricing_config',
          reason: 'INSUFFICIENT_PERMISSIONS',
        },
      });
    });
  });
});