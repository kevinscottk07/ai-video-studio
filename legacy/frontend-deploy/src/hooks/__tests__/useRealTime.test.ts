/**
 * Real-Time Hooks Tests
 * 
 * Unit tests for real-time React hooks functionality.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  useRealTime, 
  useNotifications, 
  useProjectCollaboration,
  useGenerationProgress,
  useCommunityFeed,
  useOptimisticUpdates 
} from '../useRealTime';
import { ConnectionState } from '../../services/realTimeClient';

// Mock Auth0
vi.mock('@auth0/auth0-react');
const mockUseAuth0 = vi.mocked(useAuth0);

// Mock RealTimeClient
const mockClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn(),
  getConnectionState: vi.fn(),
  subscribeToProject: vi.fn(),
  unsubscribeFromProject: vi.fn(),
  subscribeToGeneration: vi.fn(),
  unsubscribeFromGeneration: vi.fn(),
  subscribeToCommunity: vi.fn(),
  unsubscribeFromCommunity: vi.fn(),
  updateProject: vi.fn(),
  sendCommunityInteraction: vi.fn(),
  sendOptimisticUpdate: vi.fn(),
  getPendingUpdates: vi.fn(),
  clearOptimisticUpdates: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('../../services/realTimeClient', () => ({
  createRealTimeClient: vi.fn(() => mockClient),
  getRealTimeClient: vi.fn(() => mockClient),
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
  },
}));

describe('useRealTime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
    } as any);
    mockClient.getConnectionState.mockReturnValue(ConnectionState.DISCONNECTED);
    mockClient.isConnected.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize client when authenticated', async () => {
    const { result } = renderHook(() => useRealTime());

    await waitFor(() => {
      expect(result.current.client).toBeDefined();
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  it('should not initialize client when not authenticated', () => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      getAccessTokenSilently: vi.fn(),
    } as any);

    const { result } = renderHook(() => useRealTime());

    expect(result.current.client).toBeNull();
    expect(mockClient.connect).not.toHaveBeenCalled();
  });

  it('should update connection state', async () => {
    mockClient.getConnectionState.mockReturnValue(ConnectionState.CONNECTED);
    mockClient.isConnected.mockReturnValue(true);

    const { result } = renderHook(() => useRealTime());

    await waitFor(() => {
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should handle connection errors', async () => {
    const mockError = new Error('Connection failed');
    mockClient.getConnectionState.mockReturnValue(ConnectionState.ERROR);

    const { result } = renderHook(() => useRealTime());

    // Simulate error event
    act(() => {
      const errorHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'connection:error'
      )?.[1];
      if (errorHandler) {
        errorHandler(mockError);
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe(mockError);
    });
  });

  it('should clear error', async () => {
    const { result } = renderHook(() => useRealTime());

    // Set error first
    act(() => {
      const errorHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'connection:error'
      )?.[1];
      if (errorHandler) {
        errorHandler(new Error('Test error'));
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe('useNotifications', () => {
  beforeEach(() => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
    } as any);
  });

  it('should handle incoming notifications', async () => {
    const { result } = renderHook(() => useNotifications());

    const mockNotification = {
      id: 'test-1',
      type: 'success' as const,
      title: 'Test',
      message: 'Test notification',
      timestamp: new Date().toISOString(),
    };

    // Simulate notification event
    act(() => {
      const notificationHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1];
      if (notificationHandler) {
        notificationHandler(mockNotification);
      }
    });

    await waitFor(() => {
      expect(result.current.notifications).toContain(mockNotification);
      expect(result.current.hasUnread).toBe(true);
    });
  });

  it('should remove notifications', async () => {
    const { result } = renderHook(() => useNotifications());

    const mockNotification = {
      id: 'test-1',
      type: 'info' as const,
      title: 'Test',
      message: 'Test notification',
      timestamp: new Date().toISOString(),
    };

    // Add notification
    act(() => {
      const notificationHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1];
      if (notificationHandler) {
        notificationHandler(mockNotification);
      }
    });

    await waitFor(() => {
      expect(result.current.notifications).toContain(mockNotification);
    });

    // Remove notification
    act(() => {
      result.current.removeNotification('test-1');
    });

    expect(result.current.notifications).not.toContain(mockNotification);
  });

  it('should clear all notifications', async () => {
    const { result } = renderHook(() => useNotifications());

    // Add multiple notifications
    const notifications = [
      { id: 'test-1', type: 'info' as const, title: 'Test 1', message: 'Message 1', timestamp: new Date().toISOString() },
      { id: 'test-2', type: 'success' as const, title: 'Test 2', message: 'Message 2', timestamp: new Date().toISOString() },
    ];

    act(() => {
      const notificationHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1];
      if (notificationHandler) {
        notifications.forEach(notificationHandler);
      }
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    // Clear all
    act(() => {
      result.current.clearAllNotifications();
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.hasUnread).toBe(false);
  });
});

describe('useProjectCollaboration', () => {
  beforeEach(() => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
    } as any);
    mockClient.isConnected.mockReturnValue(true);
  });

  it('should subscribe to project when projectId is provided', () => {
    const projectId = 'project-123';
    renderHook(() => useProjectCollaboration(projectId));

    expect(mockClient.subscribeToProject).toHaveBeenCalledWith(projectId);
  });

  it('should unsubscribe when projectId changes', () => {
    const { rerender } = renderHook(
      ({ projectId }) => useProjectCollaboration(projectId),
      { initialProps: { projectId: 'project-123' } }
    );

    expect(mockClient.subscribeToProject).toHaveBeenCalledWith('project-123');

    rerender({ projectId: 'project-456' });

    expect(mockClient.unsubscribeFromProject).toHaveBeenCalledWith('project-123');
    expect(mockClient.subscribeToProject).toHaveBeenCalledWith('project-456');
  });

  it('should not subscribe when projectId is null', () => {
    renderHook(() => useProjectCollaboration(null));

    expect(mockClient.subscribeToProject).not.toHaveBeenCalled();
  });

  it('should handle project updates', async () => {
    const projectId = 'project-123';
    const { result } = renderHook(() => useProjectCollaboration(projectId));

    const mockUpdate = {
      projectId,
      type: 'settings',
      data: { title: 'New Title' },
      timestamp: new Date().toISOString(),
    };

    // Simulate project update event
    act(() => {
      const updateHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'project:updated'
      )?.[1];
      if (updateHandler) {
        updateHandler(mockUpdate);
      }
    });

    await waitFor(() => {
      expect(result.current.projectUpdates).toContain(mockUpdate);
    });
  });

  it('should send project updates', () => {
    const projectId = 'project-123';
    const { result } = renderHook(() => useProjectCollaboration(projectId));

    const updateData = { title: 'New Title' };
    const rollback = vi.fn();

    act(() => {
      result.current.sendProjectUpdate('settings', updateData, rollback);
    });

    expect(mockClient.updateProject).toHaveBeenCalledWith(
      projectId,
      'settings',
      updateData,
      rollback
    );
  });
});

describe('useGenerationProgress', () => {
  beforeEach(() => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
    } as any);
    mockClient.isConnected.mockReturnValue(true);
  });

  it('should subscribe to generation progress', () => {
    const jobId = 'job-123';
    renderHook(() => useGenerationProgress(jobId));

    expect(mockClient.subscribeToGeneration).toHaveBeenCalledWith(jobId);
  });

  it('should handle progress updates', async () => {
    const jobId = 'job-123';
    const { result } = renderHook(() => useGenerationProgress(jobId));

    const mockProgress = {
      jobId,
      percentage: 50,
      stage: 'Processing',
      message: 'Generating video...',
      timestamp: new Date().toISOString(),
    };

    // Simulate progress update event
    act(() => {
      const progressHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'progress:update'
      )?.[1];
      if (progressHandler) {
        progressHandler(mockProgress);
      }
    });

    await waitFor(() => {
      expect(result.current.progress).toBe(mockProgress);
      expect(result.current.percentage).toBe(50);
      expect(result.current.stage).toBe('Processing');
      expect(result.current.message).toBe('Generating video...');
      expect(result.current.isComplete).toBe(false);
    });
  });

  it('should mark as complete when percentage reaches 100', async () => {
    const jobId = 'job-123';
    const { result } = renderHook(() => useGenerationProgress(jobId));

    const mockProgress = {
      jobId,
      percentage: 100,
      stage: 'Complete',
      timestamp: new Date().toISOString(),
    };

    // Simulate progress update event
    act(() => {
      const progressHandler = mockClient.on.mock.calls.find(
        call => call[0] === 'progress:update'
      )?.[1];
      if (progressHandler) {
        progressHandler(mockProgress);
      }
    });

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });
  });
});

describe('useOptimisticUpdates', () => {
  beforeEach(() => {
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: vi.fn().mockResolvedValue('mock-token'),
    } as any);
  });

  it('should get pending updates from client', async () => {
    const mockUpdates = [
      { id: 'update-1', type: 'project:update', data: {}, timestamp: Date.now(), confirmed: false },
      { id: 'update-2', type: 'community:interaction', data: {}, timestamp: Date.now(), confirmed: false },
    ];

    mockClient.getPendingUpdates.mockReturnValue(mockUpdates);

    const { result } = renderHook(() => useOptimisticUpdates());

    await waitFor(() => {
      expect(result.current.pendingUpdates).toEqual(mockUpdates);
      expect(result.current.hasPendingUpdates).toBe(true);
    });
  });

  it('should send optimistic updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    const updateData = { test: 'data' };
    const rollback = vi.fn();

    act(() => {
      result.current.sendOptimisticUpdate('test:update', updateData, rollback);
    });

    expect(mockClient.sendOptimisticUpdate).toHaveBeenCalledWith(
      'test:update',
      updateData,
      rollback
    );
  });

  it('should clear pending updates', () => {
    const { result } = renderHook(() => useOptimisticUpdates());

    act(() => {
      result.current.clearPendingUpdates();
    });

    expect(mockClient.clearOptimisticUpdates).toHaveBeenCalled();
  });
});