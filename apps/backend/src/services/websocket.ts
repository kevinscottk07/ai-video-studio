import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
import { UserService } from './userService.js';
import { getRedisClient } from '../config/redis.js';

// JWKS client for Auth0
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {},
  timeout: 30000,
});

const getKey = promisify(client.getSigningKey.bind(client));
const userService = new UserService();

// Verify JWT token for WebSocket
const verifySocketToken = async (token: string): Promise<any> => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new Error('Invalid token structure');
    }

    const key = await getKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    const payload = jwt.verify(token, signingKey, {
      audience: process.env.AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    });

    return payload;
  } catch (error) {
    logger.error('Socket token verification failed:', error);
    throw error;
  }
};

// Store active connections in Redis for horizontal scaling
const SESSION_PREFIX = 'ws:session:';
const USER_CONNECTIONS_PREFIX = 'ws:user:';
const ROOM_PREFIX = 'ws:room:';

// Session management utilities
const sessionManager = {
  async storeSession(socketId: string, userId: string, userData: any): Promise<void> {
    const client = getRedisClient();
    const sessionKey = `${SESSION_PREFIX}${socketId}`;
    const userConnectionsKey = `${USER_CONNECTIONS_PREFIX}${userId}`;
    
    // Store session data
    await client.hset(sessionKey, {
      userId,
      email: userData.email,
      role: userData.role,
      connectedAt: new Date().toISOString(),
    });
    
    // Add socket to user's connection set
    await client.sadd(userConnectionsKey, socketId);
    
    // Set expiration for session (24 hours)
    await client.expire(sessionKey, 24 * 60 * 60);
    await client.expire(userConnectionsKey, 24 * 60 * 60);
  },

  async removeSession(socketId: string, userId: string): Promise<void> {
    const client = getRedisClient();
    const sessionKey = `${SESSION_PREFIX}${socketId}`;
    const userConnectionsKey = `${USER_CONNECTIONS_PREFIX}${userId}`;
    
    // Remove session data
    await client.del(sessionKey);
    
    // Remove socket from user's connection set
    await client.srem(userConnectionsKey, socketId);
    
    // Check if user has any remaining connections
    const remainingConnections = await client.scard(userConnectionsKey);
    if (remainingConnections === 0) {
      await client.del(userConnectionsKey);
    }
  },

  async getUserConnections(userId: string): Promise<string[]> {
    const client = getRedisClient();
    const userConnectionsKey = `${USER_CONNECTIONS_PREFIX}${userId}`;
    return await client.smembers(userConnectionsKey);
  },

  async isUserOnline(userId: string): Promise<boolean> {
    const client = getRedisClient();
    const userConnectionsKey = `${USER_CONNECTIONS_PREFIX}${userId}`;
    const connectionCount = await client.scard(userConnectionsKey);
    return connectionCount > 0;
  },

  async joinRoom(socketId: string, roomId: string): Promise<void> {
    const client = getRedisClient();
    const roomKey = `${ROOM_PREFIX}${roomId}`;
    await client.sadd(roomKey, socketId);
    await client.expire(roomKey, 24 * 60 * 60);
  },

  async leaveRoom(socketId: string, roomId: string): Promise<void> {
    const client = getRedisClient();
    const roomKey = `${ROOM_PREFIX}${roomId}`;
    await client.srem(roomKey, socketId);
    
    // Clean up empty rooms
    const memberCount = await client.scard(roomKey);
    if (memberCount === 0) {
      await client.del(roomKey);
    }
  },

  async getRoomMembers(roomId: string): Promise<string[]> {
    const client = getRedisClient();
    const roomKey = `${ROOM_PREFIX}${roomId}`;
    return await client.smembers(roomKey);
  },
};

// Store active connections (local to this instance)
const activeConnections = new Map<string, Socket>();

