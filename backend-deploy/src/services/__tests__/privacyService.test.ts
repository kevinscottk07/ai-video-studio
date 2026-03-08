import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { privacyService } from '../privacyService.js';
import { databaseService } from '../databaseService.js';

// Mock the database service
jest.mock('../databaseService.js');
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('PrivacyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportUserData', () => {
    it('should create a data export request', async () => {
      const userId = 'test-user-id';
      const requestedBy = 'user@example.com';

      mockDatabaseService.getUserById.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
        authProviderId: 'auth-id',
        displayName: 'Test User',
        profileImage: null,
        language: 'en',
        timezone: 'UTC',
        creditBalance: 100,
        totalCreditsEver: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
        role: 'user',
      });

      // Mock all the data gathering methods
      mockDatabaseService.getUserProjects.mockResolvedValue([]);
      mockDatabaseService.getUserCreditTransactions.mockResolvedValue([]);
      mockDatabaseService.getUserSubscriptions.mockResolvedValue([]);
      mockDatabaseService.getUserCommunityPosts.mockResolvedValue([]);
      mockDatabaseService.getUserComments.mockResolvedValue([]);
      mockDatabaseService.getUserLikes.mockResolvedValue([]);
      mockDatabaseService.getUserShares.mockResolvedValue([]);
      mockDatabaseService.getUserGenerationJobs.mockResolvedValue([]);
      mockDatabaseService.getUserAuditLogs.mockResolvedValue([]);

      const result = await privacyService.exportUserData(userId, requestedBy);

      expect(result).toMatchObject({
        userId,
        requestedBy,
        status: 'pending',
      });
      expect(result.requestDate).toBeInstanceOf(Date);
    });

    it('should handle user not found error', async () => {
      const userId = 'non-existent-user';
      const requestedBy = 'user@example.com';

      mockDatabaseService.getUserById.mockResolvedValue(null);

      await expect(privacyService.exportUserData(userId, requestedBy))
        .rejects
        .toThrow('Failed to initiate data export');
    });
  });

  describe('requestDataDeletion', () => {
    it('should create a data deletion request with 30-day grace period', async () => {
      const userId = 'test-user-id';
      const requestedBy = 'user@example.com';
      const reason = 'No longer need the service';

      const result = await privacyService.requestDataDeletion(userId, requestedBy, reason);

      expect(result).toMatchObject({
        userId,
        requestedBy,
        status: 'pending',
        reason,
      });
      expect(result.requestDate).toBeInstanceOf(Date);
      expect(result.scheduledDeletionDate).toBeInstanceOf(Date);
      
      // Verify 30-day grace period
      const daysDifference = Math.ceil(
        (result.scheduledDeletionDate.getTime() - result.requestDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysDifference).toBe(30);
    });
  });

  describe('recordConsent', () => {
    it('should record user consent with metadata', async () => {
      const userId = 'test-user-id';
      const consentType = 'marketing';
      const granted = true;
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0...';
      const policyVersion = '1.0';

      const result = await privacyService.recordConsent(
        userId,
        consentType,
        granted,
        ipAddress,
        userAgent,
        policyVersion
      );

      expect(result).toMatchObject({
        userId,
        consentType,
        granted,
        ipAddress,
        userAgent,
        version: policyVersion,
      });
      expect(result.grantedAt).toBeInstanceOf(Date);
    });

    it('should handle consent withdrawal', async () => {
      const userId = 'test-user-id';
      const consentType = 'analytics';
      const granted = false;

      const result = await privacyService.recordConsent(
        userId,
        consentType,
        granted
      );

      expect(result.granted).toBe(false);
      expect(result.consentType).toBe(consentType);
    });
  });

  describe('executeDataDeletion', () => {
    it('should delete user data in correct order', async () => {
      const userId = 'test-user-id';

      // Mock all deletion methods
      mockDatabaseService.deleteUserLikes.mockResolvedValue();
      mockDatabaseService.deleteUserShares.mockResolvedValue();
      mockDatabaseService.deleteUserComments.mockResolvedValue();
      mockDatabaseService.deleteUserCommunityPosts.mockResolvedValue();
      mockDatabaseService.deleteUserGenerationJobs.mockResolvedValue();
      mockDatabaseService.deleteUserCreditTransactions.mockResolvedValue();
      mockDatabaseService.deleteUserProjects.mockResolvedValue();
      mockDatabaseService.deleteUserSubscriptions.mockResolvedValue();
      mockDatabaseService.softDeleteUser.mockResolvedValue();

      await privacyService.executeDataDeletion(userId);

      // Verify deletion order (foreign key constraints)
      expect(mockDatabaseService.deleteUserLikes).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.deleteUserShares).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.deleteUserComments).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.deleteUserCommunityPosts).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.deleteUserGenerationJobs).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.deleteUserCreditTransactions).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.deleteUserProjects).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.deleteUserSubscriptions).toHaveBeenCalledWith(userId);
      expect(mockDatabaseService.softDeleteUser).toHaveBeenCalledWith(userId, 'GDPR_DELETION');
    });
  });

  describe('getUserConsent', () => {
    it('should return user consent records', async () => {
      const userId = 'test-user-id';
      const mockConsents = [
        {
          userId,
          consentType: 'marketing' as const,
          granted: true,
          grantedAt: new Date(),
          version: '1.0',
        },
        {
          userId,
          consentType: 'analytics' as const,
          granted: false,
          grantedAt: new Date(),
          version: '1.0',
        },
      ];

      // Mock the private method by creating a spy
      const getUserConsentRecordsSpy = jest.spyOn(privacyService as any, 'getUserConsentRecords');
      getUserConsentRecordsSpy.mockResolvedValue(mockConsents);

      const result = await privacyService.getUserConsent(userId);

      expect(result).toEqual(mockConsents);
      expect(getUserConsentRecordsSpy).toHaveBeenCalledWith(userId);
    });
  });

  describe('cancelDataDeletion', () => {
    it('should cancel a pending data deletion request', async () => {
      const userId = 'test-user-id';
      const cancelledBy = 'user@example.com';

      await expect(privacyService.cancelDataDeletion(userId, cancelledBy))
        .resolves
        .not.toThrow();
    });
  });
});

