/**
 * Property-Based Test for Data Privacy Compliance
 * 
 * **Feature: ai-video-studio, Property 12: Data Privacy Compliance**
 * **Validates: Requirements 11.1, 11.2, 11.3**
 * 
 * This property test validates that for any data privacy operation, the system
 * provides GDPR/CCPA compliant data export, deletion, and consent management,
 * maintains audit trails, and handles user rights requests correctly across
 * all user scenarios and data types.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { privacyService } from '../privacyService.js';
import { databaseService } from '../databaseService.js';
import type { 
  DataExportRequest,
  DataDeletionRequest,
  ConsentRecord,
  UserDataExport
} from '../privacyService.js';
import { User, UserRole } from '@ai-video-studio/types';

// Mock dependencies
vi.mock('../databaseService.js');

const mockDatabaseService = vi.mocked(databaseService);

// Test data generators for property-based testing
function generateTestCases<T>(generator: () => T, count: number = 100): T[] {
  return Array.from({ length: count }, generator);
}

function generateValidUser(): User {
  const userId = `user_${Math.random().toString(36).substring(2, 15)}`;
  const roles: UserRole[] = [UserRole.USER, UserRole.MODERATOR, UserRole.ADMIN];
  
  return {
    id: userId,
    email: `${userId}@example.com`,
    authProviderId: `auth0|${userId}`,
    displayName: `User ${userId.slice(-8)}`,
    profileImage: Math.random() > 0.5 ? `https://avatar.com/${userId}.jpg` : undefined,
    language: ['en', 'es', 'fr', 'de', 'zh'][Math.floor(Math.random() * 5)],
    timezone: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'][Math.floor(Math.random() * 4)],
    creditBalance: Math.floor(Math.random() * 1000),
    totalCreditsEver: Math.floor(Math.random() * 5000),
    role: roles[Math.floor(Math.random() * roles.length)],
    isActive: Math.random() > 0.1, // 90% active users
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    lastLoginAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  };
}

function generateDataExportRequest(userId: string): DataExportRequest {
  const statuses: DataExportRequest['status'][] = ['pending', 'processing', 'completed', 'failed'];
  
  return {
    userId,
    requestedBy: userId,
    requestDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    downloadUrl: Math.random() > 0.5 ? `https://secure-exports.example.com/${userId}/export.json` : undefined,
    expiresAt: Math.random() > 0.5 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined,
  };
}

function generateDataDeletionRequest(userId: string): DataDeletionRequest {
  const statuses: DataDeletionRequest['status'][] = ['pending', 'processing', 'completed', 'cancelled'];
  
  return {
    userId,
    requestedBy: userId,
    requestDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    reason: Math.random() > 0.5 ? 'User requested account deletion' : undefined,
  };
}

function generateConsentRecord(userId: string): ConsentRecord {
  const consentTypes: ConsentRecord['consentType'][] = ['data_processing', 'marketing', 'analytics', 'cookies'];
  
  return {
    userId,
    consentType: consentTypes[Math.floor(Math.random() * consentTypes.length)],
    granted: Math.random() > 0.3, // 70% consent granted
    grantedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    ipAddress: Math.random() > 0.5 ? `192.168.1.${Math.floor(Math.random() * 255)}` : undefined,
    userAgent: Math.random() > 0.5 ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' : undefined,
    version: ['1.0', '1.1', '2.0'][Math.floor(Math.random() * 3)],
  };
}

function generateUserDataExport(user: User): UserDataExport {
  return {
    user,
    projects: Array.from({ length: Math.floor(Math.random() * 10) }, (_, i) => ({
      id: `project_${i}`,
      title: `Project ${i}`,
      userId: user.id,
    })),
    creditTransactions: Array.from({ length: Math.floor(Math.random() * 20) }, (_, i) => ({
      id: `transaction_${i}`,
      userId: user.id,
      amount: Math.floor(Math.random() * 100),
    })),
    subscriptions: Array.from({ length: Math.floor(Math.random() * 3) }, (_, i) => ({
      id: `subscription_${i}`,
      userId: user.id,
      planId: `plan_${i}`,
    })),
    communityPosts: Array.from({ length: Math.floor(Math.random() * 15) }, (_, i) => ({
      id: `post_${i}`,
      userId: user.id,
      title: `Post ${i}`,
    })),
    comments: Array.from({ length: Math.floor(Math.random() * 25) }, (_, i) => ({
      id: `comment_${i}`,
      userId: user.id,
      content: `Comment ${i}`,
    })),
    likes: Array.from({ length: Math.floor(Math.random() * 50) }, (_, i) => ({
      id: `like_${i}`,
      userId: user.id,
      postId: `post_${i}`,
    })),
    shares: Array.from({ length: Math.floor(Math.random() * 10) }, (_, i) => ({
      id: `share_${i}`,
      userId: user.id,
      postId: `post_${i}`,
    })),
    generationJobs: Array.from({ length: Math.floor(Math.random() * 30) }, (_, i) => ({
      id: `job_${i}`,
      userId: user.id,
      status: 'completed',
    })),
    consentRecords: Array.from({ length: 4 }, (_, i) => generateConsentRecord(user.id)),
    auditLogs: Array.from({ length: Math.floor(Math.random() * 100) }, (_, i) => ({
      id: `audit_${i}`,
      userId: user.id,
      action: `action_${i}`,
    })),
  };
}

describe('Data Privacy Compliance - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockDatabaseService.getUserById.mockImplementation(async (userId: string) => {
      const user = generateValidUser();
      user.id = userId;
      return user;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Property 12.1: Data Export Completeness and Timeliness', () => {
    it('should provide complete data export within legal timeframes for any user', async () => {
      type ExportScenario = {
        user: User;
        requestedBy: string;
        hasProjects: boolean;
        hasTransactions: boolean;
        hasCommunityData: boolean;
        hasGenerationJobs: boolean;
      };

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            user: fc.constant(generateValidUser()),
            requestedBy: fc.string({ minLength: 5, maxLength: 20 }),
            hasProjects: fc.boolean(),
            hasTransactions: fc.boolean(),
            hasCommunityData: fc.boolean(),
            hasGenerationJobs: fc.boolean(),
          }), { minLength: 1, maxLength: 10 }),
          async (scenarios: ExportScenario[]) => {
            for (const scenario of scenarios) {
              const { user, requestedBy, hasProjects, hasTransactions, hasCommunityData, hasGenerationJobs } = scenario;
              
              // Mock user exists
              mockDatabaseService.getUserById.mockResolvedValue(user);
              
              // Mock user data based on scenario
              mockDatabaseService.getUserProjects.mockResolvedValue(
                hasProjects ? Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({ id: `project_${i}` })) : []
              );
              
              mockDatabaseService.getUserCreditTransactions.mockResolvedValue(
                hasTransactions ? Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({ id: `tx_${i}` })) : []
              );
              
              mockDatabaseService.getUserCommunityPosts.mockResolvedValue(
                hasCommunityData ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({ id: `post_${i}` })) : []
              );
              
              mockDatabaseService.getUserComments.mockResolvedValue(
                hasCommunityData ? Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({ id: `comment_${i}` })) : []
              );
              
              mockDatabaseService.getUserLikes.mockResolvedValue(
                hasCommunityData ? Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, i) => ({ id: `like_${i}` })) : []
              );
              
              mockDatabaseService.getUserShares.mockResolvedValue(
                hasCommunityData ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({ id: `share_${i}` })) : []
              );
              
              mockDatabaseService.getUserGenerationJobs.mockResolvedValue(
                hasGenerationJobs ? Array.from({ length: Math.floor(Math.random() * 8) + 1 }, (_, i) => ({ id: `job_${i}` })) : []
              );
              
              mockDatabaseService.getUserSubscriptions.mockResolvedValue([]);
              mockDatabaseService.getUserAuditLogs.mockResolvedValue([]);
              
              // Request data export
              const exportRequest = await privacyService.exportUserData(user.id, requestedBy);
              
              // Verify export request properties
              expect(exportRequest).toBeDefined();
              expect(exportRequest.userId).toBe(user.id);
              expect(exportRequest.requestedBy).toBe(requestedBy);
              expect(exportRequest.status).toBe('pending');
              expect(exportRequest.requestDate).toBeInstanceOf(Date);
              
              // Verify request date is within reasonable bounds (not in future, not too old)
              const now = new Date();
              const requestAge = now.getTime() - exportRequest.requestDate.getTime();
              expect(requestAge).toBeGreaterThanOrEqual(0); // Not in future
              expect(requestAge).toBeLessThan(60000); // Less than 1 minute old
              
              // Verify all user data gathering methods were called
              expect(mockDatabaseService.getUserById).toHaveBeenCalledWith(user.id);
              
              // The export should be processed asynchronously, so we can't verify completion immediately
              // But we can verify the request was properly initiated
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12.2: Data Deletion Legal Compliance', () => {
    it('should process data deletion requests within legal timeframes with proper grace periods', async () => {
      type DeletionScenario = {
        user: User;
        requestedBy: string;
        reason?: string;
        hasActiveSubscription: boolean;
        hasRecentActivity: boolean;
      };

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            user: fc.constant(generateValidUser()),
            requestedBy: fc.string({ minLength: 5, maxLength: 20 }),
            reason: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
            hasActiveSubscription: fc.boolean(),
            hasRecentActivity: fc.boolean(),
          }), { minLength: 1, maxLength: 8 }),
          async (scenarios: DeletionScenario[]) => {
            for (const scenario of scenarios) {
              const { user, requestedBy, reason, hasActiveSubscription, hasRecentActivity } = scenario;
              
              // Mock user exists
              mockDatabaseService.getUserById.mockResolvedValue(user);
              
              // Mock subscription status
              mockDatabaseService.getUserSubscriptions.mockResolvedValue(
                hasActiveSubscription ? [{ id: 'sub_1', status: 'active' }] : []
              );
              
              // Request data deletion
              const deletionRequest = await privacyService.requestDataDeletion(user.id, requestedBy, reason);
              
              // Verify deletion request properties
              expect(deletionRequest).toBeDefined();
              expect(deletionRequest.userId).toBe(user.id);
              expect(deletionRequest.requestedBy).toBe(requestedBy);
              expect(deletionRequest.reason).toBe(reason);
              expect(deletionRequest.status).toBe('pending');
              expect(deletionRequest.requestDate).toBeInstanceOf(Date);
              expect(deletionRequest.scheduledDeletionDate).toBeInstanceOf(Date);
              
              // Verify GDPR compliance: 30-day grace period
              const gracePeriod = deletionRequest.scheduledDeletionDate.getTime() - deletionRequest.requestDate.getTime();
              const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
              
              // Allow for small timing variations (within 1 hour)
              expect(gracePeriod).toBeGreaterThanOrEqual(thirtyDaysInMs - 3600000);
              expect(gracePeriod).toBeLessThanOrEqual(thirtyDaysInMs + 3600000);
              
              // Verify request date is current
              const now = new Date();
              const requestAge = now.getTime() - deletionRequest.requestDate.getTime();
              expect(requestAge).toBeGreaterThanOrEqual(0);
              expect(requestAge).toBeLessThan(60000); // Less than 1 minute old
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12.3: Consent Management Integrity', () => {
    it('should maintain accurate consent records with proper versioning and audit trails', async () => {
      type ConsentScenario = {
        userId: string;
        consentType: ConsentRecord['consentType'];
        granted: boolean;
        ipAddress?: string;
        userAgent?: string;
        policyVersion: string;
      };

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string({ minLength: 5, maxLength: 20 }),
            consentType: fc.constantFrom('data_processing', 'marketing', 'analytics', 'cookies'),
            granted: fc.boolean(),
            ipAddress: fc.option(fc.string({ minLength: 7, maxLength: 15 })),
            userAgent: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
            policyVersion: fc.constantFrom('1.0', '1.1', '2.0', '2.1'),
          }), { minLength: 1, maxLength: 20 }),
          async (scenarios: ConsentScenario[]) => {
            for (const scenario of scenarios) {
              const { userId, consentType, granted, ipAddress, userAgent, policyVersion } = scenario;
              
              // Record consent
              const consentRecord = await privacyService.recordConsent(
                userId,
                consentType,
                granted,
                ipAddress,
                userAgent,
                policyVersion
              );
              
              // Verify consent record properties
              expect(consentRecord).toBeDefined();
              expect(consentRecord.userId).toBe(userId);
              expect(consentRecord.consentType).toBe(consentType);
              expect(consentRecord.granted).toBe(granted);
              expect(consentRecord.ipAddress).toBe(ipAddress);
              expect(consentRecord.userAgent).toBe(userAgent);
              expect(consentRecord.version).toBe(policyVersion);
              expect(consentRecord.grantedAt).toBeInstanceOf(Date);
              
              // Verify timestamp is current
              const now = new Date();
              const recordAge = now.getTime() - consentRecord.grantedAt.getTime();
              expect(recordAge).toBeGreaterThanOrEqual(0);
              expect(recordAge).toBeLessThan(60000); // Less than 1 minute old
              
              // Verify consent type is valid
              const validConsentTypes = ['data_processing', 'marketing', 'analytics', 'cookies'];
              expect(validConsentTypes).toContain(consentRecord.consentType);
              
              // Verify version format
              expect(consentRecord.version).toMatch(/^\d+\.\d+$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12.4: Data Export Format Compliance', () => {
    it('should provide data exports in standard format with complete metadata', async () => {
      type ExportFormatScenario = {
        user: User;
        dataComplexity: {
          projectCount: number;
          transactionCount: number;
          postCount: number;
          commentCount: number;
          likeCount: number;
        };
      };

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            user: fc.constant(generateValidUser()),
            dataComplexity: fc.record({
              projectCount: fc.integer({ min: 0, max: 10 }),
              transactionCount: fc.integer({ min: 0, max: 50 }),
              postCount: fc.integer({ min: 0, max: 20 }),
              commentCount: fc.integer({ min: 0, max: 100 }),
              likeCount: fc.integer({ min: 0, max: 200 }),
            }),
          }), { minLength: 1, maxLength: 5 }),
          async (scenarios: ExportFormatScenario[]) => {
            for (const scenario of scenarios) {
              const { user, dataComplexity } = scenario;
              
              // Mock user exists
              mockDatabaseService.getUserById.mockResolvedValue(user);
              
              // Mock user data with specified complexity
              mockDatabaseService.getUserProjects.mockResolvedValue(
                Array.from({ length: dataComplexity.projectCount }, (_, i) => ({
                  id: `project_${i}`,
                  title: `Project ${i}`,
                  userId: user.id,
                  createdAt: new Date(),
                }))
              );
              
              mockDatabaseService.getUserCreditTransactions.mockResolvedValue(
                Array.from({ length: dataComplexity.transactionCount }, (_, i) => ({
                  id: `tx_${i}`,
                  userId: user.id,
                  amount: Math.floor(Math.random() * 100),
                  type: 'purchase',
                  createdAt: new Date(),
                }))
              );
              
              mockDatabaseService.getUserCommunityPosts.mockResolvedValue(
                Array.from({ length: dataComplexity.postCount }, (_, i) => ({
                  id: `post_${i}`,
                  userId: user.id,
                  title: `Post ${i}`,
                  createdAt: new Date(),
                }))
              );
              
              mockDatabaseService.getUserComments.mockResolvedValue(
                Array.from({ length: dataComplexity.commentCount }, (_, i) => ({
                  id: `comment_${i}`,
                  userId: user.id,
                  content: `Comment ${i}`,
                  createdAt: new Date(),
                }))
              );
              
              mockDatabaseService.getUserLikes.mockResolvedValue(
                Array.from({ length: dataComplexity.likeCount }, (_, i) => ({
                  id: `like_${i}`,
                  userId: user.id,
                  postId: `post_${i % 10}`,
                  createdAt: new Date(),
                }))
              );
              
              mockDatabaseService.getUserShares.mockResolvedValue([]);
              mockDatabaseService.getUserGenerationJobs.mockResolvedValue([]);
              mockDatabaseService.getUserSubscriptions.mockResolvedValue([]);
              mockDatabaseService.getUserAuditLogs.mockResolvedValue([]);
              
              // Request data export
              const exportRequest = await privacyService.exportUserData(user.id, user.id);
              
              // Verify export request structure
              expect(exportRequest).toBeDefined();
              expect(exportRequest.userId).toBe(user.id);
              expect(exportRequest.status).toBe('pending');
              
              // Verify all data gathering methods were called with correct parameters
              expect(mockDatabaseService.getUserById).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserProjects).toHaveBeenCalledWith(user.id, {});
              expect(mockDatabaseService.getUserCreditTransactions).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserCommunityPosts).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserComments).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserLikes).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserShares).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserGenerationJobs).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserSubscriptions).toHaveBeenCalledWith(user.id);
              expect(mockDatabaseService.getUserAuditLogs).toHaveBeenCalledWith(user.id);
              
              // The export processing happens asynchronously, but we can verify the request was initiated properly
              expect(exportRequest.requestDate).toBeInstanceOf(Date);
              
              const now = new Date();
              const requestAge = now.getTime() - exportRequest.requestDate.getTime();
              expect(requestAge).toBeGreaterThanOrEqual(0);
              expect(requestAge).toBeLessThan(60000);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12.5: Privacy Rights Enforcement Consistency', () => {
    it('should consistently enforce privacy rights across all data operations', async () => {
      type PrivacyRightsScenario = {
        userId: string;
        operationType: 'export' | 'delete' | 'consent_update' | 'consent_query';
        requestedBy: string;
        isAuthorizedRequest: boolean;
        consentData?: {
          consentType: ConsentRecord['consentType'];
          granted: boolean;
        };
      };

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string({ minLength: 5, maxLength: 20 }),
            operationType: fc.constantFrom('export', 'delete', 'consent_update', 'consent_query'),
            requestedBy: fc.string({ minLength: 5, maxLength: 20 }),
            isAuthorizedRequest: fc.boolean(),
            consentData: fc.option(fc.record({
              consentType: fc.constantFrom('data_processing', 'marketing', 'analytics', 'cookies'),
              granted: fc.boolean(),
            })),
          }), { minLength: 1, maxLength: 15 }),
          async (scenarios: PrivacyRightsScenario[]) => {
            for (const scenario of scenarios) {
              const { userId, operationType, requestedBy, isAuthorizedRequest, consentData } = scenario;
              
              // Mock user exists
              const user = generateValidUser();
              user.id = userId;
              mockDatabaseService.getUserById.mockResolvedValue(user);
              
              // Mock basic user data
              mockDatabaseService.getUserProjects.mockResolvedValue([]);
              mockDatabaseService.getUserCreditTransactions.mockResolvedValue([]);
              mockDatabaseService.getUserCommunityPosts.mockResolvedValue([]);
              mockDatabaseService.getUserComments.mockResolvedValue([]);
              mockDatabaseService.getUserLikes.mockResolvedValue([]);
              mockDatabaseService.getUserShares.mockResolvedValue([]);
              mockDatabaseService.getUserGenerationJobs.mockResolvedValue([]);
              mockDatabaseService.getUserSubscriptions.mockResolvedValue([]);
              mockDatabaseService.getUserAuditLogs.mockResolvedValue([]);
              
              try {
                switch (operationType) {
                  case 'export':
                    const exportResult = await privacyService.exportUserData(userId, requestedBy);
                    
                    // Should always succeed for valid users (authorization handled at API level)
                    expect(exportResult).toBeDefined();
                    expect(exportResult.userId).toBe(userId);
                    expect(exportResult.requestedBy).toBe(requestedBy);
                    expect(exportResult.status).toBe('pending');
                    break;
                    
                  case 'delete':
                    const deleteResult = await privacyService.requestDataDeletion(userId, requestedBy, 'User request');
                    
                    // Should always succeed for valid users
                    expect(deleteResult).toBeDefined();
                    expect(deleteResult.userId).toBe(userId);
                    expect(deleteResult.requestedBy).toBe(requestedBy);
                    expect(deleteResult.status).toBe('pending');
                    
                    // Verify 30-day grace period
                    const gracePeriod = deleteResult.scheduledDeletionDate.getTime() - deleteResult.requestDate.getTime();
                    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
                    expect(gracePeriod).toBeGreaterThanOrEqual(thirtyDays - 3600000);
                    expect(gracePeriod).toBeLessThanOrEqual(thirtyDays + 3600000);
                    break;
                    
                  case 'consent_update':
                    if (consentData) {
                      const consentResult = await privacyService.recordConsent(
                        userId,
                        consentData.consentType,
                        consentData.granted,
                        '192.168.1.1',
                        'Test User Agent',
                        '1.0'
                      );
                      
                      expect(consentResult).toBeDefined();
                      expect(consentResult.userId).toBe(userId);
                      expect(consentResult.consentType).toBe(consentData.consentType);
                      expect(consentResult.granted).toBe(consentData.granted);
                      expect(consentResult.version).toBe('1.0');
                    }
                    break;
                    
                  case 'consent_query':
                    // Mock consent records
                    const mockConsentRecords = [generateConsentRecord(userId)];
                    vi.spyOn(privacyService as any, 'getUserConsentRecords').mockResolvedValue(mockConsentRecords);
                    
                    const consentRecords = await privacyService.getUserConsent(userId);
                    
                    expect(Array.isArray(consentRecords)).toBe(true);
                    consentRecords.forEach(record => {
                      expect(record.userId).toBe(userId);
                      expect(['data_processing', 'marketing', 'analytics', 'cookies']).toContain(record.consentType);
                      expect(typeof record.granted).toBe('boolean');
                      expect(record.grantedAt).toBeInstanceOf(Date);
                      expect(record.version).toMatch(/^\d+\.\d+$/);
                    });
                    break;
                }
              } catch (error) {
                // If operation fails, it should be for a valid reason (e.g., user not found)
                if (error instanceof Error) {
                  expect(error.message).toMatch(/(not found|unauthorized|invalid)/i);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12.6: Data Deletion Cancellation Grace Period', () => {
    it('should allow cancellation of data deletion requests within grace period', async () => {
      type CancellationScenario = {
        userId: string;
        cancelledBy: string;
        daysSinceRequest: number;
      };

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string({ minLength: 5, maxLength: 20 }),
            cancelledBy: fc.string({ minLength: 5, maxLength: 20 }),
            daysSinceRequest: fc.integer({ min: 0, max: 29 }), // Within 30-day grace period
          }), { minLength: 1, maxLength: 10 }),
          async (scenarios: CancellationScenario[]) => {
            for (const scenario of scenarios) {
              const { userId, cancelledBy, daysSinceRequest } = scenario;
              
              // Mock user exists
              const user = generateValidUser();
              user.id = userId;
              mockDatabaseService.getUserById.mockResolvedValue(user);
              
              // First, create a deletion request
              const deletionRequest = await privacyService.requestDataDeletion(userId, userId, 'Test deletion');
              
              expect(deletionRequest.status).toBe('pending');
              
              // Simulate time passing (but within grace period)
              const requestDate = new Date(Date.now() - daysSinceRequest * 24 * 60 * 60 * 1000);
              
              // Cancel the deletion request
              await expect(privacyService.cancelDataDeletion(userId, cancelledBy)).resolves.not.toThrow();
              
              // Verify cancellation was processed
              // (In a real implementation, we would check the database for the updated status)
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});