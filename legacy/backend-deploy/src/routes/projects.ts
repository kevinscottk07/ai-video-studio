import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { projectService } from '../services/projectService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation middleware
const validateCreateProject = [
  body('title')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('settings.resolution')
    .optional()
    .isIn(['standard', 'hd', 'ultra'])
    .withMessage('Invalid resolution'),
  body('settings.duration')
    .optional()
    .isInt({ min: 1, max: 7200 })
    .withMessage('Duration must be between 1 and 7200 seconds'),
  body('settings.language')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Invalid language code'),
  body('settings.style')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid style'),
  body('settings.musicEnabled')
    .optional()
    .isBoolean()
    .withMessage('musicEnabled must be a boolean'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
];

const validateUpdateProject = [
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('title')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('settings.resolution')
    .optional()
    .isIn(['standard', 'hd', 'ultra'])
    .withMessage('Invalid resolution'),
  body('settings.duration')
    .optional()
    .isInt({ min: 1, max: 7200 })
    .withMessage('Duration must be between 1 and 7200 seconds'),
  body('settings.language')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Invalid language code'),
  body('settings.style')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid style'),
  body('settings.musicEnabled')
    .optional()
    .isBoolean()
    .withMessage('musicEnabled must be a boolean'),
  body('status')
    .optional()
    .isIn(['draft', 'generating', 'completed', 'failed'])
    .withMessage('Invalid status'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
];

const validateProjectId = [
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
];

const validateProjectFilters = [
  query('status')
    .optional()
    .isIn(['draft', 'generating', 'completed', 'failed'])
    .withMessage('Invalid status'),
  query('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title'])
    .withMessage('Invalid sortBy field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sortOrder'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative'),
];

const validateShareSettings = [
  param('projectId')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('isPublic')
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('allowComments')
    .optional()
    .isBoolean()
    .withMessage('allowComments must be a boolean'),
  body('allowDownloads')
    .optional()
    .isBoolean()
    .withMessage('allowDownloads must be a boolean'),
  body('collaborators')
    .optional()
    .isArray()
    .withMessage('collaborators must be an array'),
  body('collaborators.*')
    .optional()
    .isUUID()
    .withMessage('Invalid collaborator ID'),
];

// Error handling middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array(),
        requestId: req.id,
        timestamp: new Date().toISOString(),
      },
    });
  }
  next();
};

// Routes

// Create a new project
router.post(
  '/',
  authenticateToken,
  validateCreateProject,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const projectData = req.body;

      const project = await projectService.createProject(userId, projectData);

      res.status(201).json({
        success: true,
        data: {
          project,
        },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.info('Project created via API', {
        projectId: project.id,
        userId,
        title: project.title,
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to create project via API', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      res.status(500).json({
        error: {
          code: 'PROJECT_CREATION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create project',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Get user's projects with filtering and pagination
router.get(
  '/',
  authenticateToken,
  validateProjectFilters,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const filters = {
        status: req.query.status,
        isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
        search: req.query.search,
        sortBy: req.query.sortBy || 'updatedAt',
        sortOrder: req.query.sortOrder || 'desc',
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
      };

      const result = await projectService.getUserProjects(userId, filters);

      res.json({
        success: true,
        data: result,
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Projects retrieved via API', {
        userId,
        count: result.projects.length,
        total: result.total,
        filters,
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to get projects via API', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      res.status(500).json({
        error: {
          code: 'PROJECTS_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get projects',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Search public projects
router.get(
  '/search',
  validateProjectFilters,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const query = req.query.q || req.query.search || '';
      if (!query) {
        return res.status(400).json({
          error: {
            code: 'MISSING_SEARCH_QUERY',
            message: 'Search query is required',
            requestId: req.id,
            timestamp: new Date().toISOString(),
          },
        });
      }

      const filters = {
        status: req.query.status,
        sortBy: req.query.sortBy || 'updatedAt',
        sortOrder: req.query.sortOrder || 'desc',
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0,
      };

      const result = await projectService.searchProjects(query, filters);

      res.json({
        success: true,
        data: result,
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Projects searched via API', {
        query,
        count: result.projects.length,
        total: result.total,
        filters,
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to search projects via API', {
        query: req.query.q || req.query.search,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      res.status(500).json({
        error: {
          code: 'PROJECT_SEARCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to search projects',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Get project statistics
router.get(
  '/stats',
  authenticateToken,
  async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const stats = await projectService.getProjectStats(userId);

      res.json({
        success: true,
        data: { stats },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Project stats retrieved via API', {
        userId,
        stats,
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to get project stats via API', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      res.status(500).json({
        error: {
          code: 'PROJECT_STATS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get project stats',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Get a specific project
router.get(
  '/:projectId',
  validateProjectId,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user?.id; // Optional for public projects

      const project = await projectService.getProject(projectId, userId);

      res.json({
        success: true,
        data: {
          project,
        },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Project retrieved via API', {
        projectId,
        userId,
        title: project.title,
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to get project via API', {
        projectId: req.params.projectId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'PROJECT_NOT_FOUND' : 'PROJECT_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get project',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Update a project
router.put(
  '/:projectId',
  authenticateToken,
  validateUpdateProject,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.id;
      const updates = req.body;

      const project = await projectService.updateProject(projectId, userId, updates);

      res.json({
        success: true,
        data: {
          project,
        },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.info('Project updated via API', {
        projectId,
        userId,
        changes: Object.keys(updates),
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to update project via API', {
        projectId: req.params.projectId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'PROJECT_NOT_FOUND' : 'PROJECT_UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update project',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Delete a project
router.delete(
  '/:projectId',
  authenticateToken,
  validateProjectId,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.id;

      await projectService.deleteProject(projectId, userId);

      res.json({
        success: true,
        data: {
          message: 'Project deleted successfully',
        },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.info('Project deleted via API', {
        projectId,
        userId,
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to delete project via API', {
        projectId: req.params.projectId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'PROJECT_NOT_FOUND' : 'PROJECT_DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete project',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

// Update project sharing settings
router.post(
  '/:projectId/share',
  authenticateToken,
  validateShareSettings,
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.id;
      const shareSettings = req.body;

      const project = await projectService.shareProject(projectId, userId, shareSettings);

      res.json({
        success: true,
        data: {
          project,
        },
        requestId: req.id,
        timestamp: new Date().toISOString(),
      });

      logger.info('Project sharing updated via API', {
        projectId,
        userId,
        isPublic: shareSettings.isPublic,
        requestId: req.id,
      });
    } catch (error) {
      logger.error('Failed to update project sharing via API', {
        projectId: req.params.projectId,
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.id,
      });

      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: {
          code: statusCode === 404 ? 'PROJECT_NOT_FOUND' : 'PROJECT_SHARE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update project sharing',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

export { router as projectRoutes };