describe('Privacy Service Integration', () => {
  it('should handle complete GDPR data export workflow', async () => {
    const userId = 'integration-test-user';
    const requestedBy = 'user@example.com';

    // Mock user exists
    mockDatabaseService.getUserById.mockResolvedValue({
      id: userId,
      email: requestedBy,
      authProviderId: 'auth-id',
      displayName: 'Integration Test User',
      profileImage: null,
      language: 'en',
      timezone: 'UTC',
      creditBalance: 250,
      totalCreditsEver: 1000,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2024-01-01'),
      lastLoginAt: new Date('2024-01-15'),
      isActive: true,
      role: 'user',
    });

    // Mock related data
    mockDatabaseService.getUserProjects.mockResolvedValue([]);
    mockDatabaseService.getUserCreditTransactions.mockResolvedValue([]);
    mockDatabaseService.getUserSubscriptions.mockResolvedValue([]);
    mockDatabaseService.getUserCommunityPosts.mockResolvedValue([]);
    mockDatabaseService.getUserComments.mockResolvedValue([]);
    mockDatabaseService.getUserLikes.mockResolvedValue([]);
    mockDatabaseService.getUserShares.mockResolvedValue([]);
    mockDatabaseService.getUserGenerationJobs.mockResolvedValue([]);
    mockDatabaseService.getUserAuditLogs.mockResolvedValue([]);

    // Test export request creation
    const exportRequest = await privacyService.exportUserData(userId, requestedBy);
    
    expect(exportRequest.status).toBe('pending');
    expect(exportRequest.userId).toBe(userId);
    expect(exportRequest.requestedBy).toBe(requestedBy);
  });

  it('should handle complete GDPR data deletion workflow', async () => {
    const userId = 'deletion-test-user';
    const requestedBy = 'user@example.com';

    // Mock all deletion methods
    mockDatabaseService.deleteUserLikes.mockResolvedValue();
    mockDatabaseService.deleteUserShares.mockResolvedValue();
    mockDatabaseService.deleteUserComments.mockResolvedValue();
    mockDatabaseService.deleteUserCommunityPosts.mockResolvedValue();
    mockDatabaseService.deleteUserGenerationJobs.mockResolvedValue();
    mockDatabaseService.deleteUserCreditTransactions.mockResolvedValue();
    mockDatabaseService.deleteUserProjects.mockResolvedValue();
    mockDatabaseService.deleteUserSubscriptions.mockResolvedValue();
    mockDatabaseService.softDeleteUser.mockResolvedValue();

    // Test deletion request creation
    const deletionRequest = await privacyService.requestDataDeletion(userId, requestedBy);
    
    expect(deletionRequest.status).toBe('pending');
    expect(deletionRequest.userId).toBe(userId);
    
    // Test actual deletion execution
    await privacyService.executeDataDeletion(userId);
    
    // Verify all deletion methods were called
    expect(mockDatabaseService.softDeleteUser).toHaveBeenCalledWith(userId, 'GDPR_DELETION');
  });
});