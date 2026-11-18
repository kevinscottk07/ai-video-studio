import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { privacyService } from '../services/privacyService.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

// Validation middleware
const validateConsentRequest = [
  body('consentType').isIn(['data_processing', 'marketing', 'analytics', 'cookies']),
  body('granted').isBoolean(),
  body('policyVersion').optional().isString().isLength({ min: 1, max: 10 }),
];

const validateDeletionRequest = [
  body('reason').optional().isString().isLength({ max: 500 }),
];

// POST /privacy/export - Request data export (GDPR Article 15, CCPA Right to Know)
router.post('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const requestedBy = req.user!.email;

    logger.info('Data export requested', { userId, requestedBy });

    const exportRequest = await privacyService.exportUserData(userId, requestedBy);

    res.json({
      success: true,
      data: {
        exportRequest: {
          userId: exportRequest.userId,
          requestDate: exportRequest.requestDate,
          status: exportRequest.status,
          message: 'Your data export request has been received. You will receive an email with a download link within 30 days as required by GDPR.'
        }
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in data export endpoint:', error);
    throw error;
  }
});

// POST /privacy/delete - Request data deletion (GDPR Article 17, CCPA Right to Delete)
router.post('/delete', authenticate, validateDeletionRequest, async (req: Request, res: Response) => {
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
    const requestedBy = req.user!.email;
    const { reason } = req.body;

    logger.info('Data deletion requested', { userId, requestedBy, reason });

    const deletionRequest = await privacyService.requestDataDeletion(userId, requestedBy, reason);

    res.json({
      success: true,
      data: {
        deletionRequest: {
          userId: deletionRequest.userId,
          requestDate: deletionRequest.requestDate,
          scheduledDeletionDate: deletionRequest.scheduledDeletionDate,
          status: deletionRequest.status,
          message: 'Your data deletion request has been received. Your data will be permanently deleted in 30 days. You can cancel this request within the grace period.'
        }
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in data deletion endpoint:', error);
    throw error;
  }
});

// POST /privacy/delete/cancel - Cancel data deletion request
router.post('/delete/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const cancelledBy = req.user!.email;

    logger.info('Data deletion cancellation requested', { userId, cancelledBy });

    await privacyService.cancelDataDeletion(userId, cancelledBy);

    res.json({
      success: true,
      data: {
        message: 'Your data deletion request has been cancelled successfully.'
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in deletion cancellation endpoint:', error);
    throw error;
  }
});

// POST /privacy/consent - Record user consent
router.post('/consent', authenticate, validateConsentRequest, async (req: Request, res: Response) => {
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
    const { consentType, granted, policyVersion = '1.0' } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    logger.info('Consent recorded', { userId, consentType, granted });

    const consentRecord = await privacyService.recordConsent(
      userId,
      consentType,
      granted,
      ipAddress,
      userAgent,
      policyVersion
    );

    res.json({
      success: true,
      data: {
        consentRecord: {
          consentType: consentRecord.consentType,
          granted: consentRecord.granted,
          grantedAt: consentRecord.grantedAt,
          version: consentRecord.version
        }
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in consent endpoint:', error);
    throw error;
  }
});

// GET /privacy/consent - Get user's current consent status
router.get('/consent', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const consentRecords = await privacyService.getUserConsent(userId);

    // Group by consent type and get the latest record for each
    const latestConsents = consentRecords.reduce((acc, record) => {
      if (!acc[record.consentType] || record.grantedAt > acc[record.consentType].grantedAt) {
        acc[record.consentType] = record;
      }
      return acc;
    }, {} as Record<string, any>);

    res.json({
      success: true,
      data: {
        consents: Object.values(latestConsents).map(record => ({
          consentType: record.consentType,
          granted: record.granted,
          grantedAt: record.grantedAt,
          version: record.version
        }))
      },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in get consent endpoint:', error);
    throw error;
  }
});

// GET /privacy/policy - Get current privacy policy information
router.get('/policy', async (req: Request, res: Response) => {
  try {
    // Return current privacy policy information
    const policyInfo = {
      version: '1.0',
      lastUpdated: '2024-01-01T00:00:00Z',
      effectiveDate: '2024-01-01T00:00:00Z',
      compliance: ['GDPR', 'CCPA'],
      dataRetentionPeriod: '7 years',
      contactEmail: 'privacy@ai-video-studio.com',
      dpoEmail: 'dpo@ai-video-studio.com',
      rights: [
        'Right to access your data',
        'Right to rectify inaccurate data',
        'Right to erase your data',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object to processing',
        'Right to withdraw consent'
      ]
    };

    res.json({
      success: true,
      data: { policy: policyInfo },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in privacy policy endpoint:', error);
    throw error;
  }
});

// GET /privacy/requests - Get user's privacy requests status
router.get('/requests', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // In a real implementation, you would fetch from database
    // For now, return empty arrays as placeholders
    const requests = {
      exportRequests: [],
      deletionRequests: []
    };

    res.json({
      success: true,
      data: { requests },
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error in privacy requests endpoint:', error);
    throw error;
  }
});

export default router;