export const setupWebSocket = (io: SocketIOServer) => {
  // Set up Redis adapter for horizontal scaling
  const pubClient = getRedisClient();
  const subClient = pubClient.duplicate();
  
  io.adapter(createAdapter(pubClient, subClient));
  
  logger.info('Socket.io Redis adapter configured');

  // Authentication middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('No token provided'));
      }

      const payload = await verifySocketToken(token);
      
      // Get user from database
      const user = await userService.getUserByAuthProviderId(payload.sub);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.data.user = {
        id: user.id,
        email: user.email,
        sub: payload.sub,
        role: user.role,
      };

      next();
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    
    if (!user) {
      socket.disconnect();
      return;
    }

    logger.info('User connected via WebSocket', {
      userId: user.id,
      socketId: socket.id,
      email: user.email,
    });

    // Store connection locally and in Redis
    activeConnections.set(socket.id, socket);
    sessionManager.storeSession(socket.id, user.id, user);

    // Join user-specific room
    socket.join(`user:${user.id}`);
    sessionManager.joinRoom(socket.id, `user:${user.id}`);
    
    // Join role-specific room
    socket.join(`role:${user.role}`);
    sessionManager.joinRoom(socket.id, `role:${user.role}`);

    // Handle user presence
    socket.on('user:online', async () => {
      const isOnline = await sessionManager.isUserOnline(user.id);
      if (isOnline) {
        socket.broadcast.emit('user:status', {
          userId: user.id,
          status: 'online',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle project collaboration
    socket.on('project:join', async (projectId: string) => {
      if (!projectId || typeof projectId !== 'string') {
        socket.emit('error', { message: 'Invalid project ID' });
        return;
      }

      const roomName = `project:${projectId}`;
      socket.join(roomName);
      await sessionManager.joinRoom(socket.id, roomName);
      
      socket.to(roomName).emit('project:user_joined', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });

      logger.info('User joined project room', {
        userId: user.id,
        projectId,
        socketId: socket.id,
      });
    });

    socket.on('project:leave', async (projectId: string) => {
      if (!projectId || typeof projectId !== 'string') {
        socket.emit('error', { message: 'Invalid project ID' });
        return;
      }

      const roomName = `project:${projectId}`;
      socket.leave(roomName);
      await sessionManager.leaveRoom(socket.id, roomName);
      
      socket.to(roomName).emit('project:user_left', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });

      logger.info('User left project room', {
        userId: user.id,
        projectId,
        socketId: socket.id,
      });
    });

    // Handle real-time project updates
    socket.on('project:update', (data) => {
      if (!data || !data.projectId) {
        socket.emit('error', { message: 'Invalid project update data' });
        return;
      }

      const updateData = {
        ...data,
        userId: user.id,
        timestamp: new Date().toISOString(),
      };

      socket.to(`project:${data.projectId}`).emit('project:updated', updateData);
      
      logger.debug('Project update broadcasted', {
        userId: user.id,
        projectId: data.projectId,
        updateType: data.type,
      });
    });

    // Handle generation progress updates
    socket.on('generation:subscribe', async (jobId: string) => {
      if (!jobId || typeof jobId !== 'string') {
        socket.emit('error', { message: 'Invalid job ID' });
        return;
      }

      const roomName = `generation:${jobId}`;
      socket.join(roomName);
      await sessionManager.joinRoom(socket.id, roomName);
      
      logger.debug('User subscribed to generation updates', {
        userId: user.id,
        jobId,
        socketId: socket.id,
      });
    });

    socket.on('generation:unsubscribe', async (jobId: string) => {
      if (!jobId || typeof jobId !== 'string') {
        socket.emit('error', { message: 'Invalid job ID' });
        return;
      }

      const roomName = `generation:${jobId}`;
      socket.leave(roomName);
      await sessionManager.leaveRoom(socket.id, roomName);
      
      logger.debug('User unsubscribed from generation updates', {
        userId: user.id,
        jobId,
        socketId: socket.id,
      });
    });

    // Handle community interactions
    socket.on('community:join', async () => {
      const roomName = 'community:feed';
      socket.join(roomName);
      await sessionManager.joinRoom(socket.id, roomName);
      
      logger.debug('User joined community feed', {
        userId: user.id,
        socketId: socket.id,
      });
    });

    socket.on('community:leave', async () => {
      const roomName = 'community:feed';
      socket.leave(roomName);
      await sessionManager.leaveRoom(socket.id, roomName);
      
      logger.debug('User left community feed', {
        userId: user.id,
        socketId: socket.id,
      });
    });

    // Handle real-time community updates
    socket.on('community:interaction', (data) => {
      if (!data || !data.type || !data.contentId) {
        socket.emit('error', { message: 'Invalid community interaction data' });
        return;
      }

      const interactionData = {
        ...data,
        userId: user.id,
        timestamp: new Date().toISOString(),
      };

      socket.to('community:feed').emit('community:updated', interactionData);
      
      logger.debug('Community interaction broadcasted', {
        userId: user.id,
        type: data.type,
        contentId: data.contentId,
      });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      logger.info('User disconnected from WebSocket', {
        userId: user.id,
        socketId: socket.id,
        reason,
      });

      // Clean up local connection
      activeConnections.delete(socket.id);
      
      // Clean up Redis session
      await sessionManager.removeSession(socket.id, user.id);
      
      // Check if user is still online (has other connections)
      const isStillOnline = await sessionManager.isUserOnline(user.id);
      if (!isStillOnline) {
        // Broadcast user offline status
        socket.broadcast.emit('user:status', {
          userId: user.id,
          status: 'offline',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Send welcome message with connection info
    socket.emit('connected', {
      message: 'Connected to AI Video Studio',
      userId: user.id,
      timestamp: new Date().toISOString(),
      features: {
        realTimeUpdates: true,
        projectCollaboration: true,
        generationProgress: true,
        communityFeed: true,
      },
    });
  });

  // Enhanced broadcast utilities for Redis-backed scaling
  const broadcast = {
    toUser: async (userId: string, event: string, data: any) => {
      io.to(`user:${userId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      logger.debug('Broadcast to user', { userId, event });
    },

    toProject: async (projectId: string, event: string, data: any) => {
      io.to(`project:${projectId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      logger.debug('Broadcast to project', { projectId, event });
    },

    toGeneration: async (jobId: string, event: string, data: any) => {
      io.to(`generation:${jobId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      logger.debug('Broadcast to generation job', { jobId, event });
    },

    toCommunity: async (event: string, data: any) => {
      io.to('community:feed').emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      logger.debug('Broadcast to community', { event });
    },

    toRole: async (role: string, event: string, data: any) => {
      io.to(`role:${role}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      logger.debug('Broadcast to role', { role, event });
    },

    toAll: async (event: string, data: any) => {
      io.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      logger.debug('Broadcast to all', { event });
    },

    // Advanced broadcasting methods
    toUserConnections: async (userId: string, event: string, data: any) => {
      const connections = await sessionManager.getUserConnections(userId);
      if (connections.length > 0) {
        io.to(`user:${userId}`).emit(event, {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
      
      logger.debug('Broadcast to user connections', { 
        userId, 
        event, 
        connectionCount: connections.length 
      });
    },

    toRoomMembers: async (roomId: string, event: string, data: any) => {
      const members = await sessionManager.getRoomMembers(roomId);
      if (members.length > 0) {
        io.to(roomId).emit(event, {
          ...data,
          timestamp: new Date().toISOString(),
        });
      }
      
      logger.debug('Broadcast to room members', { 
        roomId, 
        event, 
        memberCount: members.length 
      });
    },

    // Notification system
    sendNotification: async (userId: string, notification: {
      type: 'info' | 'success' | 'warning' | 'error';
      title: string;
      message: string;
      data?: any;
    }) => {
      await broadcast.toUser(userId, 'notification', {
        ...notification,
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      });
    },

    // Progress updates
    updateProgress: async (jobId: string, progress: {
      percentage: number;
      stage: string;
      message?: string;
      data?: any;
    }) => {
      await broadcast.toGeneration(jobId, 'progress:update', {
        jobId,
        ...progress,
        timestamp: new Date().toISOString(),
      });
    },
  };

  // Attach broadcast utilities and session manager to io instance
  (io as any).broadcast = broadcast;
  (io as any).sessionManager = sessionManager;

  // Health check for WebSocket connections
  const healthCheck = {
    getConnectionStats: async () => {
      const client = getRedisClient();
      const sessionKeys = await client.keys(`${SESSION_PREFIX}*`);
      const userKeys = await client.keys(`${USER_CONNECTIONS_PREFIX}*`);
      const roomKeys = await client.keys(`${ROOM_PREFIX}*`);
      
      return {
        totalSessions: sessionKeys.length,
        totalUsers: userKeys.length,
        totalRooms: roomKeys.length,
        localConnections: activeConnections.size,
        timestamp: new Date().toISOString(),
      };
    },

    cleanupStaleConnections: async () => {
      const client = getRedisClient();
      const sessionKeys = await client.keys(`${SESSION_PREFIX}*`);
      let cleanedCount = 0;
      
      for (const sessionKey of sessionKeys) {
        const sessionData = await client.hgetall(sessionKey);
        if (sessionData.connectedAt) {
          const connectedAt = new Date(sessionData.connectedAt);
          const now = new Date();
          const hoursSinceConnection = (now.getTime() - connectedAt.getTime()) / (1000 * 60 * 60);
          
          // Clean up sessions older than 24 hours
          if (hoursSinceConnection > 24) {
            const socketId = sessionKey.replace(SESSION_PREFIX, '');
            await sessionManager.removeSession(socketId, sessionData.userId);
            cleanedCount++;
          }
        }
      }
      
      logger.info('Cleaned up stale WebSocket sessions', { cleanedCount });
      return cleanedCount;
    },
  };

  // Attach health check utilities
  (io as any).healthCheck = healthCheck;

  // Set up periodic cleanup (every hour)
  setInterval(async () => {
    try {
      await healthCheck.cleanupStaleConnections();
    } catch (error) {
      logger.error('Error during WebSocket cleanup:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  logger.info('WebSocket server initialized with Redis adapter', {
    redisAdapter: true,
    sessionManagement: true,
    horizontalScaling: true,
  });
};