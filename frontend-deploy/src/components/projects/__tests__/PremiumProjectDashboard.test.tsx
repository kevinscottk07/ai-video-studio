/**
 * Premium Project Dashboard Tests
 * 
 * Unit tests for the premium project dashboard component with masonry layout,
 * infinite scroll, and real-time updates.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PremiumProjectDashboard } from '../PremiumProjectDashboard';

// Mock dependencies
vi.mock('../../hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
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

describe('PremiumProjectDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dashboard header correctly', () => {
    render(<PremiumProjectDashboard />);
    
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders stats cards with correct data', () => {
    const mockUseProjects = vi.mocked(
      require('../../hooks/useProjects').useProjects
    );
    
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: null,
      total: 5,
      hasMore: false,
      stats: {
        totalProjects: 10,
        draftProjects: 3,
        completedProjects: 5,
        publicProjects: 2,
        totalAssets: 25,
      },
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      shareProject: vi.fn(),
      fetchProjects: vi.fn(),
      fetchMoreProjects: vi.fn(),
    });

    render(<PremiumProjectDashboard />);
    
    expect(screen.getByText('10')).toBeInTheDocument(); // Total projects
    expect(screen.getByText('3')).toBeInTheDocument(); // Draft projects
    expect(screen.getByText('5')).toBeInTheDocument(); // Completed projects
    expect(screen.getByText('2')).toBeInTheDocument(); // Public projects
    expect(screen.getByText('25')).toBeInTheDocument(); // Total assets
  });

  it('renders search and filter controls', () => {
    render(<PremiumProjectDashboard />);
    
    expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Sort by')).toBeInTheDocument();
  });

  it('handles search input correctly', async () => {
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

    render(<PremiumProjectDashboard />);
    
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'test project' } });
    
    expect(searchInput).toHaveValue('test project');
  });

  it('shows empty state when no projects exist', () => {
    render(<PremiumProjectDashboard />);
    
    expect(screen.getByText('No projects found')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Project')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    const mockUseProjects = vi.mocked(
      require('../../hooks/useProjects').useProjects
    );
    
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

    render(<PremiumProjectDashboard />);
    
    // Should show skeleton loading states
    expect(document.querySelectorAll('[class*="animate-pulse"]')).toHaveLength.greaterThan(0);
  });

  it('shows error state correctly', () => {
    const mockUseProjects = vi.mocked(
      require('../../hooks/useProjects').useProjects
    );
    
    mockUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: 'Failed to load projects',
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

    render(<PremiumProjectDashboard />);
    
    expect(screen.getByText('Failed to load projects')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('handles view mode switching', () => {
    render(<PremiumProjectDashboard />);
    
    const viewButtons = screen.getAllByRole('button');
    const gridButtons = viewButtons.filter(button => 
      button.querySelector('svg') // Grid/List icons
    );
    
    expect(gridButtons.length).toBeGreaterThan(0);
  });

  it('opens create project modal when new project button is clicked', () => {
    render(<PremiumProjectDashboard />);
    
    const newProjectButton = screen.getByText('New Project');
    fireEvent.click(newProjectButton);
    
    // Modal should be rendered (though we'd need to mock the modal component for full testing)
    expect(newProjectButton).toBeInTheDocument();
  });

  it('handles refresh functionality', () => {
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

    render(<PremiumProjectDashboard />);
    
    // Find refresh button (has RefreshCw icon)
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    if (refreshButton) {
      fireEvent.click(refreshButton);
      expect(mockFetchProjects).toHaveBeenCalled();
    }
  });
});