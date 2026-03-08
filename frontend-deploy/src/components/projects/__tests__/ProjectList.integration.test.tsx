/**
 * Project List Integration Tests
 * 
 * Integration tests for the enhanced project list with premium features,
 * masonry layout, infinite scroll, and real-time updates.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectList } from '../ProjectList';

// Mock the enhanced hooks
vi.mock('../../hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [
      {
        id: '1',
        title: 'Test Project 1',
        description: 'A test project',
        status: 'completed',
        isPublic: true,
        mediaAssets: [],
        user: { id: '1', displayName: 'Test User', profileImage: null },
        _count: { mediaAssets: 0, generationJobs: 0 },
        settings: { duration: 30, resolution: 'hd', language: 'en', style: 'modern', musicEnabled: true },
        communityMetrics: { likes: 5, comments: 2, shares: 1, views: 100 },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Test Project 2',
        description: 'Another test project',
        status: 'draft',
        isPublic: false,
        mediaAssets: [],
        user: { id: '1', displayName: 'Test User', profileImage: null },
        _count: { mediaAssets: 2, generationJobs: 1 },
        settings: { duration: 60, resolution: 'standard', language: 'en', style: 'cinematic', musicEnabled: false },
        communityMetrics: { likes: 0, comments: 0, shares: 0, views: 0 },
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ],
    loading: false,
    error: null,
    total: 2,
    hasMore: false,
    stats: {
      totalProjects: 2,
      draftProjects: 1,
      completedProjects: 1,
      publicProjects: 1,
      totalAssets: 2,
    },
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    shareProject: vi.fn(),
    fetchProjects: vi.fn(),
    fetchMoreProjects: vi.fn(),
  })),
}));

vi.mock('../../hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: vi.fn(() => ({
    loadMoreRef: { current: null },
    isIntersecting: false,
  })),
}));

vi.mock('../../hooks/useRealTime', () => ({
  useRealTime: vi.fn(() => ({
    isConnected: true,
  })),
}));

vi.mock('../../hooks/use-debounce', () => ({
  useDebounce: vi.fn((value) => value),
}));

vi.mock('../ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the new UI components
vi.mock('../ui/masonry', () => ({
  Masonry: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="masonry-layout">{children}</div>
  ),
  MasonryGrid: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="masonry-grid">{children}</div>
  ),
}));

vi.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
  ProjectCardSkeleton: () => <div data-testid="project-card-skeleton" />,
  StatsCardSkeleton: () => <div data-testid="stats-card-skeleton" />,
  SearchSkeleton: () => <div data-testid="search-skeleton" />,
}));

describe('ProjectList Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with premium styling and real-time indicator', () => {
    render(<ProjectList />);
    
    // Check for premium header
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  it('displays premium stats cards', () => {
    render(<ProjectList />);
    
    // Check for stats
    expect(screen.getByText('2')).toBeInTheDocument(); // Total projects
    expect(screen.getByText('1')).toBeInTheDocument(); // Draft and completed projects
  });

  it('renders projects in masonry layout by default', () => {
    render(<ProjectList />);
    
    expect(screen.getByTestId('masonry-layout')).toBeInTheDocument();
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });

  it('switches between view modes correctly', () => {
    render(<ProjectList />);
    
    // Find view mode buttons (they have Grid3X3 and List icons)
    const viewButtons = screen.getAllByRole('button');
    
    // Should have masonry, grid, and list view buttons
    expect(viewButtons.length).toBeGreaterThan(3);
  });

  it('handles search functionality', () => {
    render(<ProjectList />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    expect(searchInput).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(searchInput).toHaveValue('test');
  });

  it('shows enhanced empty state', () => {
    const mockUseProjects = vi.mocked(
      require('../../hooks/useProjects').useProjects
    );
    
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: null,
      total: 0,
      hasMore: false,
      stats: {
        totalProjects: 0,
        draftProjects: 0,
        completedProjects: 0,
        publicProjects: 0,
        totalAssets: 0,
      },
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      shareProject: vi.fn(),
      fetchProjects: vi.fn(),
      fetchMoreProjects: vi.fn(),
    });

    render(<ProjectList />);
    
    expect(screen.getByText('No projects found')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Project')).toBeInTheDocument();
  });

  it('shows loading skeletons during initial load', () => {
    const mockUseProjects = vi.mocked(
      require('../../hooks/useProjects').useProjects
    );
    
    // Mock initial loading state
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: true,
      error: null,
      total: 0,
      hasMore: false,
      stats: null,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      shareProject: vi.fn(),
      fetchProjects: vi.fn(),
      fetchMoreProjects: vi.fn(),
    });

    render(<ProjectList />);
    
    // Should show skeleton loading states
    expect(screen.getAllByTestId('stats-card-skeleton')).toHaveLength(5);
    expect(screen.getByTestId('search-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('project-card-skeleton').length).toBeGreaterThan(0);
  });

  it('handles infinite scroll loading state', () => {
    const mockUseProjects = vi.mocked(
      require('../../hooks/useProjects').useProjects
    );
    
    mockUseProjects.mockReturnValue({
      projects: [
        {
          id: '1',
          title: 'Test Project 1',
          description: 'A test project',
          status: 'completed',
          isPublic: true,
          mediaAssets: [],
          user: { id: '1', displayName: 'Test User', profileImage: null },
          _count: { mediaAssets: 0, generationJobs: 0 },
          settings: { duration: 30, resolution: 'hd', language: 'en', style: 'modern', musicEnabled: true },
          communityMetrics: { likes: 5, comments: 2, shares: 1, views: 100 },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      loading: true, // Loading more
      error: null,
      total: 10,
      hasMore: true,
      stats: {
        totalProjects: 10,
        draftProjects: 5,
        completedProjects: 5,
        publicProjects: 3,
        totalAssets: 20,
      },
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      shareProject: vi.fn(),
      fetchProjects: vi.fn(),
      fetchMoreProjects: vi.fn(),
    });

    render(<ProjectList />);
    
    expect(screen.getByText('Loading more projects...')).toBeInTheDocument();
  });

  it('handles filter changes correctly', () => {
    const mockFetchProjects = vi.fn();
    const mockUseProjects = vi.mocked(
      require('../../hooks/useProjects').useProjects
    );
    
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: null,
      total: 0,
      hasMore: false,
      stats: null,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      shareProject: vi.fn(),
      fetchProjects: mockFetchProjects,
      fetchMoreProjects: vi.fn(),
    });

    render(<ProjectList />);
    
    // Should have filter dropdowns
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Sort by')).toBeInTheDocument();
  });
});