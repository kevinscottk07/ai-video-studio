/**
 * Real-Time React Hooks
 * 
 * Comprehensive React hooks for real-time functionality in AI Video Studio.
 * Provides optimistic updates, server reconciliation, and subscription management.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  RealTimeClient, 
  ConnectionState, 
  NotificationData,
  ProgressData,
  ProjectUpdateData,
  CommunityUpdateData,
  UserStatusData,
  CreditUpdateData,
  SubscriptionUpdateData,
  OptimisticUpdate,
  createRealTimeClient,
  getRealTimeClient,
  RealTimeEvents
} from '../services/realTimeClient';

/**
 * Main real-time hook - provides connection management and basic functionality
 */
export const useRealTime = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<Error | null>(null);
  const clientRef = useRef<RealTimeClient | null>(null);

  // Initialize client
  useEffect(() => {
    if (!isAuthenticated) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      return;
    }

    const getToken = async () => {
      try {
        return await getAccessTokenSilently();
      } catch (error) {
        console.error('[useRealTime] Failed to get token:', error);
        throw error;
      }
    };

    clientRef.current = createRealTimeClient(getToken);

    // Set up connection state listener
    const handleConnectionState = (state: ConnectionState) => {
      setConnectionState(state);
    };

    const handleConnectionError = (error: Error) => {
      setError(error);
    };

    clientRef.current.on('connection:state', handleConnectionState);
    clientRef.current.on('connection:error', handleConnectionError);

    // Connect
    clientRef.current.connect();

    return () => {
      if (clientRef.current) {
        clientRef.current.off('connection:state', handleConnectionState);
        clientRef.current.off('connection:error', handleConnectionError);
      }
    };
  }, [isAuthenticated, getAccessTokenSilently]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  const client = clientRef.current;

  return {
    client,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    error,
    clearError: () => setError(null),
  };
};

/**
 * Hook for subscribing to real-time events with automatic cleanup
 */
export const useRealTimeEvent = <K extends keyof RealTimeEvents>(
  event: K,
  handler: (data: RealTimeEvents[K]) => void,
  deps: React.DependencyList = []
) => {
  const { client } = useRealTime();

  useEffect(() => {
    if (!client) return;

    const wrappedHandler = (data: RealTimeEvents[K]) => {
      handler(data);
    };

    client.on(event, wrappedHandler);

    return () => {
      client.off(event, wrappedHandler);
    };
  }, [client, event, ...deps]);
};

/**
 * Hook for managing notifications with real-time updates
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const { client } = useRealTime();

  useRealTimeEvent('notification', (notification) => {
    setNotifications(prev => [notification, ...prev]);
    
    // Auto-remove non-persistent notifications after 5 seconds
    if (!notification.persistent) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    }
  });

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    removeNotification,
    clearAllNotifications,
    hasUnread: notifications.length > 0,
  };
};

/**
 * Hook for project collaboration with optimistic updates
 */
export const useProjectCollaboration = (projectId: string | null) => {
  const [collaborators, setCollaborators] = useState<Array<{ userId: string; email: string }>>([]);
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdateData[]>([]);
  const { client } = useRealTime();

  // Subscribe to project when projectId changes
  useEffect(() => {
    if (!client || !projectId) return;

    client.subscribeToProject(projectId);

    return () => {
      client.unsubscribeFromProject(projectId);
    };
  }, [client, projectId]);

  // Listen for project events
  useRealTimeEvent('project:updated', (update) => {
    if (update.projectId === projectId) {
      setProjectUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
    }
  }, [projectId]);

  useRealTimeEvent('project:user_joined', (data) => {
    setCollaborators(prev => {
      const exists = prev.some(c => c.userId === data.userId);
      if (exists) return prev;
      return [...prev, { userId: data.userId, email: data.email }];
    });
  });

  useRealTimeEvent('project:user_left', (data) => {
    setCollaborators(prev => prev.filter(c => c.userId !== data.userId));
  });

  const sendProjectUpdate = useCallback((
    type: string,
    data: any,
    rollback?: () => void
  ) => {
    if (!client || !projectId) return null;
    return client.updateProject(projectId, type, data, rollback);
  }, [client, projectId]);

  return {
    collaborators,
    projectUpdates,
    sendProjectUpdate,
    isSubscribed: !!projectId && client?.isConnected(),
  };
};

/**
 * Hook for generation progress tracking
 */
export const useGenerationProgress = (jobId: string | null) => {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const { client } = useRealTime();

  // Subscribe to generation progress
  useEffect(() => {
    if (!client || !jobId) return;

    client.subscribeToGeneration(jobId);
    setIsComplete(false);

    return () => {
      client.unsubscribeFromGeneration(jobId);
    };
  }, [client, jobId]);

  useRealTimeEvent('progress:update', (progressData) => {
    if (progressData.jobId === jobId) {
      setProgress(progressData);
      
      if (progressData.percentage >= 100) {
        setIsComplete(true);
      }
    }
  }, [jobId]);

  return {
    progress,
    isComplete,
    percentage: progress?.percentage || 0,
    stage: progress?.stage || 'Initializing',
    message: progress?.message,
    isSubscribed: !!jobId && client?.isConnected(),
  };
};

/**
 * Hook for community feed with real-time updates
 */
