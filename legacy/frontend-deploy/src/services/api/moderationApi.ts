import { apiClient } from './client';

export interface ModerationFlag {
  id: string;
  contentType: string;
  contentId: string;
  flaggedBy?: string;
  reason: string;
  description?: string;
  aiConfidence?: number;
  aiAnalysis?: any;
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'under_review';
  reviewedBy?: string;
  reviewedAt?: string;
  moderatorNotes?: string;
  actionTaken: 'no_action' | 'warning' | 'content_removal' | 'account_suspension' | 'account_ban';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  flaggedByUser?: {
    id: string;
    displayName: string;
  };
  reviewedByUser?: {
    id: string;
    displayName: string;
  };
}

export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  contentType?: string;
  contentId?: string;
  reason: string;
  description: string;
  status: string;
  reviewedBy?: string;
  reviewedAt?: string;
  actionTaken: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportRequest {
  contentType?: 'post' | 'comment' | 'user_profile';
  contentId?: string;
  reportedUserId?: string;
  reason: string;
  description: string;
}

export interface ModerationFilters {
  status?: string;
  contentType?: string;
  reason?: string;
  flaggedBy?: string;
  reviewedBy?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export interface ReviewFlagRequest {
  status: string;
  action: string;
  moderatorNotes?: string;
  actionDuration?: number;
}

export interface CommunityGuideline {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationStats {
  flags: {
    total: number;
    pending: number;
    resolved: number;
  };
  reports: {
    total: number;
    pending: number;
  };
  efficiency: {
    resolutionRate: number;
    pendingPercentage: number;
  };
}

class ModerationApi {
  /**
   * Analyze content for moderation (admin/moderator only)
   */
  async analyzeContent(data: {
    contentType: string;
    contentId: string;
    content: {
      text?: string;
      imageUrls?: string[];
      videoUrl?: string;
      metadata?: any;
    };
  }) {
    const response = await apiClient.post('/moderation/analyze', data);
    return response.data;
  }

  /**
   * Create a user report
   */
  async createReport(data: CreateReportRequest): Promise<{ data: UserReport }> {
    const response = await apiClient.post('/moderation/report', data);
    return response.data;
  }

  /**
   * Get moderation queue (admin/moderator only)
   */
  async getModerationQueue(filters: ModerationFilters = {}): Promise<{
    data: {
      flags: ModerationFlag[];
      total: number;
      hasMore: boolean;
    };
  }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await apiClient.get(`/moderation/queue?${params.toString()}`);
    return response.data;
  }

  /**
   * Review a moderation flag (admin/moderator only)
   */
  async reviewFlag(flagId: string, data: ReviewFlagRequest): Promise<{ data: ModerationFlag }> {
    const response = await apiClient.post(`/moderation/review/${flagId}`, data);
    return response.data;
  }

  /**
   * Get community guidelines
   */
  async getCommunityGuidelines(): Promise<{ data: CommunityGuideline[] }> {
    const response = await apiClient.get('/moderation/guidelines');
    return response.data;
  }

  /**
   * Get moderation statistics (admin/moderator only)
   */
  async getModerationStats(): Promise<{ data: ModerationStats }> {
    const response = await apiClient.get('/moderation/stats');
    return response.data;
  }
}

export const moderationApi = new ModerationApi();