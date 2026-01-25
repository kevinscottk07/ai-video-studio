import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './services/websocket.js';
import { realTimeService } from './services/realTimeService.js';
import { checkDatabaseHealth } from './config/prisma.js';
import { ConnectionMonitor } from './utils/queryOptimization.js';
import { initializePrisma, disconnectPrisma } from './config/prisma.js';
import { initializePool, closePool } from './config/database-pool.js';
import { connectRedis } from './config/redis.js';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression and parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const [dbHealth, connectionHealth] = await Promise.all([
      checkDatabaseHealth(),
      ConnectionMonitor.checkHealth(),
    ]);

    const health = {
      status: dbHealth && connectionHealth.isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: dbHealth,
        connections: connectionHealth.connectionCount,
        activeQueries: connectionHealth.activeQueries,
        avgQueryTime: Math.round(connectionHealth.avgQueryTime),
      },
    };

    res.status(health.status === 'ok' ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      error: 'Health check failed',
    });
  }
});

// API routes
setupRoutes(app);

// WebSocket setup
setupWebSocket(io);

// Initialize real-time service
realTimeService.initialize(io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await disconnectPrisma();
      await closePool();
      logger.info('Database connections closed');
      
      // Close Redis connections
      // This will be handled by the Redis service
      
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    // Initialize Prisma ORM
    await initializePrisma();
    logger.info('Prisma ORM initialized successfully');
    
    // Initialize connection pool for optimized queries
    initializePool();
    logger.info('Database connection pool initialized');
    
    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');
    
    // Start server
    server.listen(PORT, HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`WebSocket server ready`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();