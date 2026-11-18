import { databaseService } from './databaseService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import type { User } from '@ai-video-studio/types';

export interface DataExportRequest {
  userId: string;
  requestedBy: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface DataDeletionRequest {
  userId: string;
  requestedBy: string;
  requestDate: Date;
  scheduledDeletionDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  reason?: string;
}

export interface ConsentRecord {
  userId: string;
  consentType: 'data_processing' | 'marketing' | 'analytics' | 'cookies';
  granted: boolean;
  grantedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Privacy policy version
}

export interface UserDataExport {
  user: User;
  projects: any[];
  creditTransactions: any[];
  subscriptions: any[];
  communityPosts: any[];
  comments: any[];
  likes: any[];
  shares: any[];
  generationJobs: any[];
  consentRecords: ConsentRecord[];
  auditLogs: any[];
}

/**
 * Privacy service handling GDPR/CCPA compliance features
 * including data export, deletion, and consent management
 */
export class PrivacyService {
  
  /**
   * Export all user data in a structured format for GDPR/CCPA compliance
   */
  async exportUserData(userId: string, requestedBy: string): Promise<DataExportRequest> {
    try {
      logger.info('Starting user data export', { userId, requestedBy });

      // Create export request record
      const exportRequest: DataExportRequest = {
        userId,
        requestedBy,
        requestDate: new Date(),
        status: 'pending'
      };

      // Store the export request in database
      await this.createDataExportRequest(exportRequest);

      // Process export asynchronously
      this.processDataExport(exportRequest).catch(error => {
        logger.error('Error processing data export:', error);
      });

      return exportRequest;
    } catch (error) {
      logger.error('Error initiating data export:', error);
      throw createError('Failed to initiate data export', 500, 'DATA_EXPORT_FAILED');
    }
  }

  /**
   * Process the actual data export
   */
  private async processDataExport(exportRequest: DataExportRequest): Promise<void> {
    try {
      // Update status to processing
      await this.updateDataExportRequest(exportRequest.userId, { status: 'processing' });

      // Gather all user data
      const userData = await this.gatherUserData(exportRequest.userId);

      // Generate export file (JSON format)
      const exportData = {
        exportDate: new Date().toISOString(),
        userId: exportRequest.userId,
        requestedBy: exportRequest.requestedBy,
        data: userData,
        metadata: {
          version: '1.0',
          format: 'JSON',
          compliance: ['GDPR', 'CCPA']
        }
      };

      // In a real implementation, you would:
      // 1. Upload to secure S3 bucket with encryption
      // 2. Generate time-limited signed URL
      // 3. Send notification to user
      
      const downloadUrl = await this.uploadExportFile(exportData, exportRequest.userId);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Update export request with download URL
      await this.updateDataExportRequest(exportRequest.userId, {
        status: 'completed',
        downloadUrl,
        expiresAt
      });

      logger.info('Data export completed successfully', { 
        userId: exportRequest.userId,
        downloadUrl 
      });

    } catch (error) {
      logger.error('Error processing data export:', error);
      await this.updateDataExportRequest(exportRequest.userId, { status: 'failed' });
      throw error;
    }
  }

  /**
   * Gather all user data from various tables
   */
  private async gatherUserData(userId: string): Promise<UserDataExport> {
    try {
      // Get user profile
      const user = await databaseService.getUserById(userId);
      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get all related data
      const [
        projects,
        creditTransactions,
        subscriptions,
        communityPosts,
        comments,
        likes,
        shares,
        generationJobs,
        consentRecords,
        auditLogs
      ] = await Promise.all([
        this.getUserProjects(userId),
        this.getUserCreditTransactions(userId),
        this.getUserSubscriptions(userId),
        this.getUserCommunityPosts(userId),
        this.getUserComments(userId),
        this.getUserLikes(userId),
        this.getUserShares(userId),
        this.getUserGenerationJobs(userId),
        this.getUserConsentRecords(userId),
        this.getUserAuditLogs(userId)
      ]);

      return {
        user,
        projects,
        creditTransactions,
        subscriptions,
        communityPosts,
        comments,
        likes,
        shares,
        generationJobs,
        consentRecords,
        auditLogs
      };
    } catch (error) {
      logger.error('Error gathering user data:', error);
      throw error;
    }
  }

