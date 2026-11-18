import { apiClient } from './client';

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  settings: {
    resolution: 'standard' | 'hd' | 'ultra';
    duration: number;
    language: string;
    style: string;
    musicEnabled: boolean;
  };
  status: 'draft' | 'generating' | 'completed' | 'failed';
  isPublic: boolean;
  communityMetrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  createdAt: string;
  updatedAt: string;
  mediaAssets: MediaAsset[];
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

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  url: string;
  thumbnailUrl?: string;
  metadata: any;
  createdAt: string;
}

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
  status?: 'draft' | 'generating' | 'completed' | 'failed';
  isPublic?: boolean;
}

export interface ProjectFilters {
  status?: 'draft' | 'generating' | 'completed' | 'failed';
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
  collaborators?: string[];
}

export interface ProjectStats {
  totalProjects: number;
  draftProjects: number;
  completedProjects: number;
  publicProjects: number;
  totalAssets: number;
}

export interface ProjectsResponse {
  projects: Project[];
  total: number;
  hasMore: boolean;
}

export const projectApi = {
  // Create a new project
  async createProject(data: CreateProjectRequest): Promise<Project> {
    const response = await apiClient.post('/projects', data);
    return response.data.project;
  },

  // Get user's projects with filtering and pagination
  async getUserProjects(filters: ProjectFilters = {}): Promise<ProjectsResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await apiClient.get(`/projects?${params.toString()}`);
    return response.data;
  },

  // Search public projects
  async searchProjects(query: string, filters: Omit<ProjectFilters, 'search'> = {}): Promise<ProjectsResponse> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters.status) params.append('status', filters.status);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const response = await apiClient.get(`/projects/search?${params.toString()}`);
    return response.data;
  },

  // Get project statistics
  async getProjectStats(): Promise<ProjectStats> {
    const response = await apiClient.get('/projects/stats');
    return response.data.stats;
  },

  // Get a specific project
  async getProject(projectId: string): Promise<Project> {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data.project;
  },

  // Update a project
  async updateProject(projectId: string, updates: UpdateProjectRequest): Promise<Project> {
    const response = await apiClient.put(`/projects/${projectId}`, updates);
    return response.data.project;
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}`);
  },

  // Update project sharing settings
  async shareProject(projectId: string, shareSettings: ShareSettings): Promise<Project> {
    const response = await apiClient.post(`/projects/${projectId}/share`, shareSettings);
    return response.data.project;
  },
};