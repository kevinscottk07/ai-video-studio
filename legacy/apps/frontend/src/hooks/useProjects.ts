import { useState, useEffect, useCallback } from 'react';
import { projectApi, Project, ProjectFilters, ProjectStats, CreateProjectRequest, UpdateProjectRequest, ShareSettings } from '../services/api/projectApi';
import { useRealTime } from './useRealTime';
import { toast } from '../components/ui/toast';

export interface UseProjectsOptions {
  autoFetch?: boolean;
  filters?: ProjectFilters;
}

export interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  stats: ProjectStats | null;
  
  // Actions
  createProject: (data: CreateProjectRequest) => Promise<Project | null>;
  updateProject: (projectId: string, updates: UpdateProjectRequest) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;
  shareProject: (projectId: string, settings: ShareSettings) => Promise<Project | null>;
  fetchProjects: (filters?: ProjectFilters) => Promise<void>;
  fetchMoreProjects: () => Promise<void>;
  fetchStats: () => Promise<void>;
  refreshProject: (projectId: string) => Promise<void>;
  
  // Optimistic updates
  optimisticUpdate: (projectId: string, updates: Partial<Project>) => void;
  optimisticAdd: (project: Project) => void;
  optimisticRemove: (projectId: string) => void;
}

export const useProjects = (options: UseProjectsOptions = {}): UseProjectsReturn => {
  const { autoFetch = true, filters: initialFilters = {} } = options;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [currentFilters, setCurrentFilters] = useState<ProjectFilters>(initialFilters);

  // Real-time updates
  const { subscribe, unsubscribe } = useRealTime();

  // Handle real-time project updates
  useEffect(() => {
    const handleProjectUpdate = (data: any) => {
      const { projectId, type, data: updateData } = data;
      
      switch (type) {
        case 'status':
          if (updateData.action === 'created') {
            // Refresh projects list to include new project
            fetchProjects(currentFilters);
          } else if (updateData.action === 'deleted') {
            optimisticRemove(projectId);
          }
          break;
          
        case 'settings':
          if (updateData.action === 'updated') {
            // Refresh the specific project
            refreshProject(projectId);
          }
          break;
          
        case 'collaboration':
          if (updateData.action === 'shared') {
            optimisticUpdate(projectId, { isPublic: updateData.isPublic });
          }
          break;
      }
    };

    subscribe('project:updated', handleProjectUpdate);

    return () => {
      unsubscribe('project:updated', handleProjectUpdate);
    };
  }, [subscribe, unsubscribe, currentFilters]);

  // Fetch projects
  const fetchProjects = useCallback(async (filters: ProjectFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectApi.getUserProjects({
        ...currentFilters,
        ...filters,
        offset: 0, // Reset offset for new fetch
      });
      
      setProjects(response.projects);
      setTotal(response.total);
      setHasMore(response.hasMore);
      setCurrentFilters({ ...currentFilters, ...filters });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentFilters]);

  // Fetch more projects (pagination)
  const fetchMoreProjects = useCallback(async () => {
    if (!hasMore || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await projectApi.getUserProjects({
        ...currentFilters,
        offset: projects.length,
      });
      
      setProjects(prev => [...prev, ...response.projects]);
      setHasMore(response.hasMore);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch more projects';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, projects.length, currentFilters]);

  // Fetch project statistics
  const fetchStats = useCallback(async () => {
    try {
      const projectStats = await projectApi.getProjectStats();
      setStats(projectStats);
    } catch (err) {
      console.error('Failed to fetch project stats:', err);
    }
  }, []);

  // Create project
  const createProject = useCallback(async (data: CreateProjectRequest): Promise<Project | null> => {
    try {
      const project = await projectApi.createProject(data);
      
      // Optimistically add to list
      optimisticAdd(project);
      
      // Refresh stats
      fetchStats();
      
      toast({
        title: 'Success',
        description: `Project "${project.title}" created successfully`,
      });
      
      return project;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  // Update project
  const updateProject = useCallback(async (projectId: string, updates: UpdateProjectRequest): Promise<Project | null> => {
    // Optimistic update
    optimisticUpdate(projectId, updates);
    
    try {
      const project = await projectApi.updateProject(projectId, updates);
      
      // Update with server response
      optimisticUpdate(projectId, project);
      
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
      
      return project;
    } catch (err) {
      // Revert optimistic update by refreshing
      refreshProject(projectId);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  // Delete project
  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    // Optimistic removal
    const projectToDelete = projects.find(p => p.id === projectId);
    optimisticRemove(projectId);
    
    try {
      await projectApi.deleteProject(projectId);
      
      // Refresh stats
      fetchStats();
      
      toast({
        title: 'Success',
        description: `Project "${projectToDelete?.title}" deleted successfully`,
      });
      
      return true;
    } catch (err) {
      // Revert optimistic removal
      if (projectToDelete) {
        optimisticAdd(projectToDelete);
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  }, [projects]);

  // Share project
  const shareProject = useCallback(async (projectId: string, settings: ShareSettings): Promise<Project | null> => {
    // Optimistic update
    optimisticUpdate(projectId, { isPublic: settings.isPublic });
    
    try {
      const project = await projectApi.shareProject(projectId, settings);
      
      // Update with server response
      optimisticUpdate(projectId, project);
      
      toast({
        title: 'Success',
        description: settings.isPublic ? 'Project shared publicly' : 'Project made private',
      });
      
      return project;
    } catch (err) {
      // Revert optimistic update
      refreshProject(projectId);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update sharing settings';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  // Refresh a specific project
  const refreshProject = useCallback(async (projectId: string) => {
    try {
      const project = await projectApi.getProject(projectId);
      optimisticUpdate(projectId, project);
    } catch (err) {
      console.error('Failed to refresh project:', err);
    }
  }, []);

  // Optimistic update helpers
  const optimisticUpdate = useCallback((projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    ));
  }, []);

  const optimisticAdd = useCallback((project: Project) => {
    setProjects(prev => [project, ...prev]);
    setTotal(prev => prev + 1);
  }, []);

  const optimisticRemove = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    setTotal(prev => Math.max(0, prev - 1));
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchProjects();
      fetchStats();
    }
  }, [autoFetch]);

  return {
    projects,
    loading,
    error,
    total,
    hasMore,
    stats,
    
    // Actions
    createProject,
    updateProject,
    deleteProject,
    shareProject,
    fetchProjects,
    fetchMoreProjects,
    fetchStats,
    refreshProject,
    
    // Optimistic updates
    optimisticUpdate,
    optimisticAdd,
    optimisticRemove,
  };
};