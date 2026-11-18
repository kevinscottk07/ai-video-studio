/**
 * Community Feed Component Tests
 * 
 * Unit tests for the CommunityFeed component including rendering, interactions, and real-time updates.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { CommunityFeed } from '../CommunityFeed';
import { communityApi } from '../../../services/api/communityApi';

// Mock dependencies
vi.mock('../../../services/api/communityApi', () => ({
  communityApi: {
    getFeed: vi.fn(),
    getTrendingTags: vi.fn(),
  },
}));

vi.mock('../../../hooks/useRealTime', () => ({
  useCommunityFeed: () => ({
    updates: [],
    sendInteraction: vi.fn(),
    isSubscribed: true,
  }),
}));

vi.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: vi.fn(),
    inView: false,
  }),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <Auth0Provider
      domain="test-domain"
      clientId="test-client-id"
      authorizationParams={{
        redirect_uri: window.location.origin,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Auth0Provider>
  );
};

describe('CommunityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (communityApi.getFeed as any).mockResolvedValue({
      posts: [
        {
          id: 'post1',
          title: 'Amazing AI Video',
          description: 'This is a test video created with AI',
          videoUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          tags: ['ai', 'video', 'creative'],
          createdAt: '2023-12-01T10:00:00Z',
          user: {
            id: 'user1',
            displayName: 'Test Creator',
            profileImage: 'https://example.com/avatar.jpg',
          },
          project: {
            id: 'project1',
            title: 'Test Project',
          },
          metrics: {
            likes: 15,
            comments: 8,
            shares: 3,
            views: 120,
          },
          isLikedByUser: false,
        },
      ],
      total: 1,
      hasMore: false,
    });

    (communityApi.getTrendingTags as any).mockResolvedValue([
      'ai', 'video', 'creative', 'machine-learning', 'animation'
    ]);
  });

  it('renders community feed header', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    expect(screen.getByText('Community Feed')).toBeInTheDocument();
    expect(screen.getByText('Discover amazing AI-generated videos from our creative community')).toBeInTheDocument();
  });

  it('renders search input', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search posts, creators, or tags...');
    expect(searchInput).toBeInTheDocument();
  });

  it('renders sort options', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    // The select component should be present
    expect(screen.getByText('Sort by')).toBeInTheDocument();
  });

  it('renders filters button', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    const filtersButton = screen.getByText('Filters');
    expect(filtersButton).toBeInTheDocument();
  });

  it('handles search input changes', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search posts, creators, or tags...');
    
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    expect(searchInput).toHaveValue('test search');
  });

  it('displays posts when loaded', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Amazing AI Video')).toBeInTheDocument();
    });

    expect(screen.getByText('This is a test video created with AI')).toBeInTheDocument();
    expect(screen.getByText('Test Creator')).toBeInTheDocument();
  });

  it('displays trending tags sidebar', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Trending Tags')).toBeInTheDocument();
    });
  });

  it('displays community stats sidebar', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    expect(screen.getByText('Community Stats')).toBeInTheDocument();
    expect(screen.getByText('Total Posts')).toBeInTheDocument();
    expect(screen.getByText('Active Creators')).toBeInTheDocument();
    expect(screen.getByText('Videos Generated')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading', async () => {
    // Mock loading state
    (communityApi.getFeed as any).mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    // Should show skeleton loading states
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no posts', async () => {
    (communityApi.getFeed as any).mockResolvedValue({
      posts: [],
      total: 0,
      hasMore: false,
    });

    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No posts found')).toBeInTheDocument();
    });

    expect(screen.getByText('Be the first to share your creation with the community!')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    (communityApi.getFeed as any).mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load community feed')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('clears filters when clear all is clicked', async () => {
    render(
      <TestWrapper>
        <CommunityFeed />
      </TestWrapper>
    );

    // First add some filters
    const searchInput = screen.getByPlaceholderText('Search posts, creators, or tags...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    // Click clear all
    fireEvent.click(screen.getByText('Clear all'));

    expect(searchInput).toHaveValue('');
  });
});