export const useCommunityFeed = () => {
  const [updates, setUpdates] = useState<CommunityUpdateData[]>([]);
  const { client } = useRealTime();

  // Subscribe to community feed
  useEffect(() => {
    if (!client) return;

    client.subscribeToCommunity();

    return () => {
      client.unsubscribeFromCommunity();
    };
  }, [client]);

  useRealTimeEvent('community:updated', (update) => {
    setUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100 updates
  });

  const sendInteraction = useCallback((
    type: 'like' | 'comment' | 'share',
    contentId: string,
    data: any,
    rollback?: () => void
  ) => {
    if (!client) return null;
    return client.sendCommunityInteraction(type, contentId, data, rollback);
  }, [client]);

  return {
    updates,
    sendInteraction,
    isSubscribed: client?.isConnected(),
  };
};

/**
 * Hook for user status tracking
 */
export const useUserStatus = () => {
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatusData>>(new Map());

  useRealTimeEvent('user:status', (statusData) => {
    setUserStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(statusData.userId, statusData);
      return newMap;
    });
  });

  const getUserStatus = useCallback((userId: string) => {
    return userStatuses.get(userId);
  }, [userStatuses]);

  const isUserOnline = useCallback((userId: string) => {
    const status = userStatuses.get(userId);
    return status?.status === 'online';
  }, [userStatuses]);

  return {
    userStatuses: Array.from(userStatuses.values()),
    getUserStatus,
    isUserOnline,
  };
};

/**
 * Hook for credit balance with real-time updates
 */
export const useCreditBalance = () => {
  const [balance, setBalance] = useState<number>(0);
  const [lastTransaction, setLastTransaction] = useState<CreditUpdateData['transaction'] | null>(null);

  useRealTimeEvent('credits:updated', (data) => {
    setBalance(data.balance);
    if (data.transaction) {
      setLastTransaction(data.transaction);
    }
  });

  return {
    balance,
    lastTransaction,
  };
};

/**
 * Hook for subscription status with real-time updates
 */
export const useSubscriptionStatus = () => {
  const [subscription, setSubscription] = useState<SubscriptionUpdateData | null>(null);

  useRealTimeEvent('subscription:updated', (data) => {
    setSubscription(data);
  });

  return {
    subscription,
    isActive: subscription?.status === 'active',
    plan: subscription?.plan,
    creditsIncluded: subscription?.creditsIncluded || 0,
    creditsUsed: subscription?.creditsUsed || 0,
    creditsRemaining: (subscription?.creditsIncluded || 0) - (subscription?.creditsUsed || 0),
  };
};

/**
 * Hook for optimistic updates management
 */
export const useOptimisticUpdates = () => {
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([]);
  const { client } = useRealTime();

  // Update pending updates when client changes
  useEffect(() => {
    if (!client) return;

    const updatePending = () => {
      setPendingUpdates(client.getPendingUpdates());
    };

    // Update immediately
    updatePending();

    // Listen for optimistic update events
    const handleConfirmed = () => updatePending();
    const handleFailed = () => updatePending();

    client.on('optimistic:confirmed', handleConfirmed);
    client.on('optimistic:failed', handleFailed);

    return () => {
      client.off('optimistic:confirmed', handleConfirmed);
      client.off('optimistic:failed', handleFailed);
    };
  }, [client]);

  const sendOptimisticUpdate = useCallback(<T>(
    type: string,
    data: T,
    rollback?: () => void
  ) => {
    if (!client) return null;
    return client.sendOptimisticUpdate(type, data, rollback);
  }, [client]);

  const clearPendingUpdates = useCallback(() => {
    if (client) {
      client.clearOptimisticUpdates();
      setPendingUpdates([]);
    }
  }, [client]);

  return {
    pendingUpdates,
    hasPendingUpdates: pendingUpdates.length > 0,
    sendOptimisticUpdate,
    clearPendingUpdates,
  };
};

/**
 * Hook for system announcements
 */
export const useSystemAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Array<{
    title: string;
    message: string;
    type: 'maintenance' | 'feature' | 'warning' | 'info';
    data?: any;
    timestamp: string;
  }>>([]);

  useRealTimeEvent('system:announcement', (announcement) => {
    setAnnouncements(prev => [announcement, ...prev.slice(0, 9)]); // Keep last 10 announcements
  });

  const dismissAnnouncement = useCallback((timestamp: string) => {
    setAnnouncements(prev => prev.filter(a => a.timestamp !== timestamp));
  }, []);

  return {
    announcements,
    hasAnnouncements: announcements.length > 0,
    dismissAnnouncement,
  };
};

/**
 * Hook for admin notifications (admin users only)
 */
export const useAdminNotifications = () => {
  const [adminNotifications, setAdminNotifications] = useState<NotificationData[]>([]);

  useRealTimeEvent('admin:notification', (notification) => {
    setAdminNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
  });

  const dismissNotification = useCallback((id: string) => {
    setAdminNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    adminNotifications,
    hasAdminNotifications: adminNotifications.length > 0,
    dismissNotification,
  };
};

/**
 * Composite hook that provides all real-time functionality
 */
export const useRealTimeFeatures = (options: {
  projectId?: string | null;
  jobId?: string | null;
  enableCommunity?: boolean;
} = {}) => {
  const realTime = useRealTime();
  const notifications = useNotifications();
  const projectCollaboration = useProjectCollaboration(options.projectId || null);
  const generationProgress = useGenerationProgress(options.jobId || null);
  const communityFeed = options.enableCommunity ? useCommunityFeed() : null;
  const userStatus = useUserStatus();
  const creditBalance = useCreditBalance();
  const subscriptionStatus = useSubscriptionStatus();
  const optimisticUpdates = useOptimisticUpdates();
  const systemAnnouncements = useSystemAnnouncements();

  return {
    ...realTime,
    notifications,
    projectCollaboration,
    generationProgress,
    communityFeed,
    userStatus,
    creditBalance,
    subscriptionStatus,
    optimisticUpdates,
    systemAnnouncements,
  };
};