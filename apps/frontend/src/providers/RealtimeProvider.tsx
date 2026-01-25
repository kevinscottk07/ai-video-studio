/**
 * Enhanced Realtime Provider
 * 
 * Provides real-time functionality using the comprehensive RealTimeClient.
 * Integrates with toast notifications for seamless user experience.
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useRealTime, useNotifications } from '../hooks/useRealTime';
import { useToast } from './ToastProvider';
import { ConnectionState } from '../services/realTimeClient';

interface RealtimeContextType {
  connectionState: ConnectionState;
  isConnected: boolean;
  error: Error | null;
  clearError: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

interface RealtimeProviderProps {
  children: ReactNode;
}

export const RealtimeProvider = ({ children }: RealtimeProviderProps) => {
  const { isAuthenticated } = useAuth0();
  const { connectionState, isConnected, error, clearError } = useRealTime();
  const { notifications } = useNotifications();
  const toast = useToast();

  // Show connection status notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    switch (connectionState) {
      case ConnectionState.CONNECTED:
        // Only show success toast on reconnection, not initial connection
        if (error) {
          toast.success('Reconnected to real-time updates', 'Connection Restored');
          clearError();
        }
        break;
        
      case ConnectionState.RECONNECTING:
        toast.warning('Reconnecting to real-time updates...', 'Connection Lost');
        break;
        
      case ConnectionState.ERROR:
        if (error) {
          toast.error(
            'Failed to connect to real-time updates. Some features may not work properly.',
            'Connection Error'
          );
        }
        break;
    }
  }, [connectionState, error, isAuthenticated, toast, clearError]);

  // Handle real-time notifications
  useEffect(() => {
    notifications.forEach(notification => {
      switch (notification.type) {
        case 'success':
          toast.success(notification.message, notification.title);
          break;
        case 'error':
          toast.error(notification.message, notification.title);
          break;
        case 'warning':
          toast.warning(notification.message, notification.title);
          break;
        case 'info':
        default:
          toast.info(notification.message, notification.title);
          break;
      }
    });
  }, [notifications, toast]);

  const value: RealtimeContextType = {
    connectionState,
    isConnected,
    error,
    clearError,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

// Legacy compatibility - deprecated, use useRealTime hooks instead
export const useRealtimeSocket = () => {
  console.warn('useRealtimeSocket is deprecated. Use useRealTime hooks instead.');
  const { isConnected } = useRealtime();
  
  return {
    socket: null, // Legacy compatibility
    isConnected,
    emit: () => console.warn('Direct socket emit is deprecated. Use specific hooks instead.'),
    on: () => console.warn('Direct socket on is deprecated. Use specific hooks instead.'),
    off: () => console.warn('Direct socket off is deprecated. Use specific hooks instead.'),
  };
};