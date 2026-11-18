import { PrismaClient, CommunityPost, Comment, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { realTimeService } from './realTimeService.js';
import { contentModerationService } from './contentModerationService.js';

export interface CommunityPostWithDetails extends CommunityPost {
  user: {
    id: string;
    displayName: string;
    profileImage?: string;
  };
  project: {
    id: string;
    title: string;
  };
  likes: {
    id: string;
    userId: string;
    user: {
      displayName: string;
      profileImage?: string;
    };
  }[];
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      displayName: string;
      profileImage?: string;
    };
    replies: {
      id: string;
      content: string;
      createdAt: Date;
      user: {
        id: string;
        displayName: string;
        profileImage?: string;
      };
    }[];
  }[];
  shares: {
    id: string;
    platform: string;
    createdAt: Date;
  }[];
  _count: {
    likes: number;
    comments: number;
    shares: number;
  };
  isLikedByUser?: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
}

export interface CommunityFilters {
  tags?: string[];
  sortBy?: 'createdAt' | 'likes' | 'comments' | 'views';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  search?: string;
}

export class CommunityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getCommunityFeed(
    userId?: string,
    filters: CommunityFilters = {}
  ): Promise<{
    posts: CommunityPostWithDetails[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        tags,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
        search,
      } = filters;

      // Build where clause
      const where: Prisma.CommunityPostWhereInput = {
        isPublic: true,
        ...(tags && tags.length > 0 && {
          tags: {
            hasSome: tags,
          },
        }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { tags: { hasSome: [search] } },
          ],
        }),
      };

      // Build order by clause
      let orderBy: Prisma.CommunityPostOrderByWithRelationInput;
      switch (sortBy) {
        case 'likes':
          orderBy = { likes: { _count: sortOrder } };
          break;
        case 'comments':
          orderBy = { comments: { _count: sortOrder } };
          break;
        case 'views':
          // Use metrics.views for sorting
          orderBy = { createdAt: sortOrder }; // Fallback to createdAt for now
          break;
        default:
          orderBy = { [sortBy]: sortOrder };
      }

      // Get total count
      const total = await this.prisma.communityPost.count({ where });

      // Get posts with all related data
      const posts = await this.prisma.communityPost.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  displayName: true,
                  profileImage: true,
                },
              },
            },
          },
          comments: {
            where: {
              parentCommentId: null, // Only top-level comments
            },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  profileImage: true,
                },
              },
              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      displayName: true,
                      profileImage: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 3, // Limit initial comments loaded
          },
          shares: {
            select: {
              id: true,
              platform: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              shares: true,
            },
          },
        },
        orderBy,
        take: limit,
        skip: offset,
      });

      // Add user-specific data if userId provided
      const postsWithUserData = await Promise.all(
        posts.map(async (post) => {
          let isLikedByUser = false;
          
          if (userId) {
            const userLike = await this.prisma.communityLike.findUnique({
              where: {
                postId_userId: {
                  postId: post.id,
                  userId,
                },
              },
            });
            isLikedByUser = !!userLike;
          }

          return {
            ...post,
            isLikedByUser,
          } as CommunityPostWithDetails;
        })
      );

      const hasMore = offset + posts.length < total;

      return {
        posts: postsWithUserData,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to get community feed', {
        userId,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get community feed');
    }
  }

  async getPost(postId: string, userId?: string): Promise<CommunityPostWithDetails> {
    try {
      const post = await this.prisma.communityPost.findUnique({
        where: { id: postId },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          likes: {
            include: {
              user: {
                select: {
                  displayName: true,
                  profileImage: true,
                },
              },
            },
          },
          comments: {
            where: {
              parentCommentId: null,
            },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  profileImage: true,
                },
              },
              replies: {
                include: {
                  user: {
                    select: {
                      id: true,
                      displayName: true,
                      profileImage: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          shares: {
            select: {
              id: true,
              platform: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              shares: true,
            },
          },
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Check if user liked the post
      let isLikedByUser = false;
      if (userId) {
        const userLike = await this.prisma.communityLike.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId,
            },
          },
        });
        isLikedByUser = !!userLike;
      }

      // Increment view count
      await this.incrementViewCount(postId);

      return {
        ...post,
        isLikedByUser,
      } as CommunityPostWithDetails;
    } catch (error) {
      logger.error('Failed to get post', {
        postId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async likePost(postId: string, userId: string): Promise<{ success: boolean; isLiked: boolean; likesCount: number }> {
    try {
      // Check if post exists
      const post = await this.prisma.communityPost.findUnique({
        where: { id: postId },
        select: { id: true, userId: true },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Check if user already liked the post
      const existingLike = await this.prisma.communityLike.findUnique({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });

      let isLiked: boolean;
      
      if (existingLike) {
        // Unlike the post
        await this.prisma.communityLike.delete({
          where: { id: existingLike.id },
        });
        isLiked = false;
      } else {
        // Like the post
        await this.prisma.communityLike.create({
          data: {
            postId,
            userId,
          },
        });
        isLiked = true;
      }

      // Get updated likes count
      const likesCount = await this.prisma.communityLike.count({
        where: { postId },
      });

      // Update metrics in post
      await this.prisma.communityPost.update({
        where: { id: postId },
        data: {
          metrics: {
            ...(await this.getPostMetrics(postId)),
            likes: likesCount,
          },
        },
      });

      // Broadcast real-time update
      await realTimeService.updateCommunityFeed({
        type: 'like',
        contentId: postId,
        userId,
        data: {
          isLiked,
          likesCount,
        },
      });

      // Send notification to post owner (if not self-like)
      if (post.userId !== userId && isLiked) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });

        await realTimeService.notifyUser(post.userId, {
          type: 'info',
          title: 'New Like',
          message: `${user?.displayName} liked your post.`,
          data: { postId, userId },
        });
      }

      logger.info('Post like toggled', {
        postId,
        userId,
        isLiked,
        likesCount,
      });

      return { success: true, isLiked, likesCount };
    } catch (error) {
      logger.error('Failed to toggle post like', {
        postId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async commentOnPost(
    postId: string,
    userId: string,
    commentData: CreateCommentRequest
  ): Promise<{
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      displayName: string;
      profileImage?: string;
    };
    replies: any[];
  }> {
    try {
      // Check if post exists and allows comments
      const post = await this.prisma.communityPost.findUnique({
        where: { id: postId },
        select: { id: true, userId: true, allowComments: true },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      if (!post.allowComments) {
        throw new Error('Comments are not allowed on this post');
      }

      // If replying to a comment, check if parent exists
      if (commentData.parentCommentId) {
        const parentComment = await this.prisma.comment.findUnique({
          where: { id: commentData.parentCommentId },
        });

        if (!parentComment || parentComment.postId !== postId) {
          throw new Error('Parent comment not found');
        }
      }

      // Create the comment
      const comment = await this.prisma.comment.create({
        data: {
          postId,
          userId,
          content: commentData.content,
          parentCommentId: commentData.parentCommentId,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
            },
          },
          replies: true,
        },
      });

      // Automatically analyze the comment for moderation
      try {
        await contentModerationService.analyzeContent('comment', comment.id, {
          text: commentData.content,
          metadata: {
            postId,
            userId,
            parentCommentId: commentData.parentCommentId,
          },
        });
      } catch (moderationError) {
        // Log moderation error but don't fail comment creation
        logger.warn('Failed to analyze comment for moderation', {
          commentId: comment.id,
          error: moderationError instanceof Error ? moderationError.message : 'Unknown error',
        });
      }

      // Update comments count in post metrics
      const commentsCount = await this.prisma.comment.count({
        where: { postId },
      });

      await this.prisma.communityPost.update({
        where: { id: postId },
        data: {
          metrics: {
            ...(await this.getPostMetrics(postId)),
            comments: commentsCount,
          },
        },
      });

      // Broadcast real-time update
      await realTimeService.updateCommunityFeed({
        type: 'comment',
        contentId: postId,
        userId,
        data: {
          comment: {
            id: comment.id,
            content: comment.content,
            createdAt: comment.createdAt,
            user: comment.user,
            isReply: !!commentData.parentCommentId,
            parentCommentId: commentData.parentCommentId,
          },
          commentsCount,
        },
      });

      // Send notification to post owner (if not self-comment)
      if (post.userId !== userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });

        await realTimeService.notifyUser(post.userId, {
          type: 'info',
          title: 'New Comment',
          message: `${user?.displayName} commented on your post.`,
          data: { postId, commentId: comment.id, userId },
        });
      }

      // If replying to a comment, notify the parent comment author
      if (commentData.parentCommentId) {
        const parentComment = await this.prisma.comment.findUnique({
          where: { id: commentData.parentCommentId },
          select: { userId: true },
        });

        if (parentComment && parentComment.userId !== userId) {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true },
          });

          await realTimeService.notifyUser(parentComment.userId, {
            type: 'info',
            title: 'New Reply',
            message: `${user?.displayName} replied to your comment.`,
            data: { postId, commentId: comment.id, parentCommentId: commentData.parentCommentId, userId },
          });
        }
      }

      logger.info('Comment created', {
        postId,
        commentId: comment.id,
        userId,
        isReply: !!commentData.parentCommentId,
      });

      return comment;
    } catch (error) {
      logger.error('Failed to create comment', {
        postId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async sharePost(
    postId: string,
    userId: string,
    platform: string
  ): Promise<{ success: boolean; sharesCount: number }> {
    try {
      // Check if post exists
      const post = await this.prisma.communityPost.findUnique({
        where: { id: postId },
        select: { id: true, userId: true },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // Create share record
      await this.prisma.communityShare.create({
        data: {
          postId,
          userId,
          platform,
        },
      });

      // Get updated shares count
      const sharesCount = await this.prisma.communityShare.count({
        where: { postId },
      });

      // Update metrics in post
      await this.prisma.communityPost.update({
        where: { id: postId },
        data: {
          metrics: {
            ...(await this.getPostMetrics(postId)),
            shares: sharesCount,
          },
        },
      });

      // Broadcast real-time update
      await realTimeService.updateCommunityFeed({
        type: 'share',
        contentId: postId,
        userId,
        data: {
          platform,
          sharesCount,
        },
      });

      // Send notification to post owner (if not self-share)
      if (post.userId !== userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });

        await realTimeService.notifyUser(post.userId, {
          type: 'info',
          title: 'Post Shared',
          message: `${user?.displayName} shared your post on ${platform}.`,
          data: { postId, platform, userId },
        });
      }

      logger.info('Post shared', {
        postId,
        userId,
        platform,
        sharesCount,
      });

      return { success: true, sharesCount };
    } catch (error) {
      logger.error('Failed to share post', {
        postId,
        userId,
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getPostComments(
    postId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    comments: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // Get total count
      const total = await this.prisma.comment.count({
        where: {
          postId,
          parentCommentId: null,
        },
      });

      // Get comments
      const comments = await this.prisma.comment.findMany({
        where: {
          postId,
          parentCommentId: null,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  profileImage: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      const hasMore = offset + comments.length < total;

      return {
        comments,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to get post comments', {
        postId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get post comments');
    }
  }

  async getTrendingTags(limit: number = 20): Promise<string[]> {
    try {
      // Get all tags from recent posts
      const recentPosts = await this.prisma.communityPost.findMany({
        where: {
          isPublic: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: {
          tags: true,
        },
      });

      // Count tag occurrences
      const tagCounts = new Map<string, number>();
      recentPosts.forEach(post => {
        post.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });

      // Sort by count and return top tags
      return Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag]) => tag);
    } catch (error) {
      logger.error('Failed to get trending tags', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get trending tags');
    }
  }

  /**
   * Create a new community post with automatic moderation analysis
   */
  async createPost(
    userId: string,
    projectId: string,
    postData: {
      title: string;
      description?: string;
      videoUrl: string;
      thumbnailUrl: string;
      tags: string[];
      isPublic?: boolean;
      allowComments?: boolean;
      allowDownloads?: boolean;
    }
  ): Promise<CommunityPost> {
    try {
      // Create the post
      const post = await this.prisma.communityPost.create({
        data: {
          userId,
          projectId,
          title: postData.title,
          description: postData.description,
          videoUrl: postData.videoUrl,
          thumbnailUrl: postData.thumbnailUrl,
          tags: postData.tags,
          isPublic: postData.isPublic !== false,
          allowComments: postData.allowComments !== false,
          allowDownloads: postData.allowDownloads || false,
          metrics: {
            likes: 0,
            comments: 0,
            shares: 0,
            views: 0,
          },
        },
      });

      // Automatically analyze the post for moderation
      try {
        await contentModerationService.analyzeContent('post', post.id, {
          text: `${postData.title} ${postData.description || ''}`,
          videoUrl: postData.videoUrl,
          metadata: {
            tags: postData.tags,
            userId,
            projectId,
          },
        });
      } catch (moderationError) {
        // Log moderation error but don't fail post creation
        logger.warn('Failed to analyze post for moderation', {
          postId: post.id,
          error: moderationError instanceof Error ? moderationError.message : 'Unknown error',
        });
      }

      logger.info('Community post created', {
        postId: post.id,
        userId,
        projectId,
        title: postData.title,
        isPublic: post.isPublic,
      });

      return post;
    } catch (error) {
      logger.error('Failed to create community post', {
        userId,
        projectId,
        postData,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async getPostMetrics(postId: string): Promise<any> {
    try {
      const [likes, comments, shares, views] = await Promise.all([
        this.prisma.communityLike.count({ where: { postId } }),
        this.prisma.comment.count({ where: { postId } }),
        this.prisma.communityShare.count({ where: { postId } }),
        // For now, we'll use a simple view count - in production you'd track this properly
        Promise.resolve(0),
      ]);

      return { likes, comments, shares, views };
    } catch (error) {
      logger.error('Failed to get post metrics', {
        postId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { likes: 0, comments: 0, shares: 0, views: 0 };
    }
  }

  private async incrementViewCount(postId: string): Promise<void> {
    try {
      // In a production app, you'd want to track unique views per user
      // For now, we'll just increment a simple counter in the metrics
      const currentMetrics = await this.prisma.communityPost.findUnique({
        where: { id: postId },
        select: { metrics: true },
      });

      if (currentMetrics) {
        const metrics = currentMetrics.metrics as any;
        await this.prisma.communityPost.update({
          where: { id: postId },
          data: {
            metrics: {
              ...metrics,
              views: (metrics.views || 0) + 1,
            },
          },
        });
      }
    } catch (error) {
      // Don't throw on view count errors - it's not critical
      logger.warn('Failed to increment view count', {
        postId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export singleton instance
export const communityService = new CommunityService();