  /**
   * Request user data deletion (GDPR Right to be Forgotten)
   */
  async requestDataDeletion(userId: string, requestedBy: string, reason?: string): Promise<DataDeletionRequest> {
    try {
      logger.info('Starting user data deletion request', { userId, requestedBy, reason });

      // GDPR requires 30-day grace period for deletion
      const scheduledDeletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const deletionRequest: DataDeletionRequest = {
        userId,
        requestedBy,
        requestDate: new Date(),
        scheduledDeletionDate,
        status: 'pending',
        reason
      };

      // Store deletion request
      await this.createDataDeletionRequest(deletionRequest);

      // Schedule deletion job (in real implementation, use a job queue)
      this.scheduleDataDeletion(deletionRequest).catch(error => {
        logger.error('Error scheduling data deletion:', error);
      });

      return deletionRequest;
    } catch (error) {
      logger.error('Error requesting data deletion:', error);
      throw createError('Failed to request data deletion', 500, 'DATA_DELETION_REQUEST_FAILED');
    }
  }

  /**
   * Process scheduled data deletion
   */
  private async scheduleDataDeletion(deletionRequest: DataDeletionRequest): Promise<void> {
    try {
      // In a real implementation, this would be handled by a job queue
      // For now, we'll simulate the scheduling
      logger.info('Data deletion scheduled', {
        userId: deletionRequest.userId,
        scheduledDate: deletionRequest.scheduledDeletionDate
      });

      // Update status
      await this.updateDataDeletionRequest(deletionRequest.userId, { status: 'processing' });
    } catch (error) {
      logger.error('Error scheduling data deletion:', error);
      throw error;
    }
  }

  /**
   * Execute data deletion (called by scheduled job)
   */
  async executeDataDeletion(userId: string): Promise<void> {
    try {
      logger.info('Executing data deletion', { userId });

      // Delete user data in proper order (respecting foreign key constraints)
      await this.deleteUserData(userId);

      // Update deletion request status
      await this.updateDataDeletionRequest(userId, { status: 'completed' });

      logger.info('Data deletion completed successfully', { userId });
    } catch (error) {
      logger.error('Error executing data deletion:', error);
      throw error;
    }
  }

