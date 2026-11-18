import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjects } from '../useProjects';
import { projectApi } from '../../services/api/projectApi';
import { useRealTime } from '../useRealTime';

// Mock dependencies
vi.mock('../../services/api/projectApi', () => ({
  projectApi: {
    createProject: vi.fn(),
    getUserProjects: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    shareProject: vi.fn(),
    getProject: vi.fn(),
    getProjectStats: vi.fn(),
  },
}));

vi.mock('../useRealTime', () => ({
  useRealTime: vi.fn(() => ({
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

vi.mock('../../components/ui/toast', () => ({
  toast: vi.fn(),
}));

const mockProjectApi = vi.mocked(projectApi);
const mockUseRealTime = vi.mocked(useRealTime);

describe('useProjects', () => {
  const mockProject = {
    id: 'project-1',
    userId: 'user-1',
    title: 'Test Project',
    description: 'Test Description',
    settings: {
      resolution: 'hd' as const,
      duration: 30,
      language: 'en',
      style: 'cinematic',
      musicEnabled: true,
    },
    status: 'draft' as const,
    isPublic: false,
    communityMetrics: {
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
    },
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    mediaAssets: [],
    user: {
      id: 'user-1',
      displayName: 'Test User',
      profileImage: null,
    },
    _count: {
      mediaAssets: 0,
      generationJobs: 0,
    },
  };

  const mockStats = {
    totalProjects: 5,
    draftProjects: 2,
    completedProjects: 3,
    publicProjects: 1,
    totalAssets: 10,
  };

  let mockSubscribe: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSubscribe = vi.fn();
    mockUnsubscribe = vi.fn();
    
    mockUseRealTime.mockReturnValue({
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      mockProjectApi.getUserProjects.mockResolvedValue({
        projects: [],
        total: 0,
        hasMore: false,
      });
      mockProjectApi.getProjectStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      expect(result.current.projects).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.total).toBe(0);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.stats).toBe(null);
    });

    it('should auto-fetch projects and stats when autoFetch is true', async () => {
      mockProjectApi.getUserProjects.mockResolvedValue({
        projects: [mockProject],
        total: 1,
        hasMore: false,
      });
      mockProjectApi.getProjectStats.mockResolvedValue(mockStats);

      renderHook(() => useProjects({ autoFetch: true }));

      renderHook(() => useProjects({ autoFetch: true }));

      await waitFor(() => {
        expect(mockProjectApi.getUserProjects).toHaveBeenCalledWith({
          sortBy: 'updatedAt',
          sortOrder: 'desc',
          limit: 20,
          offset: 0,
        });
        expect(mockProjectApi.getProjectStats).toHaveBeenCalled();
      });
    });
  });

  describe('real-time updates', () => {
    it('should subscribe to project updates', () => {
      renderHook(() => useProjects());

      expect(mockSubscribe).toHaveBeenCalledWith(
        'project:updated',
        expect.any(Function)
      );
    });

    it('should handle project creation updates', async () => {
      mockProjectApi.getUserProjects.mockResolvedValue({
        projects: [mockProject],
        total: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Simulate real-time project creation
      const updateHandler = mockSubscribe.mock.calls[0][1];
      act(() => {
        updateHandler({
          projectId: 'project-1',
          type: 'status',
          data: { action: 'created' },
        });
      });

      await waitFor(() => {
        expect(mockProjectApi.getUserProjects).toHaveBeenCalled();
      });
    });

    it('should handle project deletion updates', () => {
      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Add a project first
      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      expect(result.current.projects).toHaveLength(1);

      // Simulate real-time project deletion
      const updateHandler = mockSubscribe.mock.calls[0][1];
      act(() => {
        updateHandler({
          projectId: 'project-1',
          type: 'status',
          data: { action: 'deleted' },
        });
      });

      expect(result.current.projects).toHaveLength(0);
    });
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      mockProjectApi.createProject.mockResolvedValue(mockProject);
      mockProjectApi.getProjectStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      const projectData = {
        title: 'Test Project',
        description: 'Test Description',
      };

      let createdProject: any;
      await act(async () => {
        createdProject = await result.current.createProject(projectData);
      });

      expect(mockProjectApi.createProject).toHaveBeenCalledWith(projectData);
      expect(mockProjectApi.getProjectStats).toHaveBeenCalled();
      expect(createdProject).toEqual(mockProject);
      expect(result.current.projects).toContain(mockProject);
    });

    it('should handle creation errors', async () => {
      mockProjectApi.createProject.mockRejectedValue(new Error('Creation failed'));

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      const projectData = {
        title: 'Test Project',
      };

      let createdProject: any;
      await act(async () => {
        createdProject = await result.current.createProject(projectData);
      });

      expect(createdProject).toBe(null);
      expect(result.current.projects).toHaveLength(0);
    });
  });

  describe('updateProject', () => {
    it('should update a project successfully', async () => {
      const updatedProject = { ...mockProject, title: 'Updated Title' };
      mockProjectApi.updateProject.mockResolvedValue(updatedProject);

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Add project first
      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      const updates = { title: 'Updated Title' };

      let updatedResult: any;
      await act(async () => {
        updatedResult = await result.current.updateProject('project-1', updates);
      });

      expect(mockProjectApi.updateProject).toHaveBeenCalledWith('project-1', updates);
      expect(updatedResult).toEqual(updatedProject);
      expect(result.current.projects[0].title).toBe('Updated Title');
    });

    it('should handle update errors with optimistic rollback', async () => {
      mockProjectApi.updateProject.mockRejectedValue(new Error('Update failed'));
      mockProjectApi.getProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Add project first
      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      const updates = { title: 'Updated Title' };

      let updatedResult: any;
      await act(async () => {
        updatedResult = await result.current.updateProject('project-1', updates);
      });

      expect(updatedResult).toBe(null);
      // Should refresh the project to revert optimistic update
      expect(mockProjectApi.getProject).toHaveBeenCalledWith('project-1');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project successfully', async () => {
      mockProjectApi.deleteProject.mockResolvedValue(undefined);
      mockProjectApi.getProjectStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Add project first
      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      expect(result.current.projects).toHaveLength(1);

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteProject('project-1');
      });

      expect(mockProjectApi.deleteProject).toHaveBeenCalledWith('project-1');
      expect(mockProjectApi.getProjectStats).toHaveBeenCalled();
      expect(deleteResult).toBe(true);
      expect(result.current.projects).toHaveLength(0);
    });

    it('should handle deletion errors with optimistic rollback', async () => {
      mockProjectApi.deleteProject.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Add project first
      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      expect(result.current.projects).toHaveLength(1);

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteProject('project-1');
      });

      expect(deleteResult).toBe(false);
      // Should restore the project after failed deletion
      expect(result.current.projects).toHaveLength(1);
    });
  });

  describe('shareProject', () => {
    it('should update project sharing successfully', async () => {
      const sharedProject = { ...mockProject, isPublic: true };
      mockProjectApi.shareProject.mockResolvedValue(sharedProject);

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Add project first
      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      const shareSettings = { isPublic: true };

      let shareResult: any;
      await act(async () => {
        shareResult = await result.current.shareProject('project-1', shareSettings);
      });

      expect(mockProjectApi.shareProject).toHaveBeenCalledWith('project-1', shareSettings);
      expect(shareResult).toEqual(sharedProject);
      expect(result.current.projects[0].isPublic).toBe(true);
    });
  });

  describe('fetchProjects', () => {
    it('should fetch projects with filters', async () => {
      mockProjectApi.getUserProjects.mockResolvedValue({
        projects: [mockProject],
        total: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      const filters = { status: 'draft' as const, limit: 10 };

      await act(async () => {
        await result.current.fetchProjects(filters);
      });

      expect(mockProjectApi.getUserProjects).toHaveBeenCalledWith({
        ...filters,
        offset: 0,
      });
      expect(result.current.projects).toEqual([mockProject]);
      expect(result.current.total).toBe(1);
      expect(result.current.hasMore).toBe(false);
    });

    it('should handle fetch errors', async () => {
      mockProjectApi.getUserProjects.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchProjects();
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.projects).toEqual([]);
    });
  });

  describe('fetchMoreProjects', () => {
    it('should fetch more projects for pagination', async () => {
      const secondProject = { ...mockProject, id: 'project-2', title: 'Project 2' };
      
      mockProjectApi.getUserProjects
        .mockResolvedValueOnce({
          projects: [mockProject],
          total: 2,
          hasMore: true,
        })
        .mockResolvedValueOnce({
          projects: [secondProject],
          total: 2,
          hasMore: false,
        });

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      // Initial fetch
      await act(async () => {
        await result.current.fetchProjects();
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.hasMore).toBe(true);

      // Fetch more
      await act(async () => {
        await result.current.fetchMoreProjects();
      });

      expect(result.current.projects).toHaveLength(2);
      expect(result.current.hasMore).toBe(false);
      expect(mockProjectApi.getUserProjects).toHaveBeenLastCalledWith({
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        limit: 20,
        offset: 1,
      });
    });

    it('should not fetch more if no more projects available', async () => {
      mockProjectApi.getUserProjects.mockResolvedValue({
        projects: [mockProject],
        total: 1,
        hasMore: false,
      });

      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchProjects();
      });

      const callCount = mockProjectApi.getUserProjects.mock.calls.length;

      await act(async () => {
        await result.current.fetchMoreProjects();
      });

      // Should not make additional API call
      expect(mockProjectApi.getUserProjects).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('optimistic updates', () => {
    it('should add project optimistically', () => {
      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      expect(result.current.projects).toContain(mockProject);
      expect(result.current.total).toBe(1);
    });

    it('should update project optimistically', () => {
      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      act(() => {
        result.current.optimisticUpdate('project-1', { title: 'Updated Title' });
      });

      expect(result.current.projects[0].title).toBe('Updated Title');
    });

    it('should remove project optimistically', () => {
      const { result } = renderHook(() => useProjects({ autoFetch: false }));

      act(() => {
        result.current.optimisticAdd(mockProject);
      });

      expect(result.current.projects).toHaveLength(1);

      act(() => {
        result.current.optimisticRemove('project-1');
      });

      expect(result.current.projects).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });
  });
});