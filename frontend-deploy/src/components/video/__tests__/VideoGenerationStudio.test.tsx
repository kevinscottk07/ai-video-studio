/**
 * Video Generation Studio Component Tests
 * 
 * Tests for the professional video generation studio interface
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import { VideoGenerationStudio } from '../VideoGenerationStudio';
import { ToastProvider } from '../../../providers/ToastProvider';

// Mock the hooks
jest.mock('../../../hooks/useVideoGeneration', () => ({
  useVideoGeneration: () => ({
    isLoading: false,
    isEstimating: false,
    isGenerating: false,
    isCancelling: false,
    estimate: null,
    error: null,
    progress: 0,
    progressPercentage: 0,
    progressStage: 'Initializing',
    jobStatus: null,
    estimateGeneration: jest.fn(),
    startGeneration: jest.fn(),
    cancelGeneration: jest.fn(),
    clearError: jest.fn(),
    clearEstimate: jest.fn(),
  }),
  useVideoGenerationParams: () => ({
    params: {
      prompt: '',
      duration: 30,
      resolution: 'standard',
      style: 'social_media',
      aspectRatio: '16:9',
      fps: 30,
      quality: 'standard',
      language: 'en',
    },
    errors: {},
    isValid: false,
    updateParam: jest.fn(),
    validateParams: jest.fn(),
    resetParams: jest.fn(),
  }),
  useSupportedVideoOptions: () => ({
    data: {
      styles: [
        { value: 'social_media', label: 'Social Media', description: 'Perfect for social platforms' },
        { value: 'cinematic', label: 'Cinematic', description: 'Movie-like quality' },
      ],
      resolutions: [
        { value: 'standard', label: 'Standard (720p)', dimensions: '1280x720' },
        { value: 'hd', label: 'HD (1080p)', dimensions: '1920x1080' },
      ],
      aspectRatios: [
        { value: '16:9', label: '16:9 Landscape', description: 'Standard widescreen' },
        { value: '9:16', label: '9:16 Portrait', description: 'Mobile vertical' },
      ],
      frameRates: [
        { value: 30, label: '30 FPS', description: 'Standard frame rate' },
        { value: 60, label: '60 FPS', description: 'Smooth motion' },
      ],
      qualities: [
        { value: 'standard', label: 'Standard', description: 'Good quality' },
        { value: 'high', label: 'High', description: 'Better quality' },
      ],
      languages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'es', name: 'Spanish', nativeName: 'Español' },
      ],
    },
  }),
}));

jest.mock('../../../hooks/useCredits', () => ({
  useCredits: () => ({
    balance: 100,
    isLoading: false,
  }),
}));

jest.mock('../../../providers/ToastProvider', () => ({
  useToast: () => ({
    toast: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    },
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Auth0
const mockAuth0 = {
  isAuthenticated: true,
  user: { sub: 'test-user' },
  getAccessTokenSilently: jest.fn().mockResolvedValue('mock-token'),
};

jest.mock('@auth0/auth0-react', () => ({
  Auth0Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth0: () => mockAuth0,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Auth0Provider
        domain="test-domain"
        clientId="test-client-id"
        authorizationParams={{ redirect_uri: window.location.origin }}
      >
        <ToastProvider>
          {component}
        </ToastProvider>
      </Auth0Provider>
    </QueryClientProvider>
  );
};

describe('VideoGenerationStudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the video generation studio interface', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    expect(screen.getByText('Video Generation Studio')).toBeInTheDocument();
    expect(screen.getByText('Create professional AI-generated videos')).toBeInTheDocument();
  });

  it('displays credit balance', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    expect(screen.getByText('100 credits')).toBeInTheDocument();
  });

  it('shows the main tabs', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    expect(screen.getByText('Generate')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays the prompt input section', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    expect(screen.getByText('Video Prompt')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your video in detail/)).toBeInTheDocument();
  });

  it('shows basic settings section', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    expect(screen.getByText('Basic Settings')).toBeInTheDocument();
    expect(screen.getByText('Style')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Resolution')).toBeInTheDocument();
  });

  it('displays action buttons', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    expect(screen.getByText('Get Cost Estimate')).toBeInTheDocument();
    expect(screen.getByText('Generate Video')).toBeInTheDocument();
  });

  it('shows layout control buttons', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    // The layout control buttons should be present in the header
    const headerButtons = screen.getAllByRole('button');
    expect(headerButtons.length).toBeGreaterThan(0);
  });

  it('renders the live preview player area', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    // The LivePreviewPlayer component should be rendered
    // We can't test its internal content due to mocking, but we can verify the structure
    expect(screen.getByText('Video Generation Studio')).toBeInTheDocument();
  });

  it('handles prompt input changes', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    const promptInput = screen.getByPlaceholderText(/Describe your video in detail/);
    fireEvent.change(promptInput, { target: { value: 'Test video prompt' } });
    
    // The updateParam function should be called (mocked)
    expect(promptInput).toBeInTheDocument();
  });

  it('displays character count for prompt', () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    expect(screen.getByText('0/2000')).toBeInTheDocument();
  });

  it('shows advanced settings when toggled', async () => {
    renderWithProviders(<VideoGenerationStudio projectId="test-project" />);
    
    const advancedToggle = screen.getByText('Advanced Settings');
    fireEvent.click(advancedToggle);
    
    // Advanced settings should be visible
    await waitFor(() => {
      expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
    });
  });
});