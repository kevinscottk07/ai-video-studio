import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { RealTimeService } from '../realTimeService.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('RealTimeService', () => {
  let realTimeService: RealTimeService;
  let mockIo: any;
  let mockBroadcast: any;
  let mockSessionManager: any;
  let mockHealthCheck: any;

  beforeEach(() => {
    realTimeService = new RealTimeService();
    
    mockBroadcast = {
      sendNotification: vi.fn(),
      toProject: vi.fn(),
      updateProgress: vi.fn(),
      toCommunity: vi.fn(),
      toUser: vi.fn(),
      toRole: vi.fn(),
      toAll: vi.fn(),
    };

    mockSessionManager = {
      isUserOnline: vi.fn(),
    };

    mockHealthCheck = {
      getConnectionStats: vi.fn(),
    };

    mockIo = {
      broadcast: mockBroadcast,
      sessionManager: mockSessionManager,
      healthCheck: mockHealthCheck,
      emit: vi.fn(),
    } as any;
  });

  describe('Initialization', () => {
    it('should initialize with Socket.IO instance', () => {
      expect(() => realTimeService.initialize(mockIo)).not.toThrow();
    });

    it('should throw error when not initialized', async () => {
      await expect(realTimeService.notifyUser('user-123', {
        type: 'info',
        title: 'Test',
        message: 'Test message',
      })).rejects.toThrow('RealTimeService not initialized');
    });
  });

  describe('User Notifications', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should send notification to user', async () => {
      const notification = {
        type: 'success' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
      };

      await realTimeService.notifyUser('user-123', notification);

      expect(mockBroadcast.sendNotification).toHaveBeenCalledWith('user-123', notification);
    });

    it('should handle notification errors gracefully', async () => {
      mockBroadcast.sendNotification.mockRejectedValue(new Error('Network error'));

      await expect(realTimeService.notifyUser('user-123', {
        type: 'error',
        title: 'Test',
        message: 'Test message',
      })).resolves.not.toThrow();
    });
  });

  describe('Project Updates', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should broadcast project updates', async () => {
      const update = {
        projectId: 'project-456',
        type: 'settings' as const,
        data: { title: 'New Title' },
        userId: 'user-123',
      };

      await realTimeService.updateProject('project-456', update);

      expect(mockBroadcast.toProject).toHaveBeenCalledWith('project-456', 'project:updated', update);
    });

    it('should handle project update errors', async () => {
      mockBroadcast.toProject.mockRejectedValue(new Error('Broadcast failed'));

      await expect(realTimeService.updateProject('project-456', {
        projectId: 'project-456',
        type: 'assets',
        data: {},
      })).resolves.not.toThrow();
    });
  });

  describe('Generation Progress', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should update generation progress', async () => {
      const progress = {
        percentage: 75,
        stage: 'rendering',
        message: 'Rendering video frames',
      };

      await realTimeService.updateGenerationProgress('job-789', progress);

      expect(mockBroadcast.updateProgress).toHaveBeenCalledWith('job-789', progress);
    });

    it('should handle progress update errors', async () => {
      mockBroadcast.updateProgress.mockRejectedValue(new Error('Update failed'));

      await expect(realTimeService.updateGenerationProgress('job-789', {
        percentage: 50,
        stage: 'processing',
      })).resolves.not.toThrow();
    });
  });

  describe('Community Updates', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should update community feed', async () => {
      const update = {
        type: 'like' as const,
        contentId: 'content-123',
        userId: 'user-456',
        data: { count: 5 },
      };

      await realTimeService.updateCommunityFeed(update);

      expect(mockBroadcast.toCommunity).toHaveBeenCalledWith('community:updated', update);
    });

    it('should handle community update errors', async () => {
      mockBroadcast.toCommunity.mockRejectedValue(new Error('Community update failed'));

      await expect(realTimeService.updateCommunityFeed({
        type: 'comment',
        contentId: 'content-123',
        userId: 'user-456',
      })).resolves.not.toThrow();
    });
  });

  describe('User Status', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should update user status', async () => {
      await realTimeService.updateUserStatus('user-123', 'online');

      expect(mockIo.emit).toHaveBeenCalledWith('user:status', {
        userId: 'user-123',
        status: 'online',
        timestamp: expect.any(String),
      });
    });

    it('should check if user is online', async () => {
      mockSessionManager.isUserOnline.mockResolvedValue(true);

      const isOnline = await realTimeService.isUserOnline('user-123');

      expect(isOnline).toBe(true);
      expect(mockSessionManager.isUserOnline).toHaveBeenCalledWith('user-123');
    });

    it('should handle online check errors', async () => {
      mockSessionManager.isUserOnline.mockRejectedValue(new Error('Check failed'));

      const isOnline = await realTimeService.isUserOnline('user-123');

      expect(isOnline).toBe(false);
    });
  });

  describe('Admin Notifications', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should notify admins', async () => {
      const notification = {
        type: 'warning' as const,
        title: 'System Alert',
        message: 'High CPU usage detected',
      };

      await realTimeService.notifyAdmins(notification);

      expect(mockBroadcast.toRole).toHaveBeenCalledWith('admin', 'admin:notification', notification);
    });
  });

  describe('System Announcements', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should broadcast system announcements', async () => {
      const announcement = {
        title: 'Maintenance Notice',
        message: 'System will be down for maintenance',
        type: 'maintenance' as const,
      };

      await realTimeService.broadcastAnnouncement(announcement);

      expect(mockBroadcast.toAll).toHaveBeenCalledWith('system:announcement', announcement);
    });
  });

  describe('Credit Updates', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should update credit balance', async () => {
      const transaction = {
        type: 'purchase' as const,
        amount: 100,
        description: 'Credit purchase',
      };

      await realTimeService.updateCreditBalance('user-123', 500, transaction);

      expect(mockBroadcast.toUser).toHaveBeenCalledWith('user-123', 'credits:updated', {
        balance: 500,
        transaction,
      });
    });

    it('should update credit balance without transaction', async () => {
      await realTimeService.updateCreditBalance('user-123', 300);

      expect(mockBroadcast.toUser).toHaveBeenCalledWith('user-123', 'credits:updated', {
        balance: 300,
        transaction: undefined,
      });
    });
  });

  describe('Subscription Updates', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should update subscription', async () => {
      const subscription = {
        status: 'active',
        plan: 'pro',
        creditsIncluded: 1000,
        creditsUsed: 250,
      };

      await realTimeService.updateSubscription('user-123', subscription);

      expect(mockBroadcast.toUser).toHaveBeenCalledWith('user-123', 'subscription:updated', subscription);
    });
  });

  describe('Connection Statistics', () => {
    beforeEach(() => {
      realTimeService.initialize(mockIo);
    });

    it('should get connection statistics', async () => {
      const mockStats = {
        totalSessions: 10,
        totalUsers: 8,
        totalRooms: 5,
        localConnections: 3,
        timestamp: new Date().toISOString(),
      };

      mockHealthCheck.getConnectionStats.mockResolvedValue(mockStats);

      const stats = await realTimeService.getConnectionStats();

      expect(stats).toEqual(mockStats);
      expect(mockHealthCheck.getConnectionStats).toHaveBeenCalled();
    });

    it('should handle stats errors', async () => {
      mockHealthCheck.getConnectionStats.mockRejectedValue(new Error('Stats failed'));

      const stats = await realTimeService.getConnectionStats();

      expect(stats).toBeNull();
    });
  });
});