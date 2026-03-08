import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectService } from '../projectService';
import { realTimeService } from '../realTimeService';

// Mock dependencies
vi.mock('../realTimeService', () => ({
  realTimeService: {
    updateProject: vi.fn(),
    notifyUser: vi.fn(),
  },
}));

const mockPrisma = {
  project: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  mediaAsset: {
    count: vi.fn(),
  },
  communityPost: {
    create: vi.fn(),
  },
  generationJob: {
    findFirst: vi.fn(),
  },
};

vi.mock('../config/prisma', () => ({
  prisma: mockPrisma,
}));
const mockRealTimeService = vi.mocked(realTimeService);

describe('ProjectService', () => {
  let projectService: ProjectService;
  const mockUserId = 'user-123';
  const mockProjectId = 'project-123';

  beforeEach(() => {
    projectService = new ProjectService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createProject', () => {
    it('should create a project with default settings', async () => {
      const mockProject = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        description: 'Test Description',
        settings: {
          resolution: 'hd',
          duration: 30,
          language: 'en',
          style: 'cinematic',
          musicEnabled: true,
        },
        status: 'draft',
        isPublic: false,
        mediaAssets: [],
        user: {
          id: mockUserId,
          displayName: 'Test User',
          profileImage: null,
        },
        _count: {
          mediaAssets: 0,
          generationJobs: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.project.create.mockResolvedValue(mockProject as any);

      const projectData = {
        title: 'Test Project',
        description: 'Test Description',
      };

      const result = await projectService.createProject(mockUserId, projectData);

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          title: 'Test Project',
          description: 'Test Description',
          settings: {
            resolution: 'standard',
            duration: 30,
            language: 'en',
            style: 'cinematic',
            musicEnabled: true,
          },
          isPublic: false,
          status: 'draft',
        },
        include: {
          mediaAssets: true,
          user: {
            select: {
              id: true,
              displayName: true,
              profileImage: true,
            },
          },
          _count: {
            select: {
              mediaAssets: true,
              generationJobs: true,
            },
          },
        },
      });

      expect(mockRealTimeService.updateProject).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          projectId: mockProjectId,
          type: 'status',
          data: expect.objectContaining({
            action: 'created',
          }),
          userId: mockUserId,
        })
      );

      expect(mockRealTimeService.notifyUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          type: 'success',
          title: 'Project Created',
        })
      );

      expect(result).toEqual(mockProject);
    });

    it('should merge custom settings with defaults', async () => {
      const mockProject = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        settings: {
          resolution: 'ultra',
          duration: 60,
          language: 'es',
          style: 'advertisement',
          musicEnabled: false,
        },
        status: 'draft',
        isPublic: true,
        mediaAssets: [],
        user: { id: mockUserId, displayName: 'Test User' },
        _count: { mediaAssets: 0, generationJobs: 0 },
      };

      mockPrisma.project.create.mockResolvedValue(mockProject as any);

      const projectData = {
        title: 'Test Project',
        settings: {
          resolution: 'ultra' as const,
          duration: 60,
          language: 'es',
          style: 'advertisement',
          musicEnabled: false,
        },
        isPublic: true,
      };

      await projectService.createProject(mockUserId, projectData);

      expect(mockPrisma.project.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          title: 'Test Project',
          settings: {
            resolution: 'ultra',
            duration: 60,
            language: 'es',
            style: 'advertisement',
            musicEnabled: false,
          },
          isPublic: true,
          status: 'draft',
        },
        include: expect.any(Object),
      });
    });

    it('should handle creation errors', async () => {
      mockPrisma.project.create.mockRejectedValue(new Error('Database error'));

      const projectData = {
        title: 'Test Project',
      };

      await expect(
        projectService.createProject(mockUserId, projectData)
      ).rejects.toThrow('Failed to create project');
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      const existingProject = {
        id: mockProjectId,
        userId: mockUserId,
        settings: { resolution: 'hd', duration: 30 },
      };

      const updatedProject = {
        ...existingProject,
        title: 'Updated Title',
        settings: { resolution: 'ultra', duration: 60 },
        updatedAt: new Date(),
        mediaAssets: [],
        user: { id: mockUserId, displayName: 'Test User' },
        _count: { mediaAssets: 0, generationJobs: 0 },
      };

      mockPrisma.project.findFirst.mockResolvedValue(existingProject as any);
      mockPrisma.project.update.mockResolvedValue(updatedProject as any);

      const updates = {
        title: 'Updated Title',
        settings: { resolution: 'ultra' as const, duration: 60 },
      };

      const result = await projectService.updateProject(mockProjectId, mockUserId, updates);

      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: mockProjectId, userId: mockUserId },
      });

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: mockProjectId },
        data: {
          title: 'Updated Title',
          settings: { resolution: 'ultra', duration: 60 },
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });

      expect(mockRealTimeService.updateProject).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          type: 'settings',
          data: expect.objectContaining({
            action: 'updated',
          }),
        })
      );

      expect(result).toEqual(updatedProject);
    });

    it('should throw error if project not found or access denied', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      const updates = { title: 'Updated Title' };

      await expect(
        projectService.updateProject(mockProjectId, mockUserId, updates)
      ).rejects.toThrow('Project not found or access denied');
    });

    it('should merge settings correctly', async () => {
      const existingProject = {
        id: mockProjectId,
        userId: mockUserId,
        settings: {
          resolution: 'hd',
          duration: 30,
          language: 'en',
          style: 'cinematic',
          musicEnabled: true,
        },
      };

      mockPrisma.project.findFirst.mockResolvedValue(existingProject as any);
      mockPrisma.project.update.mockResolvedValue({
        ...existingProject,
        mediaAssets: [],
        user: { id: mockUserId, displayName: 'Test User' },
        _count: { mediaAssets: 0, generationJobs: 0 },
      } as any);

      const updates = {
        settings: { resolution: 'ultra' as const, duration: 60 },
      };

      await projectService.updateProject(mockProjectId, mockUserId, updates);

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: mockProjectId },
        data: {
          settings: {
            resolution: 'ultra',
            duration: 60,
            language: 'en',
            style: 'cinematic',
            musicEnabled: true,
          },
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      const existingProject = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        mediaAssets: [],
        generationJobs: [],
      };

      mockPrisma.project.findFirst.mockResolvedValue(existingProject as any);
      mockPrisma.project.delete.mockResolvedValue(existingProject as any);

      await projectService.deleteProject(mockProjectId, mockUserId);

      expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
        where: { id: mockProjectId, userId: mockUserId },
        include: {
          mediaAssets: true,
          generationJobs: true,
        },
      });

      expect(mockPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: mockProjectId },
      });

      expect(mockRealTimeService.updateProject).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          type: 'status',
          data: expect.objectContaining({
            action: 'deleted',
          }),
        })
      );

      expect(mockRealTimeService.notifyUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          type: 'info',
          title: 'Project Deleted',
        })
      );
    });

    it('should throw error if project not found', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);

      await expect(
        projectService.deleteProject(mockProjectId, mockUserId)
      ).rejects.toThrow('Project not found or access denied');
    });
  });

  describe('getUserProjects', () => {
    it('should return user projects with pagination', async () => {
      const mockProjects = [
        {
          id: 'project-1',
          title: 'Project 1',
          mediaAssets: [],
          user: { id: mockUserId, displayName: 'Test User' },
          _count: { mediaAssets: 0, generationJobs: 0 },
        },
        {
          id: 'project-2',
          title: 'Project 2',
          mediaAssets: [],
          user: { id: mockUserId, displayName: 'Test User' },
          _count: { mediaAssets: 1, generationJobs: 2 },
        },
      ];

      mockPrisma.project.count.mockResolvedValue(10);
      mockPrisma.project.findMany.mockResolvedValue(mockProjects as any);

      const filters = {
        status: 'draft' as const,
        limit: 5,
        offset: 0,
      };

      const result = await projectService.getUserProjects(mockUserId, filters);

      expect(mockPrisma.project.count).toHaveBeenCalledWith({
        where: { userId: mockUserId, status: 'draft' },
      });

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, status: 'draft' },
        include: expect.any(Object),
        orderBy: { updatedAt: 'desc' },
        take: 5,
        skip: 0,
      });

      expect(result).toEqual({
        projects: mockProjects,
        total: 10,
        hasMore: true,
      });
    });

    it('should handle search filters', async () => {
      mockPrisma.project.count.mockResolvedValue(2);
      mockPrisma.project.findMany.mockResolvedValue([]);

      const filters = {
        search: 'test query',
        sortBy: 'title' as const,
        sortOrder: 'asc' as const,
      };

      await projectService.getUserProjects(mockUserId, filters);

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          OR: [
            { title: { contains: 'test query', mode: 'insensitive' } },
            { description: { contains: 'test query', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: { title: 'asc' },
        take: 20,
        skip: 0,
      });
    });
  });

  describe('shareProject', () => {
    it('should update project sharing settings', async () => {
      const existingProject = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        isPublic: false,
      };

      const updatedProject = {
        ...existingProject,
        isPublic: true,
        mediaAssets: [],
        user: { id: mockUserId, displayName: 'Test User' },
        _count: { mediaAssets: 0, generationJobs: 0 },
      };

      mockPrisma.project.findFirst.mockResolvedValue(existingProject as any);
      mockPrisma.project.update.mockResolvedValue(updatedProject as any);
      mockPrisma.generationJob.findFirst.mockResolvedValue({
        id: 'job-1',
        resultUrl: 'https://example.com/video.mp4',
      } as any);
      mockPrisma.communityPost.create.mockResolvedValue({} as any);

      const shareSettings = {
        isPublic: true,
        allowComments: true,
        allowDownloads: false,
      };

      const result = await projectService.shareProject(mockProjectId, mockUserId, shareSettings);

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: mockProjectId },
        data: {
          isPublic: true,
          updatedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });

      expect(mockPrisma.communityPost.create).toHaveBeenCalledWith({
        data: {
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Test Project',
          description: undefined,
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/video.mp4',
          allowComments: true,
          allowDownloads: false,
        },
      });

      expect(mockRealTimeService.updateProject).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          type: 'collaboration',
          data: expect.objectContaining({
            action: 'shared',
            isPublic: true,
          }),
        })
      );

      expect(result).toEqual(updatedProject);
    });

    it('should not create community post if no completed video', async () => {
      const existingProject = {
        id: mockProjectId,
        userId: mockUserId,
        isPublic: false,
      };

      mockPrisma.project.findFirst.mockResolvedValue(existingProject as any);
      mockPrisma.project.update.mockResolvedValue({
        ...existingProject,
        isPublic: true,
        mediaAssets: [],
        user: { id: mockUserId, displayName: 'Test User' },
        _count: { mediaAssets: 0, generationJobs: 0 },
      } as any);
      mockPrisma.generationJob.findFirst.mockResolvedValue(null);

      const shareSettings = { isPublic: true };

      await projectService.shareProject(mockProjectId, mockUserId, shareSettings);

      expect(mockPrisma.communityPost.create).not.toHaveBeenCalled();
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      mockPrisma.project.count
        .mockResolvedValueOnce(10) // totalProjects
        .mockResolvedValueOnce(3)  // draftProjects
        .mockResolvedValueOnce(5)  // completedProjects
        .mockResolvedValueOnce(2); // publicProjects

      mockPrisma.mediaAsset.count.mockResolvedValue(25); // totalAssets

      const result = await projectService.getProjectStats(mockUserId);

      expect(result).toEqual({
        totalProjects: 10,
        draftProjects: 3,
        completedProjects: 5,
        publicProjects: 2,
        totalAssets: 25,
      });

      expect(mockPrisma.project.count).toHaveBeenCalledTimes(4);
      expect(mockPrisma.mediaAsset.count).toHaveBeenCalledWith({
        where: { project: { userId: mockUserId } },
      });
    });
  });
});