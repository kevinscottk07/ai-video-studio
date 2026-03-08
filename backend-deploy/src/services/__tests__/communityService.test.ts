/**
 * Community Service Tests
 * 
 * Unit tests for the community service functionality including posts, comments, likes, and shares.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CommunityService } from '../communityService.js';
import { prisma } from '../../config/prisma.js';
import { realTimeService } from '../realTimeService.js';

// Mock dependencies
vi.mock('../../config/prisma.js', () => ({
  prisma: {
    communityPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    communityLike: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    communityShare: {
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../realTimeService.js', () => ({
  realTimeService: {
    updateCommunityFeed: vi.fn(),
    notifyUser: vi.fn(),
  },
}));

describe('CommunityService', () => {
  let communityService: CommunityService;

  beforeEach(() => {
    communityService = new CommunityService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getCommunityFeed', () => {
    it('should return community feed with posts', async () => {
      const mockPosts = [
        {
          id: 'post1',
          title: 'Test Post',
          description: 'Test Description',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          tags: ['ai', 'video'],
          createdAt: new Date(),
          user: {
            id: 'user1',
            displayName: 'Test User',
            profileImage: 'https://example.com/avatar.jpg',
          },
          project: {
            id: 'project1',
            title: 'Test Project',
          },
          likes: [],
          comments: [],
          shares: [],
          _count: {
            likes: 5,
            comments: 3,
            shares: 2,
          },
        },
      ];

      (prisma.communityPost.count as any).mockResolvedValue(1);
      (prisma.communityPost.findMany as any).mockResolvedValue(mockPosts);

      const result = await communityService.getCommunityFeed();

      expect(result).toEqual({
        posts: expect.arrayContaining([
          expect.objectContaining({
            id: 'post1',
            title: 'Test Post',
            isLikedByUser: false,
          }),
        ]),
        total: 1,
        hasMore: false,
      });

      expect(prisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublic: true },
          include: expect.any(Object),
          orderBy: { createdAt: 'desc' },
          take: 20,
          skip: 0,
        })
      );
    });

    it('should filter posts by tags', async () => {
      (prisma.communityPost.count as any).mockResolvedValue(0);
      (prisma.communityPost.findMany as any).mockResolvedValue([]);

      await communityService.getCommunityFeed(undefined, {
        tags: ['ai', 'video'],
      });

      expect(prisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isPublic: true,
            tags: {
              hasSome: ['ai', 'video'],
            },
          },
        })
      );
    });

    it('should search posts by query', async () => {
      (prisma.communityPost.count as any).mockResolvedValue(0);
      (prisma.communityPost.findMany as any).mockResolvedValue([]);

      await communityService.getCommunityFeed(undefined, {
        search: 'test query',
      });

      expect(prisma.communityPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isPublic: true,
            OR: [
              { title: { contains: 'test query', mode: 'insensitive' } },
              { description: { contains: 'test query', mode: 'insensitive' } },
              { tags: { hasSome: ['test query'] } },
            ],
          },
        })
      );
    });
  });

  describe('likePost', () => {
    it('should like a post when user has not liked it', async () => {
      const mockPost = { id: 'post1', userId: 'owner1' };
      
      (prisma.communityPost.findUnique as any).mockResolvedValue(mockPost);
      (prisma.communityLike.findUnique as any).mockResolvedValue(null);
      (prisma.communityLike.create as any).mockResolvedValue({ id: 'like1' });
      (prisma.communityLike.count as any).mockResolvedValue(6);
      (prisma.communityPost.update as any).mockResolvedValue({});
      (prisma.user.findUnique as any).mockResolvedValue({ displayName: 'Test User' });

      const result = await communityService.likePost('post1', 'user1');

      expect(result).toEqual({
        success: true,
        isLiked: true,
        likesCount: 6,
      });

      expect(prisma.communityLike.create).toHaveBeenCalledWith({
        data: {
          postId: 'post1',
          userId: 'user1',
        },
      });

      expect(realTimeService.updateCommunityFeed).toHaveBeenCalledWith({
        type: 'like',
        contentId: 'post1',
        userId: 'user1',
        data: {
          isLiked: true,
          likesCount: 6,
        },
      });
    });

    it('should unlike a post when user has already liked it', async () => {
      const mockPost = { id: 'post1', userId: 'owner1' };
      const mockLike = { id: 'like1' };
      
      (prisma.communityPost.findUnique as any).mockResolvedValue(mockPost);
      (prisma.communityLike.findUnique as any).mockResolvedValue(mockLike);
      (prisma.communityLike.delete as any).mockResolvedValue({});
      (prisma.communityLike.count as any).mockResolvedValue(4);
      (prisma.communityPost.update as any).mockResolvedValue({});

      const result = await communityService.likePost('post1', 'user1');

      expect(result).toEqual({
        success: true,
        isLiked: false,
        likesCount: 4,
      });

      expect(prisma.communityLike.delete).toHaveBeenCalledWith({
        where: { id: 'like1' },
      });
    });

    it('should throw error when post not found', async () => {
      (prisma.communityPost.findUnique as any).mockResolvedValue(null);

      await expect(communityService.likePost('nonexistent', 'user1')).rejects.toThrow('Post not found');
    });
  });

  describe('commentOnPost', () => {
    it('should create a comment on a post', async () => {
      const mockPost = { id: 'post1', userId: 'owner1', allowComments: true };
      const mockComment = {
        id: 'comment1',
        content: 'Test comment',
        createdAt: new Date(),
        user: {
          id: 'user1',
          displayName: 'Test User',
          profileImage: 'https://example.com/avatar.jpg',
        },
        replies: [],
      };

      (prisma.communityPost.findUnique as any).mockResolvedValue(mockPost);
      (prisma.comment.create as any).mockResolvedValue(mockComment);
      (prisma.comment.count as any).mockResolvedValue(4);
      (prisma.communityPost.update as any).mockResolvedValue({});
      (prisma.user.findUnique as any).mockResolvedValue({ displayName: 'Test User' });

      const result = await communityService.commentOnPost('post1', 'user1', {
        content: 'Test comment',
      });

      expect(result).toEqual(mockComment);

      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          postId: 'post1',
          userId: 'user1',
          content: 'Test comment',
          parentCommentId: undefined,
        },
        include: expect.any(Object),
      });

      expect(realTimeService.updateCommunityFeed).toHaveBeenCalledWith({
        type: 'comment',
        contentId: 'post1',
        userId: 'user1',
        data: expect.objectContaining({
          comment: expect.objectContaining({
            id: 'comment1',
            content: 'Test comment',
          }),
          commentsCount: 4,
        }),
      });
    });

    it('should throw error when comments are not allowed', async () => {
      const mockPost = { id: 'post1', userId: 'owner1', allowComments: false };
      
      (prisma.communityPost.findUnique as any).mockResolvedValue(mockPost);

      await expect(
        communityService.commentOnPost('post1', 'user1', { content: 'Test comment' })
      ).rejects.toThrow('Comments are not allowed on this post');
    });

    it('should throw error when post not found', async () => {
      (prisma.communityPost.findUnique as any).mockResolvedValue(null);

      await expect(
        communityService.commentOnPost('nonexistent', 'user1', { content: 'Test comment' })
      ).rejects.toThrow('Post not found');
    });
  });

  describe('sharePost', () => {
    it('should create a share record for a post', async () => {
      const mockPost = { id: 'post1', userId: 'owner1' };
      
      (prisma.communityPost.findUnique as any).mockResolvedValue(mockPost);
      (prisma.communityShare.create as any).mockResolvedValue({ id: 'share1' });
      (prisma.communityShare.count as any).mockResolvedValue(3);
      (prisma.communityPost.update as any).mockResolvedValue({});
      (prisma.user.findUnique as any).mockResolvedValue({ displayName: 'Test User' });

      const result = await communityService.sharePost('post1', 'user1', 'twitter');

      expect(result).toEqual({
        success: true,
        sharesCount: 3,
      });

      expect(prisma.communityShare.create).toHaveBeenCalledWith({
        data: {
          postId: 'post1',
          userId: 'user1',
          platform: 'twitter',
        },
      });

      expect(realTimeService.updateCommunityFeed).toHaveBeenCalledWith({
        type: 'share',
        contentId: 'post1',
        userId: 'user1',
        data: {
          platform: 'twitter',
          sharesCount: 3,
        },
      });
    });

    it('should throw error when post not found', async () => {
      (prisma.communityPost.findUnique as any).mockResolvedValue(null);

      await expect(communityService.sharePost('nonexistent', 'user1', 'twitter')).rejects.toThrow('Post not found');
    });
  });

  describe('getTrendingTags', () => {
    it('should return trending tags from recent posts', async () => {
      const mockPosts = [
        { tags: ['ai', 'video', 'creative'] },
        { tags: ['ai', 'machine-learning'] },
        { tags: ['video', 'editing'] },
        { tags: ['ai', 'creative'] },
      ];

      (prisma.communityPost.findMany as any).mockResolvedValue(mockPosts);

      const result = await communityService.getTrendingTags(5);

      expect(result).toEqual(['ai', 'video', 'creative', 'machine-learning', 'editing']);
      
      expect(prisma.communityPost.findMany).toHaveBeenCalledWith({
        where: {
          isPublic: true,
          createdAt: {
            gte: expect.any(Date),
          },
        },
        select: {
          tags: true,
        },
      });
    });

    it('should return empty array when no posts found', async () => {
      (prisma.communityPost.findMany as any).mockResolvedValue([]);

      const result = await communityService.getTrendingTags();

      expect(result).toEqual([]);
    });
  });
});