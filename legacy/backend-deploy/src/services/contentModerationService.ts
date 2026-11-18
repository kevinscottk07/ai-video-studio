import { PrismaClient, ModerationStatus, ReportReason, ModerationAction, ContentModerationFlag, UserReport } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { realTimeService } from './realTimeService.js';
import { aiService } from './aiService.js';

export interface ContentAnalysisResult {
  isAppropriate: boolean;
  confidence: number;
  flags: {
    inappropriateContent: boolean;
    spam: boolean;
    harassment: boolean;
    violence: boolean;
    hateSpeech: boolean;
    nudity: boolean;
    misinformation: boolean;
  };
  suggestedAction: ModerationAction;
  reasoning: string;
}

export interface CreateReportRequest {
  contentType?: 'post' | 'comment' | 'user_profile';
  contentId?: string;
  reportedUserId?: string;
  reason: ReportReason;
  description: string;
}

export interface ModerationFilters {
  status?: ModerationStatus;
  contentType?: string;
  reason?: ReportReason;
  flaggedBy?: string;
  reviewedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ModerationReviewRequest {
  flagId: string;
  status: ModerationStatus;
  action: ModerationAction;
  moderatorNotes?: string;
  actionDuration?: number; // in hours for temporary actions
}

export class ContentModerationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * Analyze content using AI for potential policy violations
   */
  async analyzeContent(
    contentType: 'post' | 'comment' | 'user_profile',
    contentId: string,
    content: {
      text?: string;
      imageUrls?: string[];
      videoUrl?: string;
      metadata?: any;
    }
  ): Promise<ContentAnalysisResult> {
    try {
      logger.info('Analyzing content for moderation', {
        contentType,
        contentId,
        hasText: !!content.text,
        hasImages: !!(content.imageUrls && content.imageUrls.length > 0),
        hasVideo: !!content.videoUrl,
      });

      // Use AI service to analyze content
      const analysis = await aiService.analyzeContentForModeration({
        text: content.text,
        imageUrls: content.imageUrls,
        videoUrl: content.videoUrl,
        metadata: content.metadata,
      });

      // Convert AI analysis to our format
      const result: ContentAnalysisResult = {
        isAppropriate: analysis.isAppropriate,
        confidence: analysis.confidence,
        flags: {
          inappropriateContent: analysis.flags.inappropriate || false,
          spam: analysis.flags.spam || false,
          harassment: analysis.flags.harassment || false,
          violence: analysis.flags.violence || false,
          hateSpeech: analysis.flags.hateSpeech || false,
          nudity: analysis.flags.nudity || false,
          misinformation: analysis.flags.misinformation || false,
        },
        suggestedAction: this.mapAISuggestionToAction(analysis.suggestedAction),
        reasoning: analysis.reasoning || 'AI analysis completed',
      };

      // Auto-flag content if confidence is high and content is inappropriate
      if (!result.isAppropriate && result.confidence > 0.8) {
        await this.createAutoFlag(contentType, contentId, result);
      }

      return result;
    } catch (error) {
      logger.error('Failed to analyze content', {
        contentType,
        contentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return safe default
      return {
        isAppropriate: true,
        confidence: 0,
        flags: {
          inappropriateContent: false,
          spam: false,
          harassment: false,
          violence: false,
          hateSpeech: false,
          nudity: false,
          misinformation: false,
        },
        suggestedAction: ModerationAction.no_action,
        reasoning: 'Analysis failed - defaulting to safe',
      };
    }
  }

  /**
   * Create an automated flag based on AI analysis
   */
  private async createAutoFlag(
    contentType: string,
    contentId: string,
    analysis: ContentAnalysisResult
  ): Promise<ContentModerationFlag> {
    try {
      // Determine primary reason based on flags
      let reason: ReportReason = ReportReason.inappropriate_content;
      if (analysis.flags.spam) reason = ReportReason.spam;
      if (analysis.flags.harassment) reason = ReportReason.harassment;
      if (analysis.flags.violence) reason = ReportReason.violence;
      if (analysis.flags.hateSpeech) reason = ReportReason.hate_speech;
      if (analysis.flags.nudity) reason = ReportReason.nudity;
      if (analysis.flags.misinformation) reason = ReportReason.misinformation;

      const flag = await this.prisma.contentModerationFlag.create({
        data: {
          contentType,
          contentId,
          flaggedBy: null, // AI flag
          reason,
          description: `Automatically flagged by AI: ${analysis.reasoning}`,
          aiConfidence: analysis.confidence,
          aiAnalysis: {
            flags: analysis.flags,
            suggestedAction: analysis.suggestedAction,
            reasoning: analysis.reasoning,
            timestamp: new Date().toISOString(),
          },
          status: analysis.confidence > 0.95 ? ModerationStatus.flagged : ModerationStatus.pending,
        },
      });

      // Notify moderators if high confidence
      if (analysis.confidence > 0.9) {
        await this.notifyModerators(flag);
      }

      logger.info('Auto-flag created', {
        flagId: flag.id,
        contentType,
        contentId,
        reason,
        confidence: analysis.confidence,
      });

      return flag;
    } catch (error) {
      logger.error('Failed to create auto-flag', {
        contentType,
        contentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create a user report
   */
  async createReport(
    reporterId: string,
    reportData: CreateReportRequest
  ): Promise<UserReport> {
    try {
      // Validate that either content or user is being reported
      if (!reportData.contentId && !reportData.reportedUserId) {
        throw new Error('Either contentId or reportedUserId must be provided');
      }

      // Check if user has already reported this content/user recently
      const existingReport = await this.prisma.userReport.findFirst({
        where: {
          reporterId,
          ...(reportData.contentId && {
            contentType: reportData.contentType,
            contentId: reportData.contentId,
          }),
          ...(reportData.reportedUserId && {
            reportedUserId: reportData.reportedUserId,
          }),
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (existingReport) {
        throw new Error('You have already reported this content recently');
      }

      const report = await this.prisma.userReport.create({
        data: {
          reporterId,
          reportedUserId: reportData.reportedUserId,
          contentType: reportData.contentType,
          contentId: reportData.contentId,
          reason: reportData.reason,
          description: reportData.description,
        },
        include: {
          reporter: {
            select: {
              id: true,
              displayName: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      // Create corresponding moderation flag if it doesn't exist
      if (reportData.contentId) {
        await this.createOrUpdateModerationFlag(
          reportData.contentType!,
          reportData.contentId,
          reporterId,
          reportData.reason,
          reportData.description
        );
      }

      // Notify moderators
      await this.notifyModeratorsOfReport(report);

      logger.info('User report created', {
        reportId: report.id,
        reporterId,
        contentType: reportData.contentType,
        contentId: reportData.contentId,
        reportedUserId: reportData.reportedUserId,
        reason: reportData.reason,
      });

      return report;
    } catch (error) {
      logger.error('Failed to create report', {
        reporterId,
        reportData,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get moderation queue for admin review
   */
  async getModerationQueue(
    filters: ModerationFilters = {}
  ): Promise<{
    flags: (ContentModerationFlag & {
      flaggedByUser?: { id: string; displayName: string } | null;
      reviewedByUser?: { id: string; displayName: string } | null;
    })[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        status,
        contentType,
        reason,
        flaggedBy,
        reviewedBy,
        dateFrom,
        dateTo,
        limit = 20,
        offset = 0,
      } = filters;

      const where: any = {
        isActive: true,
        ...(status && { status }),
        ...(contentType && { contentType }),
        ...(reason && { reason }),
        ...(flaggedBy && { flaggedBy }),
        ...(reviewedBy && { reviewedBy }),
        ...(dateFrom || dateTo) && {
          createdAt: {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo && { lte: dateTo }),
          },
        },
      };

      const [flags, total] = await Promise.all([
        this.prisma.contentModerationFlag.findMany({
          where,
          include: {
            flaggedByUser: {
              select: {
                id: true,
                displayName: true,
              },
            },
            reviewedByUser: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
          orderBy: [
            { status: 'asc' }, // Pending first
            { aiConfidence: 'desc' }, // High confidence first
            { createdAt: 'desc' }, // Newest first
          ],
          take: limit,
          skip: offset,
        }),
        this.prisma.contentModerationFlag.count({ where }),
      ]);

      const hasMore = offset + flags.length < total;

      return { flags, total, hasMore };
    } catch (error) {
      logger.error('Failed to get moderation queue', {
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get moderation queue');
    }
  }

  /**
   * Review a moderation flag
   */
  async reviewFlag(
    moderatorId: string,
    reviewData: ModerationReviewRequest
  ): Promise<ContentModerationFlag> {
    try {
      const { flagId, status, action, moderatorNotes, actionDuration } = reviewData;

      // Get the flag
      const flag = await this.prisma.contentModerationFlag.findUnique({
        where: { id: flagId },
      });

      if (!flag) {
        throw new Error('Moderation flag not found');
      }

      // Update the flag
      const updatedFlag = await this.prisma.contentModerationFlag.update({
        where: { id: flagId },
        data: {
          status,
          reviewedBy: moderatorId,
          reviewedAt: new Date(),
          moderatorNotes,
          actionTaken: action,
        },
        include: {
          flaggedByUser: {
            select: {
              id: true,
              displayName: true,
            },
          },
          reviewedByUser: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      });

      // If action is taken, create moderation action record
      if (action !== ModerationAction.no_action) {
        await this.executeModerationAction(
          flag.contentId,
          flag.contentType,
          moderatorId,
          action,
          moderatorNotes || 'Moderation action taken',
          actionDuration
        );
      }

      // Notify relevant parties
      if (flag.flaggedBy) {
        await this.notifyUserOfReview(flag.flaggedBy, updatedFlag);
      }

      logger.info('Moderation flag reviewed', {
        flagId,
        moderatorId,
        status,
        action,
        contentType: flag.contentType,
        contentId: flag.contentId,
      });

      return updatedFlag;
    } catch (error) {
      logger.error('Failed to review flag', {
        flagId: reviewData.flagId,
        moderatorId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute moderation action
   */
  private async executeModerationAction(
    contentId: string,
    contentType: string,
    moderatorId: string,
    action: ModerationAction,
    reason: string,
    duration?: number
  ): Promise<void> {
    try {
      // Get the content owner
      let userId: string | null = null;
      
      if (contentType === 'post') {
        const post = await this.prisma.communityPost.findUnique({
          where: { id: contentId },
          select: { userId: true },
        });
        userId = post?.userId || null;
      } else if (contentType === 'comment') {
        const comment = await this.prisma.comment.findUnique({
          where: { id: contentId },
          select: { userId: true },
        });
        userId = comment?.userId || null;
      }

      if (!userId) {
        logger.warn('Could not find user for content', { contentId, contentType });
        return;
      }

      // Create moderation action record
      const expiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;
      
      await this.prisma.moderationAction.create({
        data: {
          userId,
          moderatorId,
          actionType: action,
          reason,
          duration,
          contentType,
          contentId,
          expiresAt,
        },
      });

      // Execute the action
      switch (action) {
        case ModerationAction.content_removal:
          await this.removeContent(contentType, contentId);
          break;
        case ModerationAction.account_suspension:
          await this.suspendUser(userId, duration || 24); // Default 24 hours
          break;
        case ModerationAction.account_ban:
          await this.banUser(userId);
          break;
        case ModerationAction.warning:
          await this.sendWarningToUser(userId, reason);
          break;
      }

      logger.info('Moderation action executed', {
        action,
        userId,
        contentType,
        contentId,
        moderatorId,
        duration,
      });
    } catch (error) {
      logger.error('Failed to execute moderation action', {
        contentId,
        contentType,
        action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get community guidelines
   */
  async getCommunityGuidelines(): Promise<any[]> {
    try {
      return await this.prisma.communityGuideline.findMany({
        where: { isActive: true },
        orderBy: [
          { category: 'asc' },
          { severity: 'desc' },
        ],
      });
    } catch (error) {
      logger.error('Failed to get community guidelines', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get community guidelines');
    }
  }

  /**
   * Helper methods
   */
  private mapAISuggestionToAction(suggestion: string): ModerationAction {
    switch (suggestion?.toLowerCase()) {
      case 'remove':
      case 'delete':
        return ModerationAction.content_removal;
      case 'warn':
      case 'warning':
        return ModerationAction.warning;
      case 'suspend':
        return ModerationAction.account_suspension;
      case 'ban':
        return ModerationAction.account_ban;
      default:
        return ModerationAction.no_action;
    }
  }

  private async createOrUpdateModerationFlag(
    contentType: string,
    contentId: string,
    flaggedBy: string,
    reason: ReportReason,
    description: string
  ): Promise<void> {
    try {
      const existingFlag = await this.prisma.contentModerationFlag.findFirst({
        where: {
          contentType,
          contentId,
          isActive: true,
        },
      });

      if (existingFlag) {
        // Update existing flag
        await this.prisma.contentModerationFlag.update({
          where: { id: existingFlag.id },
          data: {
            status: ModerationStatus.flagged,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new flag
        await this.prisma.contentModerationFlag.create({
          data: {
            contentType,
            contentId,
            flaggedBy,
            reason,
            description,
            status: ModerationStatus.flagged,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to create/update moderation flag', {
        contentType,
        contentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async notifyModerators(flag: ContentModerationFlag): Promise<void> {
    try {
      // Get all moderators and admins
      const moderators = await this.prisma.user.findMany({
        where: {
          role: { in: ['moderator', 'admin'] },
          isActive: true,
        },
        select: { id: true },
      });

      // Send notifications
      await Promise.all(
        moderators.map(moderator =>
          realTimeService.notifyUser(moderator.id, {
            type: 'warning',
            title: 'Content Flagged for Review',
            message: `AI has flagged ${flag.contentType} content with ${(flag.aiConfidence || 0) * 100}% confidence.`,
            data: {
              flagId: flag.id,
              contentType: flag.contentType,
              contentId: flag.contentId,
              reason: flag.reason,
            },
          })
        )
      );
    } catch (error) {
      logger.error('Failed to notify moderators', {
        flagId: flag.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async notifyModeratorsOfReport(report: UserReport): Promise<void> {
    try {
      const moderators = await this.prisma.user.findMany({
        where: {
          role: { in: ['moderator', 'admin'] },
          isActive: true,
        },
        select: { id: true },
      });

      await Promise.all(
        moderators.map(moderator =>
          realTimeService.notifyUser(moderator.id, {
            type: 'info',
            title: 'New User Report',
            message: `User reported ${report.contentType || 'user'} for ${report.reason}.`,
            data: {
              reportId: report.id,
              contentType: report.contentType,
              contentId: report.contentId,
              reason: report.reason,
            },
          })
        )
      );
    } catch (error) {
      logger.error('Failed to notify moderators of report', {
        reportId: report.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async notifyUserOfReview(userId: string, flag: ContentModerationFlag): Promise<void> {
    try {
      let message = 'Your report has been reviewed.';
      if (flag.status === ModerationStatus.approved) {
        message = 'Thank you for your report. Action has been taken.';
      } else if (flag.status === ModerationStatus.rejected) {
        message = 'Your report has been reviewed. No action was taken.';
      }

      await realTimeService.notifyUser(userId, {
        type: 'info',
        title: 'Report Update',
        message,
        data: {
          flagId: flag.id,
          status: flag.status,
          actionTaken: flag.actionTaken,
        },
      });
    } catch (error) {
      logger.error('Failed to notify user of review', {
        userId,
        flagId: flag.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async removeContent(contentType: string, contentId: string): Promise<void> {
    try {
      if (contentType === 'post') {
        await this.prisma.communityPost.update({
          where: { id: contentId },
          data: { isPublic: false },
        });
      } else if (contentType === 'comment') {
        await this.prisma.comment.delete({
          where: { id: contentId },
        });
      }
    } catch (error) {
      logger.error('Failed to remove content', {
        contentType,
        contentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async suspendUser(userId: string, hours: number): Promise<void> {
    try {
      // In a real implementation, you'd update user status or create a suspension record
      // For now, we'll just log it
      logger.info('User suspended', { userId, hours });
      
      await realTimeService.notifyUser(userId, {
        type: 'error',
        title: 'Account Suspended',
        message: `Your account has been suspended for ${hours} hours due to policy violations.`,
        data: { suspensionHours: hours },
      });
    } catch (error) {
      logger.error('Failed to suspend user', {
        userId,
        hours,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async banUser(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      await realTimeService.notifyUser(userId, {
        type: 'error',
        title: 'Account Banned',
        message: 'Your account has been permanently banned due to severe policy violations.',
        data: { banned: true },
      });
    } catch (error) {
      logger.error('Failed to ban user', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async sendWarningToUser(userId: string, reason: string): Promise<void> {
    try {
      await realTimeService.notifyUser(userId, {
        type: 'warning',
        title: 'Community Guidelines Warning',
        message: `Please review our community guidelines. Reason: ${reason}`,
        data: { warning: true, reason },
      });
    } catch (error) {
      logger.error('Failed to send warning to user', {
        userId,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const contentModerationService = new ContentModerationService();