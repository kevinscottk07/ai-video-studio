import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { secureStorageService } from '../services/secureStorageService.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common media types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'text/plain',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Validation middleware
const validateUploadRequest = [
  body('projectId').optional().isUUID(),
  body('isPublic').optional().isBoolean(),
  body('expiresIn').optional().isInt({ min: 300, max: 86400 }), // 5 minutes to 24 hours
];

const validateDownloadRequest = [
  query('key').isString().isLength({ min: 1, max: 500 }),
  query('expiresIn').optional().isInt({ min: 300, max: 86400 }),
  query('download').optional().isBoolean(),
];

// POST /storage/upload-url - Generate secure upload URL
router.post('/upload-url', authenticate, validateUploadRequest, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;
    const { projectId, filename, contentType, isPublic, expiresIn, metadata } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'filename and contentType are required',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const uploadData = await secureStorageService.generateSecureUploadUrl({
      userId,
      projectId,
      filename,
      contentType,
      isPublic,
      expiresIn,
      metadata,
    });

    logger.info('Upload URL generated', { userId, filename, projectId });

    res.json({
      success: true,
      data: {
        uploadUrl: uploadData.uploadUrl,
        key: uploadData.key,
        fields: uploadData.fields,
        expiresIn: expiresIn || 3600,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in upload-url endpoint:', error);
    throw error;
  }
});

// POST /storage/upload - Direct file upload
router.post('/upload', authenticate, upload.single('file'), validateUploadRequest, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file was uploaded',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;
    const { projectId, isPublic, metadata } = req.body;

    const uploadResult = await secureStorageService.uploadFile(req.file.buffer, {
      userId,
      projectId,
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      isPublic: isPublic === 'true',
      metadata: {
        ...metadata,
        'original-name': req.file.originalname,
        'content-length': req.file.size.toString(),
      },
    });

    logger.info('File uploaded successfully', {
      userId,
      filename: req.file.originalname,
      size: req.file.size,
      key: uploadResult.key,
    });

    res.json({
      success: true,
      data: {
        key: uploadResult.key,
        url: uploadResult.url,
        size: uploadResult.size,
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in upload endpoint:', error);
    throw error;
  }
});

// GET /storage/download - Generate secure download URL
router.get('/download', authenticate, validateDownloadRequest, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array(),
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;
    const { key, expiresIn, download } = req.query;

    const downloadUrl = await secureStorageService.generateSecureDownloadUrl({
      userId,
      key: key as string,
      expiresIn: expiresIn ? parseInt(expiresIn as string) : undefined,
      responseContentDisposition: download === 'true' ? 'attachment' : undefined,
    });

    logger.info('Download URL generated', { userId, key });

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: expiresIn ? parseInt(expiresIn as string) : 3600,
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in download endpoint:', error);
    throw error;
  }
});

// DELETE /storage/file - Delete file
router.delete('/file', authenticate, async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_KEY',
          message: 'File key is required',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;

    await secureStorageService.deleteFile(userId, key);

    logger.info('File deleted successfully', { userId, key });

    res.json({
      success: true,
      data: {
        message: 'File deleted successfully',
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in delete file endpoint:', error);
    throw error;
  }
});

// GET /storage/metadata - Get file metadata
router.get('/metadata', authenticate, async (req: Request, res: Response) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_KEY',
          message: 'File key is required',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;

    const metadata = await secureStorageService.getFileMetadata(userId, key as string);

    res.json({
      success: true,
      data: { metadata },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in metadata endpoint:', error);
    throw error;
  }
});

// GET /storage/files - List user files
router.get('/files', authenticate, async (req: Request, res: Response) => {
  try {
    const { projectId, prefix, maxKeys, continuationToken } = req.query;
    const userId = req.user!.id;

    const result = await secureStorageService.listUserFiles(userId, {
      projectId: projectId as string,
      prefix: prefix as string,
      maxKeys: maxKeys ? parseInt(maxKeys as string) : undefined,
      continuationToken: continuationToken as string,
    });

    res.json({
      success: true,
      data: result,
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in list files endpoint:', error);
    throw error;
  }
});

// GET /storage/metrics - Get storage usage metrics
router.get('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const metrics = await secureStorageService.getUserStorageMetrics(userId);

    res.json({
      success: true,
      data: { metrics },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in storage metrics endpoint:', error);
    throw error;
  }
});

// DELETE /storage/user-data - Delete all user files (GDPR compliance)
router.delete('/user-data', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // This is a destructive operation, require explicit confirmation
    const { confirm } = req.body;
    if (confirm !== 'DELETE_ALL_MY_FILES') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONFIRMATION_REQUIRED',
          message: 'Please confirm deletion by sending "DELETE_ALL_MY_FILES" in the confirm field',
          requestId: req.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    await secureStorageService.deleteUserFiles(userId);

    logger.info('All user files deleted', { userId });

    res.json({
      success: true,
      data: {
        message: 'All user files have been permanently deleted',
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in delete user data endpoint:', error);
    throw error;
  }
});

export default router;