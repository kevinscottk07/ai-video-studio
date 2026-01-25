/**
 * Community API Service
 * 
 * API client for community-related operations including posts, comments, likes, and shares.
 * Handles authentication, error handling, and response transformation.
 */

import { apiClient } from './client';

export interface CommunityPost {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  tags: string[];
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    profileImage?: string;
  };
  project: {
    id: string;
    title: string;
  };
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  isLikedByUser?: boolean;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    profileImage?: string;
  };
  replies: Comment[];
  likes?: number;
  isLikedByUser?: boolean;
}

export interface CommunityFeedResponse {
  posts: CommunityPost[];
  total: number;
  hasMore: boolean;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  hasMore: boolean;
}

export interface CommunityFilters {
  tags?: string[];
  sortBy?: 'createdAt' | 'likes' | 'comments' | 'views';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  search?: string;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface LikeResponse {
  success: boolean;
  isLiked: boolean;
  likesCount: number;
}

export interface ShareResponse {
  success: boolean;
  sharesCount: number;
}

class CommunityApiService {
  private readonly baseUrl = '/api/v1/community';

  /**
   * Get community feed with optional filters
   */
  async getFeed(filters: CommunityFilters = {}): Promise<CommunityFeedResponse> {
    const params = new URLSearchParams();
    
    if (filters.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.offset) {
      params.append('offset', filters.offset.toString());
    }
    if (filters.search) {
      params.append('search', filters.search);
    }

    const response = await apiClient.get(`${this.baseUrl}/feed?${params.toString()}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch community feed');
    }

    return response.data;
  }

  /**
   * Get a specific community post
   */
  async getPost(postId: string): Promise<CommunityPost> {
    const response = await apiClient.get(`${this.baseUrl}/posts/${postId}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch post');
    }

    return response.data;
  }

  /**
   * Like or unlike a post
   */
  async likePost(postId: string): Promise<LikeResponse> {
    const response = await apiClient.post(`${this.baseUrl}/posts/${postId}/like`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to like post');
    }

    return response.data;
  }

  /**
   * Add a comment to a post
   */
  async commentOnPost(postId: string, commentData: CreateCommentRequest): Promise<Comment> {
    const response = await apiClient.post(`${this.baseUrl}/posts/${postId}/comments`, commentData);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to add comment');
    }

    return response.data;
  }

  /**
   * Get comments for a post
   */
  async getPostComments(postId: string, limit = 20, offset = 0): Promise<CommentsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await apiClient.get(`${this.baseUrl}/posts/${postId}/comments?${params.toString()}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch comments');
    }

    return response.data;
  }

  /**
   * Share a post on a platform
   */
  async sharePost(postId: string, platform: string): Promise<ShareResponse> {
    const response = await apiClient.post(`${this.baseUrl}/posts/${postId}/share`, { platform });
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to share post');
    }

    return response.data;
  }

  /**
   * Get trending tags
   */
  async getTrendingTags(limit = 20): Promise<string[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    const response = await apiClient.get(`${this.baseUrl}/trending-tags?${params.toString()}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch trending tags');
    }

    return response.data;
  }

  /**
   * Search posts
   */
  async searchPosts(query: string, filters: Omit<CommunityFilters, 'search'> = {}): Promise<CommunityFeedResponse> {
    return this.getFeed({ ...filters, search: query });
  }

  /**
   * Get posts by tag
   */
  async getPostsByTag(tag: string, filters: Omit<CommunityFilters, 'tags'> = {}): Promise<CommunityFeedResponse> {
    return this.getFeed({ ...filters, tags: [tag] });
  }

  /**
   * Get posts by user
   */
  async getUserPosts(userId: string, filters: CommunityFilters = {}): Promise<CommunityFeedResponse> {
    // This would typically be a separate endpoint
    // For now, we'll use the main feed with a user filter
    const params = new URLSearchParams();
    params.append('userId', userId);
    
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.offset) {
      params.append('offset', filters.offset.toString());
    }

    const response = await apiClient.get(`${this.baseUrl}/users/${userId}/posts?${params.toString()}`);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch user posts');
    }

    return response.data;
  }
}

// Export singleton instance
export const communityApi = new CommunityApiService();