import { Express } from 'express';
import { authRoutes } from './auth.js';
import creditRoutes from './credits.js';
import subscriptionRoutes from './subscriptions.js';
import webhookRoutes from './webhooks.js';
import { aiRoutes } from './ai.js';
import { videoRoutes } from './video.js';
import { projectRoutes } from './projects.js';
import communityRoutes from './community.js';
import moderationRoutes from './moderation.js';
import translationRoutes from './translation.js';
import adminRoutes from './admin.js';
import privacyRoutes from './privacy.js';
import storageRoutes from './storage.js';
import { logger } from '../utils/logger.js';

export const setupRoutes = (app: Express) => {
  // API version prefix
  const API_PREFIX = '/api/v1';

  // Health check (no prefix)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Webhook routes (no auth required, before JSON parsing middleware)
  app.use(`${API_PREFIX}/webhooks`, webhookRoutes);

  // Authentication routes
  app.use(`${API_PREFIX}/auth`, authRoutes);

  // Credit management routes
  app.use(`${API_PREFIX}/credits`, creditRoutes);

  // Subscription management routes
  app.use(`${API_PREFIX}/subscriptions`, subscriptionRoutes);

  // AI services routes
  app.use(`${API_PREFIX}/ai`, aiRoutes);

  // Video generation routes
  app.use(`${API_PREFIX}/video`, videoRoutes);

  // Project management routes
  app.use(`${API_PREFIX}/projects`, projectRoutes);

  // Community routes
  app.use(`${API_PREFIX}/community`, communityRoutes);

  // Content moderation routes
  app.use(`${API_PREFIX}/moderation`, moderationRoutes);

  // Translation and localization routes
  app.use(`${API_PREFIX}/translation`, translationRoutes);

  // Admin routes
  app.use(`${API_PREFIX}/admin`, adminRoutes);

  // Privacy and GDPR/CCPA compliance routes
  app.use(`${API_PREFIX}/privacy`, privacyRoutes);

  // Secure storage routes
  app.use(`${API_PREFIX}/storage`, storageRoutes);

  // WebSocket health check
  app.get(`${API_PREFIX}/ws/health`, (req, res) => {
    res.json({
      status: 'ok',
      websocket: 'enabled',
      timestamp: new Date().toISOString(),
    });
  });

  logger.info('Routes configured', {
    prefix: API_PREFIX,
    routes: ['auth', 'credits', 'subscriptions', 'ai', 'video', 'projects', 'community', 'moderation', 'translation', 'admin', 'privacy', 'storage', 'webhooks', 'health', 'ws/health'],
  });
};