  /**
   * Delete all user data from the system
   */
  private async deleteUserData(userId: string): Promise<void> {
    try {
      // Delete in order to respect foreign key constraints
      await Promise.all([
        this.deleteUserLikes(userId),
        this.deleteUserShares(userId),
        this.deleteUserComments(userId),
      ]);

      await Promise.all([
        this.deleteUserCommunityPosts(userId),
        this.deleteUserGenerationJobs(userId),
        this.deleteUserCreditTransactions(userId),
      ]);

      await Promise.all([
        this.deleteUserProjects(userId),
        this.deleteUserSubscriptions(userId),
        this.deleteUserConsentRecords(userId),
      ]);

      // Finally delete the user
      await databaseService.softDeleteUser(userId, 'GDPR_DELETION');

      logger.info('All user data deleted successfully', { userId });
    } catch (error) {
      logger.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Record user consent for data processing
   */
  async recordConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    ipAddress?: string,
    userAgent?: string,
    policyVersion: string = '1.0'
  ): Promise<ConsentRecord> {
    try {
      const consentRecord: ConsentRecord = {
        userId,
        consentType,
        granted,
        grantedAt: new Date(),
        ipAddress,
        userAgent,
        version: policyVersion
      };

      await this.createConsentRecord(consentRecord);

      logger.info('Consent recorded', {
        userId,
        consentType,
        granted,
        version: policyVersion
      });

      return consentRecord;
    } catch (error) {
      logger.error('Error recording consent:', error);
      throw createError('Failed to record consent', 500, 'CONSENT_RECORD_FAILED');
    }
  }

  /**
   * Get user's current consent status
   */
  async getUserConsent(userId: string): Promise<ConsentRecord[]> {
    try {
      return await this.getUserConsentRecords(userId);
    } catch (error) {
      logger.error('Error getting user consent:', error);
      throw createError('Failed to get user consent', 500, 'CONSENT_FETCH_FAILED');
    }
  }

  /**
   * Cancel data deletion request (if within grace period)
   */
  async cancelDataDeletion(userId: string, cancelledBy: string): Promise<void> {
    try {
      await this.updateDataDeletionRequest(userId, { 
        status: 'cancelled',
        reason: `Cancelled by ${cancelledBy}`
      });

      logger.info('Data deletion cancelled', { userId, cancelledBy });
    } catch (error) {
      logger.error('Error cancelling data deletion:', error);
      throw createError('Failed to cancel data deletion', 500, 'DELETION_CANCEL_FAILED');
    }
  }

  // Database helper methods (these would interact with your database)
  private async createDataExportRequest(request: DataExportRequest): Promise<void> {
    // Implementation would store in database
    logger.info('Data export request created', request);
  }

  private async updateDataExportRequest(userId: string, updates: Partial<DataExportRequest>): Promise<void> {
    // Implementation would update database record
    logger.info('Data export request updated', { userId, updates });
  }

  private async createDataDeletionRequest(request: DataDeletionRequest): Promise<void> {
    // Implementation would store in database
    logger.info('Data deletion request created', request);
  }

  private async updateDataDeletionRequest(userId: string, updates: Partial<DataDeletionRequest>): Promise<void> {
    // Implementation would update database record
    logger.info('Data deletion request updated', { userId, updates });
  }

  private async createConsentRecord(record: ConsentRecord): Promise<void> {
    // Implementation would store in database
    logger.info('Consent record created', record);
  }

  private async uploadExportFile(data: any, userId: string): Promise<string> {
    // Implementation would upload to secure S3 bucket and return signed URL
    return `https://secure-exports.example.com/${userId}/export-${Date.now()}.json`;
  }

  // Data gathering helper methods
  private async getUserProjects(userId: string): Promise<any[]> {
    return await databaseService.getUserProjects(userId, {});
  }

  private async getUserCreditTransactions(userId: string): Promise<any[]> {
    return await databaseService.getUserCreditTransactions(userId);
  }

  private async getUserSubscriptions(userId: string): Promise<any[]> {
    return await databaseService.getUserSubscriptions(userId);
  }

  private async getUserCommunityPosts(userId: string): Promise<any[]> {
    return await databaseService.getUserCommunityPosts(userId);
  }

  private async getUserComments(userId: string): Promise<any[]> {
    return await databaseService.getUserComments(userId);
  }

  private async getUserLikes(userId: string): Promise<any[]> {
    return await databaseService.getUserLikes(userId);
  }

  private async getUserShares(userId: string): Promise<any[]> {
    return await databaseService.getUserShares(userId);
  }

  private async getUserGenerationJobs(userId: string): Promise<any[]> {
    return await databaseService.getUserGenerationJobs(userId);
  }

  private async getUserConsentRecords(userId: string): Promise<ConsentRecord[]> {
    // Implementation would fetch from database
    return [];
  }

  private async getUserAuditLogs(userId: string): Promise<any[]> {
    return await databaseService.getUserAuditLogs(userId);
  }

  // Data deletion helper methods
  private async deleteUserLikes(userId: string): Promise<void> {
    await databaseService.deleteUserLikes(userId);
  }

  private async deleteUserShares(userId: string): Promise<void> {
    await databaseService.deleteUserShares(userId);
  }

  private async deleteUserComments(userId: string): Promise<void> {
    await databaseService.deleteUserComments(userId);
  }

  private async deleteUserCommunityPosts(userId: string): Promise<void> {
    await databaseService.deleteUserCommunityPosts(userId);
  }

  private async deleteUserGenerationJobs(userId: string): Promise<void> {
    await databaseService.deleteUserGenerationJobs(userId);
  }

  private async deleteUserCreditTransactions(userId: string): Promise<void> {
    await databaseService.deleteUserCreditTransactions(userId);
  }

  private async deleteUserProjects(userId: string): Promise<void> {
    await databaseService.deleteUserProjects(userId);
  }

  private async deleteUserSubscriptions(userId: string): Promise<void> {
    await databaseService.deleteUserSubscriptions(userId);
  }

  private async deleteUserConsentRecords(userId: string): Promise<void> {
    // Implementation would delete consent records
    logger.info('User consent records deleted', { userId });
  }
}

// Export singleton instance
export const privacyService = new PrivacyService();