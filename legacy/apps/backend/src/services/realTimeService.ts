import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger.js';

export interface NotificationData {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  persistent?: boolean;
}

export interface ProgressData {
  percentage: number;
  stage: string;
  message?: string;
  data?: any;
}

export interface ProjectUpdateData {
  projectId: string;
  type: 'settings' | 'assets' | 'status' | 'collaboration';
  data: any;
  userId?: string;
}

export interface CommunityUpdateData {
  type: 'like' | 'comment' | 'share' | 'new_post';
  contentId: string;
  userId: string;
  data?: any;
}

export class RealTimeService {
  private io: SocketIOServer | null = null;

  constructor() {
    // Will be initialized when WebSocket server is set up
  }

  public initialize(io: SocketIOServer): void {
    this.io = io;
    logger.info('RealTimeService initialized');
  }

  private ensureInitialized(): void {
    if (!this.io) {
      throw new Error('RealTimeService not initialized. Call initialize() first.');
    }
  }

  // User-specific notifications
  async notifyUser(userId: string, notification: NotificationData): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.sendNotification(userId, notification);
      
      logger.debug('Notification sent to user', {
        userId,
        type: notification.type,
        title: notification.title,
      });
    } catch (error) {
      logger.error('Failed to send notification to user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Project collaboration updates
  async updateProject(projectId: string, update: ProjectUpdateData): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.toProject(projectId, 'project:updated', update);
      
      logger.debug('Project update broadcasted', {
        projectId,
        type: update.type,
        userId: update.userId,
      });
    } catch (error) {
      logger.error('Failed to broadcast project update', {
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Generation progress updates
  async updateGenerationProgress(jobId: string, progress: ProgressData): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.updateProgress(jobId, progress);
      
      logger.debug('Generation progress updated', {
        jobId,
        percentage: progress.percentage,
        stage: progress.stage,
      });
    } catch (error) {
      logger.error('Failed to update generation progress', {
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Community feed updates
  async updateCommunityFeed(update: CommunityUpdateData): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.toCommunity('community:updated', update);
      
      logger.debug('Community feed updated', {
        type: update.type,
        contentId: update.contentId,
        userId: update.userId,
      });
    } catch (error) {
      logger.error('Failed to update community feed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // User status updates
  async updateUserStatus(userId: string, status: 'online' | 'offline' | 'busy'): Promise<void> {
    this.ensureInitialized();
    
    try {
      (this.io as any).emit('user:status', {
        userId,
        status,
        timestamp: new Date().toISOString(),
      });
      
      logger.debug('User status updated', { userId, status });
    } catch (error) {
      logger.error('Failed to update user status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Admin notifications
  async notifyAdmins(notification: NotificationData): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.toRole('admin', 'admin:notification', notification);
      
      logger.debug('Admin notification sent', {
        type: notification.type,
        title: notification.title,
      });
    } catch (error) {
      logger.error('Failed to send admin notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // System-wide announcements
  async broadcastAnnouncement(announcement: {
    title: string;
    message: string;
    type: 'maintenance' | 'feature' | 'warning' | 'info';
    data?: any;
  }): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.toAll('system:announcement', announcement);
      
      logger.info('System announcement broadcasted', {
        type: announcement.type,
        title: announcement.title,
      });
    } catch (error) {
      logger.error('Failed to broadcast announcement', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Credit balance updates
  async updateCreditBalance(userId: string, balance: number, transaction?: {
    type: 'purchase' | 'deduction' | 'refund';
    amount: number;
    description: string;
  }): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.toUser(userId, 'credits:updated', {
        balance,
        transaction,
      });
      
      logger.debug('Credit balance updated', {
        userId,
        balance,
        transactionType: transaction?.type,
      });
    } catch (error) {
      logger.error('Failed to update credit balance', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Subscription updates
  async updateSubscription(userId: string, subscription: {
    status: string;
    plan: string;
    creditsIncluded: number;
    creditsUsed: number;
  }): Promise<void> {
    this.ensureInitialized();
    
    try {
      await (this.io as any).broadcast.toUser(userId, 'subscription:updated', subscription);
      
      logger.debug('Subscription updated', {
        userId,
        status: subscription.status,
        plan: subscription.plan,
      });
    } catch (error) {
      logger.error('Failed to update subscription', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Connection statistics
  async getConnectionStats(): Promise<any> {
    this.ensureInitialized();
    
    try {
      return await (this.io as any).healthCheck.getConnectionStats();
    } catch (error) {
      logger.error('Failed to get connection stats', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  // Check if user is online
  async isUserOnline(userId: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      return await (this.io as any).sessionManager.isUserOnline(userId);
    } catch (error) {
      logger.error('Failed to check user online status', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();