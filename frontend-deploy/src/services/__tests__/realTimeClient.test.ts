/**
 * Real-Time Client Tests
 * 
 * Unit tests for the RealTimeClient service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealTimeClient, ConnectionState, createRealTimeClient } from '../realTimeClient';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('RealTimeClient', () => {
  let client: RealTimeClient;
  let mockGetToken: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken = vi.fn().mockResolvedValue('mock-token');
    client = new RealTimeClient(mockGetToken);
    
    // Reset socket mock
    mockSocket.connected = false;
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
      expect(client.isConnected()).toBe(false);
    });

    it('should connect to WebSocket server', async () => {
      await client.connect();

      expect(mockGetToken).toHaveBeenCalled();
      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTING);
    });

    it('should handle connection success', async () => {
      await client.connect();

      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      if (connectHandler) {
        mockSocket.connected = true;
        connectHandler();
      }

      expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED);
      expect(client.isConnected()).toBe(true);
    });

    it('should handle connection error', async () => {
      await client.connect();

      const error = new Error('Connection failed');
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];
      
      if (errorHandler) {
        errorHandler(error);
      }

      expect(client.getConnectionState()).toBe(ConnectionState.ERROR);
    });

    it('should disconnect properly', async () => {
      await client.connect();
      client.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });

    it('should not connect if already connecting', async () => {
      const connectPromise1 = client.connect();
      const connectPromise2 = client.connect();

      await Promise.all([connectPromise1, connectPromise2]);

      expect(mockGetToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('Subscription Management', () => {
    beforeEach(async () => {
      await client.connect();
      mockSocket.connected = true;
      
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectHandler) {
        connectHandler();
      }
    });

    it('should subscribe to project updates', () => {
      const projectId = 'project-123';
      client.subscribeToProject(projectId);

      expect(mockSocket.emit).toHaveBeenCalledWith('project:join', projectId);
    });

    it('should unsubscribe from project updates', () => {
      const projectId = 'project-123';
      client.subscribeToProject(projectId);
      client.unsubscribeFromProject(projectId);

      expect(mockSocket.emit).toHaveBeenCalledWith('project:leave', projectId);
    });

    it('should subscribe to generation progress', () => {
      const jobId = 'job-123';
      client.subscribeToGeneration(jobId);

      expect(mockSocket.emit).toHaveBeenCalledWith('generation:subscribe', jobId);
    });

    it('should unsubscribe from generation progress', () => {
      const jobId = 'job-123';
      client.subscribeToGeneration(jobId);
      client.unsubscribeFromGeneration(jobId);

      expect(mockSocket.emit).toHaveBeenCalledWith('generation:unsubscribe', jobId);
    });

    it('should subscribe to community feed', () => {
      client.subscribeToCommunity();

      expect(mockSocket.emit).toHaveBeenCalledWith('community:join');
    });

    it('should unsubscribe from community feed', () => {
      client.subscribeToCommunity();
      client.unsubscribeFromCommunity();

      expect(mockSocket.emit).toHaveBeenCalledWith('community:leave');
    });

    it('should not subscribe when not connected', () => {
      client.disconnect();
      client.subscribeToProject('project-123');

      expect(mockSocket.emit).not.toHaveBeenCalledWith('project:join', 'project-123');
    });
  });

  describe('Optimistic Updates', () => {
    beforeEach(async () => {
      await client.connect();
      mockSocket.connected = true;
      
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectHandler) {
        connectHandler();
      }
    });

    it('should send optimistic update', () => {
      const rollback = vi.fn();
      const updateId = client.sendOptimisticUpdate('test:update', { test: 'data' }, rollback);

      expect(updateId).toMatch(/^opt_\d+_[a-z0-9]+$/);
      expect(mockSocket.emit).toHaveBeenCalledWith('optimistic:update', {
        id: updateId,
        type: 'test:update',
        data: { test: 'data' },
      });
    });

    it('should track pending updates', () => {
      const updateId = client.sendOptimisticUpdate('test:update', { test: 'data' });
      const pendingUpdates = client.getPendingUpdates();

      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].id).toBe(updateId);
      expect(pendingUpdates[0].type).toBe('test:update');
      expect(pendingUpdates[0].confirmed).toBe(false);
    });

    it('should handle optimistic update confirmation', () => {
      const updateId = client.sendOptimisticUpdate('test:update', { test: 'data' });
      
      // Simulate confirmation
      const confirmHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'optimistic:confirmed'
      )?.[1];
      
      if (confirmHandler) {
        confirmHandler({ id: updateId });
      }

      const pendingUpdates = client.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(0);
    });

    it('should handle optimistic update failure with rollback', () => {
      const rollback = vi.fn();
      const updateId = client.sendOptimisticUpdate('test:update', { test: 'data' }, rollback);
      
      // Simulate failure
      const failHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'optimistic:failed'
      )?.[1];
      
      if (failHandler) {
        failHandler({ id: updateId, error: 'Update failed' });
      }

      expect(rollback).toHaveBeenCalled();
      const pendingUpdates = client.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(0);
    });

    it('should clear all optimistic updates', () => {
      client.sendOptimisticUpdate('test:update1', { test: 'data1' });
      client.sendOptimisticUpdate('test:update2', { test: 'data2' });

      expect(client.getPendingUpdates()).toHaveLength(2);

      client.clearOptimisticUpdates();

      expect(client.getPendingUpdates()).toHaveLength(0);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await client.connect();
      mockSocket.connected = true;
      
      // Simulate connection
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (connectHandler) {
        connectHandler();
      }
    });

    it('should emit events when receiving server messages', () => {
      const eventSpy = vi.fn();
      client.on('notification', eventSpy);

      const mockNotification = {
        id: 'notif-1',
        type: 'info',
        title: 'Test',
        message: 'Test notification',
        timestamp: new Date().toISOString(),
      };

      // Simulate server notification
      const notificationHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1];
      
      if (notificationHandler) {
        notificationHandler(mockNotification);
      }

      expect(eventSpy).toHaveBeenCalledWith(mockNotification);
    });

    it('should handle progress updates', () => {
      const eventSpy = vi.fn();
      client.on('progress:update', eventSpy);

      const mockProgress = {
        jobId: 'job-123',
        percentage: 50,
        stage: 'Processing',
        timestamp: new Date().toISOString(),
      };

      // Simulate progress update
      const progressHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'progress:update'
      )?.[1];
      
      if (progressHandler) {
        progressHandler(mockProgress);
      }

      expect(eventSpy).toHaveBeenCalledWith(mockProgress);
    });

    it('should handle project updates', () => {
      const eventSpy = vi.fn();
      client.on('project:updated', eventSpy);

      const mockUpdate = {
        projectId: 'project-123',
        type: 'settings',
        data: { title: 'New Title' },
        timestamp: new Date().toISOString(),
      };

      // Simulate project update
      const updateHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'project:updated'
      )?.[1];
      
      if (updateHandler) {
        updateHandler(mockUpdate);
      }

      expect(eventSpy).toHaveBeenCalledWith(mockUpdate);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on disconnect', async () => {
      await client.connect();

      // Simulate disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];
      
      if (disconnectHandler) {
        disconnectHandler('transport close');
      }

      expect(client.getConnectionState()).toBe(ConnectionState.RECONNECTING);
    });

    it('should not reconnect on manual disconnect', async () => {
      await client.connect();

      // Simulate manual disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];
      
      if (disconnectHandler) {
        disconnectHandler('io client disconnect');
      }

      expect(client.getConnectionState()).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('Factory Functions', () => {
    it('should create singleton client', () => {
      const client1 = createRealTimeClient(mockGetToken);
      const client2 = createRealTimeClient(mockGetToken);

      expect(client1).toBe(client2);
    });
  });
});