import { PrismaClient, Project, ProjectStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { realTimeService } from './realTimeService.js';

export interface CreateProjectRequest {
  title: string;
  description?: string;
  settings?: {
    resolution?: 'standard' | 'hd' | 'ultra';
    duration?: number;
    language?: string;
    style?: string;
    musicEnabled?: boolean;
  };
  isPublic?: boolean;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  settings?: {
    resolution?: 'standard' | 'hd' | 'ultra';
    duration?: number;
    language?: string;
    style?: string;
    musicEnabled?: boolean;
  };
  status?: ProjectStatus;
  isPublic?: boolean;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  isPublic?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ShareSettings {
  isPublic: boolean;
  allowComments?: boolean;
  allowDownloads?: boolean;
  collaborators?: string[]; // User IDs
}

export interface ProjectWithAssets extends Project {
  mediaAssets: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    sizeBytes: bigint;
    url: string;
    thumbnailUrl?: string;
    metadata: any;
    createdAt: Date;
  }[];
  user: {
    id: string;
    displayName: string;
    profileImage?: string;
  };
  _count: {
    mediaAssets: number;
    generationJobs: number;
  };
}

export class ProjectService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async createProject(userId: string, projectData: CreateProjectRequest): Promise<ProjectWithAssets> {
    try {
      const defaultSettings = {
        resolution: 'standard',
        duration: 30,
        language: 'en',
        style: 'cinematic',
        musicEnabled: true,
        ...projectData.settings,
      };

      const project = await this.prisma.project.create({
        data: {
          userId,
          title: projectData.title,
          description: projectData.description,
          settings: defaultSettings,
          isPublic: projectData.isPublic || false,
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

      // Broadcast project creation to user
      await realTimeService.updateProject(project.id, {
        projectId: project.id,
        type: 'status',
        data: {
          action: 'created',
          project: {
            id: project.id,
            title: project.title,
            status: project.status,
          },
        },
        userId,
      });

      // Send notification to user
      await realTimeService.notifyUser(userId, {
        type: 'success',
        title: 'Project Created',
        message: `Project "${project.title}" has been created successfully.`,
        data: { projectId: project.id },
      });

      logger.info('Project created successfully', {
        projectId: project.id,
        userId,
        title: project.title,
      });

      return project as ProjectWithAssets;
    } catch (error) {
      logger.error('Failed to create project', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to create project');
    }
  }

  async updateProject(projectId: string, userId: string, updates: UpdateProjectRequest): Promise<ProjectWithAssets> {
    try {
      // First check if user owns the project
      const existingProject = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
      });

      if (!existingProject) {
        throw new Error('Project not found or access denied');
      }

      // Merge settings if provided
      let newSettings = existingProject.settings;
      if (updates.settings) {
        newSettings = {
          ...(existingProject.settings as any),
          ...updates.settings,
        };
      }

      const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          ...(updates.title && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.settings && { settings: newSettings }),
          ...(updates.status && { status: updates.status }),
          ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
          updatedAt: new Date(),
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

      // Broadcast project update
      await realTimeService.updateProject(projectId, {
        projectId,
        type: 'settings',
        data: {
          action: 'updated',
          changes: updates,
          project: {
            id: project.id,
            title: project.title,
            status: project.status,
            updatedAt: project.updatedAt,
          },
        },
        userId,
      });

      logger.info('Project updated successfully', {
        projectId,
        userId,
        changes: Object.keys(updates),
      });

      return project as ProjectWithAssets;
    } catch (error) {
      logger.error('Failed to update project', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    try {
      // First check if user owns the project
      const existingProject = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
        include: {
          mediaAssets: true,
          generationJobs: true,
        },
      });

      if (!existingProject) {
        throw new Error('Project not found or access denied');
      }

      // Delete the project (cascade will handle related records)
      await this.prisma.project.delete({
        where: { id: projectId },
      });

      // Broadcast project deletion
      await realTimeService.updateProject(projectId, {
        projectId,
        type: 'status',
        data: {
          action: 'deleted',
          project: {
            id: projectId,
            title: existingProject.title,
          },
        },
        userId,
      });

      // Send notification to user
      await realTimeService.notifyUser(userId, {
        type: 'info',
        title: 'Project Deleted',
        message: `Project "${existingProject.title}" has been deleted.`,
      });

      logger.info('Project deleted successfully', {
        projectId,
        userId,
        title: existingProject.title,
        assetsCount: existingProject.mediaAssets.length,
        jobsCount: existingProject.generationJobs.length,
      });
    } catch (error) {
      logger.error('Failed to delete project', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getProject(projectId: string, userId?: string): Promise<ProjectWithAssets> {
    try {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { userId: userId }, // User owns the project
            { isPublic: true }, // Project is public
          ],
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

      if (!project) {
        throw new Error('Project not found or access denied');
      }

      return project as ProjectWithAssets;
    } catch (error) {
      logger.error('Failed to get project', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getUserProjects(userId: string, filters: ProjectFilters = {}): Promise<{
    projects: ProjectWithAssets[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        status,
        isPublic,
        search,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = filters;

      // Build where clause
      const where: Prisma.ProjectWhereInput = {
        userId,
        ...(status && { status }),
        ...(isPublic !== undefined && { isPublic }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      // Get total count
      const total = await this.prisma.project.count({ where });

      // Get projects
      const projects = await this.prisma.project.findMany({
        where,
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
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      });

      const hasMore = offset + projects.length < total;

      return {
        projects: projects as ProjectWithAssets[],
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to get user projects', {
        userId,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get user projects');
    }
  }

  async searchProjects(query: string, filters: Omit<ProjectFilters, 'search'> = {}): Promise<{
    projects: ProjectWithAssets[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const {
        status,
        isPublic = true, // Default to public projects for search
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
      } = filters;

      // Build where clause for public projects search
      const where: Prisma.ProjectWhereInput = {
        isPublic,
        ...(status && { status }),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      };

      // Get total count
      const total = await this.prisma.project.count({ where });

      // Get projects
      const projects = await this.prisma.project.findMany({
        where,
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
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      });

      const hasMore = offset + projects.length < total;

      return {
        projects: projects as ProjectWithAssets[],
        total,
        hasMore,
      };
    } catch (error) {
      logger.error('Failed to search projects', {
        query,
        filters,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to search projects');
    }
  }

  async shareProject(projectId: string, userId: string, shareSettings: ShareSettings): Promise<ProjectWithAssets> {
    try {
      // First check if user owns the project
      const existingProject = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
        },
      });

      if (!existingProject) {
        throw new Error('Project not found or access denied');
      }

      // Update project sharing settings
      const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          isPublic: shareSettings.isPublic,
          updatedAt: new Date(),
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

      // If making public, create community post
      if (shareSettings.isPublic && !existingProject.isPublic) {
        // Find the latest completed video for this project
        const latestJob = await this.prisma.generationJob.findFirst({
          where: {
            projectId,
            status: 'completed',
            resultUrl: { not: null },
          },
          orderBy: { completedAt: 'desc' },
        });

        if (latestJob && latestJob.resultUrl) {
          await this.prisma.communityPost.create({
            data: {
              projectId,
              userId,
              title: project.title,
              description: project.description,
              videoUrl: latestJob.resultUrl,
              thumbnailUrl: latestJob.resultUrl, // TODO: Generate actual thumbnail
              allowComments: shareSettings.allowComments ?? true,
              allowDownloads: shareSettings.allowDownloads ?? false,
            },
          });
        }
      }

      // Broadcast sharing update
      await realTimeService.updateProject(projectId, {
        projectId,
        type: 'collaboration',
        data: {
          action: 'shared',
          isPublic: shareSettings.isPublic,
          project: {
            id: project.id,
            title: project.title,
          },
        },
        userId,
      });

      // Send notification to user
      await realTimeService.notifyUser(userId, {
        type: 'success',
        title: shareSettings.isPublic ? 'Project Shared' : 'Project Made Private',
        message: shareSettings.isPublic 
          ? `Project "${project.title}" is now public and visible in the community.`
          : `Project "${project.title}" is now private.`,
        data: { projectId: project.id },
      });

      logger.info('Project sharing updated', {
        projectId,
        userId,
        isPublic: shareSettings.isPublic,
        title: project.title,
      });

      return project as ProjectWithAssets;
    } catch (error) {
      logger.error('Failed to update project sharing', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getProjectStats(userId: string): Promise<{
    totalProjects: number;
    draftProjects: number;
    completedProjects: number;
    publicProjects: number;
    totalAssets: number;
  }> {
    try {
      const [
        totalProjects,
        draftProjects,
        completedProjects,
        publicProjects,
        totalAssets,
      ] = await Promise.all([
        this.prisma.project.count({ where: { userId } }),
        this.prisma.project.count({ where: { userId, status: 'draft' } }),
        this.prisma.project.count({ where: { userId, status: 'completed' } }),
        this.prisma.project.count({ where: { userId, isPublic: true } }),
        this.prisma.mediaAsset.count({
          where: { project: { userId } },
        }),
      ]);

      return {
        totalProjects,
        draftProjects,
        completedProjects,
        publicProjects,
        totalAssets,
      };
    } catch (error) {
      logger.error('Failed to get project stats', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error('Failed to get project stats');
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();