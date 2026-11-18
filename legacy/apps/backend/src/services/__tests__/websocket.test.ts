import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { setupWebSocket } from '../websocket.js';
import { getRedisClient } from '../../config/redis.js';

// Mock dependencies
vi.mock('../../config/redis.js');
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../userService.js', () => ({
  UserService: vi.fn().mockImplementation(() => ({
    getUserByAuthProviderId: vi.fn().mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    }),
  })),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    decode: vi.fn().mockReturnValue({
      header: { kid: 'test-kid' },
    }),
    verify: vi.fn().mockReturnValue({
      sub: 'auth0|123',
      aud: 'test-audience',
    }),
  },
}));

vi.mock('jwks-rsa', () => ({
  default: vi.fn().mockReturnValue({
    getSigningKey: vi.fn().mockImplementation((kid, callback) => {
      callback(null, {
        getPublicKey: () => 'test-public-key',
      });
    }),
  }),
}));

describe('WebSocket Service', () => {
  let server: any;
  let io: SocketIOServer;
  let mockRedisClient: any;

  beforeEach(() => {
    // Mock Redis client
    mockRedisClient = {
      duplicate: vi.fn().mockReturnThis(),
      hset: vi.fn().mockResolvedValue(1),
      sadd: vi.fn().mockResolvedValue(1),
      srem: vi.fn().mockResolvedValue(1),
      scard: vi.fn().mockResolvedValue(0),
      smembers: vi.fn().mockResolvedValue([]),
      del: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      hgetall: vi.fn().mockResolvedValue({}),
    };

    (getRedisClient as any).mockReturnValue(mockRedisClient);

    // Create HTTP server and Socket.IO instance
    server = createServer();
    io = new SocketIOServer(server);
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (server) {
      server.close();
    }
  });

  describe('setupWebSocket', () => {
    it('should configure Redis adapter', () => {
      setupWebSocket(io);
      
      expect(getRedisClient).toHaveBeenCalled();
      expect(mockRedisClient.duplicate).toHaveBeenCalled();
    });

    it('should attach broadcast utilities to io instance', () => {
      setupWebSocket(io);
      
      expect((io as any).broadcast).toBeDefined();
      expect((io as any).sessionManager).toBeDefined();
      expect((io as any).healthCheck).toBeDefined();
    });

    it('should set up authentication middleware', () => {
      setupWebSocket(io);
      
      // Check that middleware was added
      expect(io._nsps.get('/')?.fns).toHaveLength(1);
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      setupWebSocket(io);
    });

    it('should store session data in Redis', async () => {
      const sessionManager = (io as any).sessionManager;
      
      await sessionManager.storeSession('socket-123', 'user-456', {
        email: 'test@example.com',
        role: 'user',
      });

      expect(mockRedisClient.hset).toHaveBeenCalledWith(
        'ws:session:socket-123',
        expect.objectContaining({
          userId: 'user-456',
          email: 'test@example.com',
          role: 'user',
        })
      );
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'ws:user:user-456',
        'socket-123'
      );
    });

    it('should remove session data from Redis', async () => {
      const sessionManager = (io as any).sessionManager;
      
      await sessionManager.removeSession('socket-123', 'user-456');

      expect(mockRedisClient.del).toHaveBeenCalledWith('ws:session:socket-123');
      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        'ws:user:user-456',
        'socket-123'
      );
    });

    it('should check if user is online', async () => {
      const sessionManager = (io as any).sessionManager;
      mockRedisClient.scard.mockResolvedValue(2);
      
      const isOnline = await sessionManager.isUserOnline('user-456');
      
      expect(isOnline).toBe(true);
      expect(mockRedisClient.scard).toHaveBeenCalledWith('ws:user:user-456');
    });

    it('should return false for offline users', async () => {
      const sessionManager = (io as any).sessionManager;
      mockRedisClient.scard.mockResolvedValue(0);
      
      const isOnline = await sessionManager.isUserOnline('user-456');
      
      expect(isOnline).toBe(false);
    });
  });

  describe('Broadcast Utilities', () => {
    beforeEach(() => {
      setupWebSocket(io);
    });

    it('should broadcast to user', async () => {
      const broadcast = (io as any).broadcast;
      const emitSpy = vi.spyOn(io, 'to').mockReturnValue({
        emit: vi.fn(),
      } as any);
      
      await broadcast.toUser('user-123', 'test:event', { message: 'hello' });
      
      expect(emitSpy).toHaveBeenCalledWith('user:user-123');
    });

    it('should broadcast to project', async () => {
      const broadcast = (io as any).broadcast;
      const emitSpy = vi.spyOn(io, 'to').mockReturnValue({
        emit: vi.fn(),
      } as any);
      
      await broadcast.toProject('project-456', 'project:update', { data: 'test' });
      
      expect(emitSpy).toHaveBeenCalledWith('project:project-456');
    });

    it('should broadcast to generation job', async () => {
      const broadcast = (io as any).broadcast;
      const emitSpy = vi.spyOn(io, 'to').mockReturnValue({
        emit: vi.fn(),
      } as any);
      
      await broadcast.toGeneration('job-789', 'progress:update', { percentage: 50 });
      
      expect(emitSpy).toHaveBeenCalledWith('generation:job-789');
    });

    it('should send notifications with proper format', async () => {
      const broadcast = (io as any).broadcast;
      const mockEmit = vi.fn();
      vi.spyOn(io, 'to').mockReturnValue({ emit: mockEmit } as any);
      
      await broadcast.sendNotification('user-123', {
        type: 'success',
        title: 'Test Notification',
        message: 'This is a test',
      });
      
      expect(mockEmit).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'success',
        title: 'Test Notification',
        message: 'This is a test',
        id: expect.stringMatching(/^notif_\d+_[a-z0-9]+$/),
        timestamp: expect.any(String),
      }));
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      setupWebSocket(io);
    });

    it('should return connection statistics', async () => {
      const healthCheck = (io as any).healthCheck;
      mockRedisClient.keys
        .mockResolvedValueOnce(['session1', 'session2']) // sessions
        .mockResolvedValueOnce(['user1']) // users
        .mockResolvedValueOnce(['room1', 'room2', 'room3']); // rooms
      
      const stats = await healthCheck.getConnectionStats();
      
      expect(stats).toEqual({
        totalSessions: 2,
        totalUsers: 1,
        totalRooms: 3,
        localConnections: 0,
        timestamp: expect.any(String),
      });
    });

    it('should clean up stale connections', async () => {
      const healthCheck = (io as any).healthCheck;
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      mockRedisClient.keys.mockResolvedValue(['ws:session:stale-socket']);
      mockRedisClient.hgetall.mockResolvedValue({
        userId: 'user-123',
        connectedAt: staleDate.toISOString(),
      });
      
      const cleanedCount = await healthCheck.cleanupStaleConnections();
      
      expect(cleanedCount).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith('ws:session:stale-socket');
    });
  });

  describe('Room Management', () => {
    beforeEach(() => {
      setupWebSocket(io);
    });

    it('should join room and track in Redis', async () => {
      const sessionManager = (io as any).sessionManager;
      
      await sessionManager.joinRoom('socket-123', 'project:456');
      
      expect(mockRedisClient.sadd).toHaveBeenCalledWith(
        'ws:room:project:456',
        'socket-123'
      );
      expect(mockRedisClient.expire).toHaveBeenCalledWith(
        'ws:room:project:456',
        24 * 60 * 60
      );
    });

    it('should leave room and clean up empty rooms', async () => {
      const sessionManager = (io as any).sessionManager;
      mockRedisClient.scard.mockResolvedValue(0); // Empty room
      
      await sessionManager.leaveRoom('socket-123', 'project:456');
      
      expect(mockRedisClient.srem).toHaveBeenCalledWith(
        'ws:room:project:456',
        'socket-123'
      );
      expect(mockRedisClient.del).toHaveBeenCalledWith('ws:room:project:456');
    });

    it('should get room members', async () => {
      const sessionManager = (io as any).sessionManager;
      mockRedisClient.smembers.mockResolvedValue(['socket-1', 'socket-2']);
      
      const members = await sessionManager.getRoomMembers('project:456');
      
      expect(members).toEqual(['socket-1', 'socket-2']);
      expect(mockRedisClient.smembers).toHaveBeenCalledWith('ws:room:project:456');
    });
  });
});