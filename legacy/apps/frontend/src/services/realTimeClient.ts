/**
 * Real-Time Client Service
 * 
 * Comprehensive WebSocket client service for AI Video Studio.
 * Handles connection management, event subscriptions, optimistic updates,
 * and server reconciliation.
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

// Types for real-time events
export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  persistent?: boolean;
  timestamp: string;
}

export interface ProgressData {
  jobId: string;
  percentage: number;
  stage: string;
  message?: string;
  data?: any;
  timestamp: string;
}

export interface ProjectUpdateData {
  projectId: string;
  type: 'settings' | 'assets' | 'status' | 'collaboration';
  data: any;
  userId?: string;
  timestamp: string;
}

export interface CommunityUpdateData {
  type: 'like' | 'comment' | 'share' | 'new_post';
  contentId: string;
  userId: string;
  data?: any;
  timestamp: string;
}

export interface UserStatusData {
  userId: string;
  status: 'online' | 'offline' | 'busy';
  timestamp: string;
}

export interface CreditUpdateData {
  balance: number;
  transaction?: {
    type: 'purchase' | 'deduction' | 'refund';
    amount: number;
    description: string;
  };
  timestamp: string;
}

export interface SubscriptionUpdateData {
  status: string;
  plan: string;
  creditsIncluded: number;
  creditsUsed: number;
  timestamp: string;
}

// Optimistic update types
export interface OptimisticUpdate<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
  rollback?: () => void;
  confirmed?: boolean;
}

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// Event types for type safety
export interface RealTimeEvents {
  // Connection events
  'connection:state': ConnectionState;
  'connection:error': Error;
  
  // Notifications
  'notification': NotificationData;
  
  // Progress updates
  'progress:update': ProgressData;
  
  // Project updates
  'project:updated': ProjectUpdateData;
  'project:user_joined': { userId: string; email: string; timestamp: string };
  'project:user_left': { userId: string; email: string; timestamp: string };
  
  // Community updates
  'community:updated': CommunityUpdateData;
  
  // User status
  'user:status': UserStatusData;
  
  // Credit updates
  'credits:updated': CreditUpdateData;
  
  // Subscription updates
  'subscription:updated': SubscriptionUpdateData;
  
  // System announcements
  'system:announcement': {
    title: string;
    message: string;
    type: 'maintenance' | 'feature' | 'warning' | 'info';
    data?: any;
    timestamp: string;
  };
  
  // Admin notifications
  'admin:notification': NotificationData;
  
  // Optimistic updates
  'optimistic:confirmed': { id: string };
  'optimistic:failed': { id: string; error: string };
}

export class RealTimeClient extends EventEmitter {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private optimisticUpdates = new Map<string, OptimisticUpdate>();
  private subscriptions = new Set<string>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;

  constructor(private getToken: () => Promise<string>) {
    super();
    this.setMaxListeners(100); // Allow many listeners for different components
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<void> {
    if (this.connectionState === ConnectionState.CONNECTED || 
        this.connectionState === ConnectionState.CONNECTING) {
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      const token = await this.getToken();
      const socketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001';
      
      this.socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: false, // We'll handle reconnection manually
      });

      this.setupSocketListeners();
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState !== ConnectionState.CONNECTED) {
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 10000);

    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.clearTimeouts();
    this.subscriptions.clear();
    this.optimisticUpdates.clear();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Subscribe to project updates
   */
  subscribeToProject(projectId: string): void {
    if (!this.isConnected()) {
      console.warn('[RealTime] Cannot subscribe to project - not connected');
      return;
    }

    const subscription = `project:${projectId}`;
    if (this.subscriptions.has(subscription)) {
      return;
    }

    this.socket?.emit('project:join', projectId);
    this.subscriptions.add(subscription);
  }

  /**
   * Unsubscribe from project updates
   */
  unsubscribeFromProject(projectId: string): void {
    if (!this.isConnected()) {
      return;
    }

    const subscription = `project:${projectId}`;
    if (!this.subscriptions.has(subscription)) {
      return;
    }

    this.socket?.emit('project:leave', projectId);
    this.subscriptions.delete(subscription);
  }

  /**
   * Subscribe to generation progress
   */
  subscribeToGeneration(jobId: string): void {
    if (!this.isConnected()) {
      console.warn('[RealTime] Cannot subscribe to generation - not connected');
      return;
    }

    const subscription = `generation:${jobId}`;
    if (this.subscriptions.has(subscription)) {
      return;
    }

    this.socket?.emit('generation:subscribe', jobId);
    this.subscriptions.add(subscription);
  }

  /**
   * Unsubscribe from generation progress
   */
  unsubscribeFromGeneration(jobId: string): void {
    if (!this.isConnected()) {
      return;
    }

    const subscription = `generation:${jobId}`;
    if (!this.subscriptions.has(subscription)) {
      return;
    }

    this.socket?.emit('generation:unsubscribe', jobId);
    this.subscriptions.delete(subscription);
  }

  /**
   * Subscribe to community feed
   */
  subscribeToCommunity(): void {
    if (!this.isConnected()) {
      console.warn('[RealTime] Cannot subscribe to community - not connected');
      return;
    }

    const subscription = 'community:feed';
    if (this.subscriptions.has(subscription)) {
      return;
    }

    this.socket?.emit('community:join');
    this.subscriptions.add(subscription);
  }

  /**
   * Unsubscribe from community feed
   */
  unsubscribeFromCommunity(): void {
    if (!this.isConnected()) {
      return;
    }

    const subscription = 'community:feed';
    if (!this.subscriptions.has(subscription)) {
      return;
    }

    this.socket?.emit('community:leave');
    this.subscriptions.delete(subscription);
  }

  /**
   * Send optimistic update with server reconciliation
   */
  sendOptimisticUpdate<T>(
    type: string,
    data: T,
    rollback?: () => void
  ): string {
    const updateId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const update: OptimisticUpdate<T> = {
      id: updateId,
      type,
      data,
      timestamp: Date.now(),
      rollback,
      confirmed: false,
    };

    this.optimisticUpdates.set(updateId, update);

    // Send to server if connected
    if (this.isConnected()) {
      this.socket?.emit('optimistic:update', {
        id: updateId,
        type,
        data,
      });

      // Set timeout for confirmation
      setTimeout(() => {
        if (this.optimisticUpdates.has(updateId)) {
          const update = this.optimisticUpdates.get(updateId);
          if (!update?.confirmed) {
            this.handleOptimisticFailure(updateId, 'Timeout waiting for server confirmation');
          }
        }
      }, 10000); // 10 second timeout
    } else {
      // Queue for when connection is restored
      console.warn('[RealTime] Optimistic update queued - not connected');
    }

    return updateId;
  }

  /**
   * Send project update with optimistic UI
   */
  updateProject(projectId: string, updateType: string, data: any, rollback?: () => void): string {
    return this.sendOptimisticUpdate('project:update', {
      projectId,
      type: updateType,
      data,
    }, rollback);
  }

  /**
   * Send community interaction with optimistic UI
   */
  sendCommunityInteraction(
    type: 'like' | 'comment' | 'share',
    contentId: string,
    data: any,
    rollback?: () => void
  ): string {
    return this.sendOptimisticUpdate('community:interaction', {
      type,
      contentId,
      data,
    }, rollback);
  }

  /**
   * Get pending optimistic updates
   */
  getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.optimisticUpdates.values()).filter(update => !update.confirmed);
  }

  /**
   * Clear all optimistic updates
   */
  clearOptimisticUpdates(): void {
    this.optimisticUpdates.clear();
  }

  // Private methods

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection:state', state);
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[RealTime] Connected to server');
      this.clearTimeouts();
      this.setConnectionState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.resubscribeAll();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[RealTime] Disconnected:', reason);
      this.clearTimeouts();
      this.setConnectionState(ConnectionState.DISCONNECTED);
      
      // Auto-reconnect unless manually disconnected
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[RealTime] Connection error:', error);
      this.handleConnectionError(error);
    });

    // Welcome message
    this.socket.on('connected', (data) => {
      console.log('[RealTime] Welcome:', data);
    });

    // Real-time event listeners
    this.socket.on('notification', (data: NotificationData) => {
      this.emit('notification', data);
    });

    this.socket.on('progress:update', (data: ProgressData) => {
      this.emit('progress:update', data);
    });

    this.socket.on('project:updated', (data: ProjectUpdateData) => {
      this.emit('project:updated', data);
    });

    this.socket.on('project:user_joined', (data) => {
      this.emit('project:user_joined', data);
    });

    this.socket.on('project:user_left', (data) => {
      this.emit('project:user_left', data);
    });

    this.socket.on('community:updated', (data: CommunityUpdateData) => {
      this.emit('community:updated', data);
    });

    this.socket.on('user:status', (data: UserStatusData) => {
      this.emit('user:status', data);
    });

    this.socket.on('credits:updated', (data: CreditUpdateData) => {
      this.emit('credits:updated', data);
    });

    this.socket.on('subscription:updated', (data: SubscriptionUpdateData) => {
      this.emit('subscription:updated', data);
    });

    this.socket.on('system:announcement', (data) => {
      this.emit('system:announcement', data);
    });

    this.socket.on('admin:notification', (data: NotificationData) => {
      this.emit('admin:notification', data);
    });

    // Optimistic update confirmations
    this.socket.on('optimistic:confirmed', ({ id }) => {
      this.handleOptimisticConfirmation(id);
    });

    this.socket.on('optimistic:failed', ({ id, error }) => {
      this.handleOptimisticFailure(id, error);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('[RealTime] Socket error:', error);
      this.emit('connection:error', error);
    });
  }

  private handleConnectionError(error: Error): void {
    this.clearTimeouts();
    this.setConnectionState(ConnectionState.ERROR);
    this.emit('connection:error', error);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealTime] Max reconnection attempts reached');
      return;
    }

    this.setConnectionState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[RealTime] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private resubscribeAll(): void {
    // Re-establish all subscriptions after reconnection
    for (const subscription of this.subscriptions) {
      if (subscription.startsWith('project:')) {
        const projectId = subscription.replace('project:', '');
        this.socket?.emit('project:join', projectId);
      } else if (subscription.startsWith('generation:')) {
        const jobId = subscription.replace('generation:', '');
        this.socket?.emit('generation:subscribe', jobId);
      } else if (subscription === 'community:feed') {
        this.socket?.emit('community:join');
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // 30 seconds
  }

  private clearTimeouts(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private handleOptimisticConfirmation(id: string): void {
    const update = this.optimisticUpdates.get(id);
    if (update) {
      update.confirmed = true;
      this.emit('optimistic:confirmed', { id });
    }
  }

  private handleOptimisticFailure(id: string, error: string): void {
    const update = this.optimisticUpdates.get(id);
    if (update) {
      // Execute rollback if provided
      if (update.rollback) {
        update.rollback();
      }
      
      this.optimisticUpdates.delete(id);
      this.emit('optimistic:failed', { id, error });
    }
  }
}

// Singleton instance
let realTimeClient: RealTimeClient | null = null;

export const createRealTimeClient = (getToken: () => Promise<string>): RealTimeClient => {
  if (!realTimeClient) {
    realTimeClient = new RealTimeClient(getToken);
  }
  return realTimeClient;
};

export const getRealTimeClient = (): RealTimeClient | null => {
  return realTimeClient;
};