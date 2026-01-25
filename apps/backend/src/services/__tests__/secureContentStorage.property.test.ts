/**
 * Property-Based Test for Secure Content Storage and Delivery
 * 
 * **Feature: ai-video-studio, Property 11: Secure Content Storage and Delivery**
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.5**
 * 
 * This property test validates that for any content storage operation, the system
 * provides secure encrypted storage, time-limited access URLs, proper access controls,
 * and maintains data integrity across all user scenarios and file types.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { SecureStorageService } from '../secureStorageService.js'
import { databaseService } from '../databaseService.js'
import type { 
  User,
  SecureUploadOptions,
  SecureDownloadOptions,
  StorageMetrics
} from '@ai-video-studio/types'
import { UserRole } from '@ai-video-studio/types'
import crypto from 'crypto'

// Mock dependencies
vi.mock('../databaseService.js')
vi.mock('@aws-sdk/client-s3')
vi.mock('@aws-sdk/s3-request-presigner')
vi.mock('@aws-sdk/client-cloudfront')

const mockDatabaseService = vi.mocked(databaseService)

// Test data generators for property-based testing
function generateTestCases<T>(generator: () => T, count: number = 100): T[] {
  return Array.from({ length: count }, generator)
}

function generateValidUser(): Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'> {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com']
  const names = ['John Doe', 'Jane Smith', 'Alice Johnson', 'Bob Wilson', 'Carol Brown']
  const languages = ['en', 'es', 'fr', 'de', 'zh']
  const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney']
  const roles: UserRole[] = [UserRole.USER, UserRole.ADMIN, UserRole.MODERATOR]
  
  return {
    email: `user${Math.floor(Math.random() * 10000)}@${domains[Math.floor(Math.random() * domains.length)]}`,
    authProviderId: `auth0|${Math.random().toString(36).substring(2, 15)}`,
    displayName: names[Math.floor(Math.random() * names.length)],
    profileImage: Math.random() > 0.5 ? `https://example.com/avatar${Math.floor(Math.random() * 100)}.jpg` : undefined,
    language: languages[Math.floor(Math.random() * languages.length)],
    timezone: timezones[Math.floor(Math.random() * timezones.length)],
    creditBalance: Math.floor(Math.random() * 10000) + 100,
    totalCreditsEver: Math.floor(Math.random() * 50000) + 1000,
    isActive: Math.random() > 0.1,
    role: roles[Math.floor(Math.random() * roles.length)]
  }
}

function generateFileUpload() {
  const contentTypes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mp3',
    'audio/wav',
    'audio/aac',
    'application/json',
    'text/plain'
  ]
  
  const extensions = ['.mp4', '.webm', '.mov', '.jpg', '.png', '.webp', '.mp3', '.wav', '.aac', '.json', '.txt']
  const filenames = ['video', 'image', 'audio', 'document', 'project', 'asset', 'media', 'content']
  
  const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)]
  const extension = extensions[Math.floor(Math.random() * extensions.length)]
  const filename = `${filenames[Math.floor(Math.random() * filenames.length)]}_${Math.floor(Math.random() * 1000)}${extension}`
  
  return {
    filename,
    contentType,
    size: Math.floor(Math.random() * 100 * 1024 * 1024) + 1024, // 1KB to 100MB
    isPublic: Math.random() > 0.7, // 30% public files
    projectId: Math.random() > 0.5 ? `project_${Math.floor(Math.random() * 1000)}` : undefined,
    metadata: {
      'content-length': Math.floor(Math.random() * 100 * 1024 * 1024) + 1024,
      'upload-source': Math.random() > 0.5 ? 'web' : 'mobile',
      'quality': Math.random() > 0.5 ? 'high' : 'standard'
    }
  }
}

function generateAccessScenario() {
  const scenarios = [
    { type: 'owner_access', shouldSucceed: true },
    { type: 'unauthorized_access', shouldSucceed: false },
    { type: 'expired_url', shouldSucceed: false },
    { type: 'malformed_key', shouldSucceed: false },
    { type: 'cross_user_access', shouldSucceed: false }
  ]
  
  return scenarios[Math.floor(Math.random() * scenarios.length)]
}

function generateConcurrentOperations(userId: string) {
  const operationCount = Math.floor(Math.random() * 20) + 5 // 5-24 operations
  return Array.from({ length: operationCount }, (_, i) => ({
    ...generateFileUpload(),
    operationId: `operation_${userId}_${i}_${Date.now()}`,
    delay: Math.random() * 2000, // 0-2000ms delay
    shouldFail: Math.random() < 0.1 // 10% failure rate
  }))
}

function generateStorageUsagePattern(userId: string) {
  const fileCount = Math.floor(Math.random() * 500) + 10 // 10-509 files
  return Array.from({ length: fileCount }, (_, i) => ({
    key: `users/${userId}/files/${Date.now()}-${i}-file.mp4`,
    size: Math.floor(Math.random() * 50 * 1024 * 1024) + 1024, // 1KB to 50MB
    lastModified: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
    contentType: 'video/mp4'
  }))
}

describe('Secure Content Storage and Delivery - Property Tests', () => {
  let storageService: SecureStorageService
  let testUsers: User[] = []

  beforeAll(() => {
    storageService = new SecureStorageService()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    testUsers = []
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Property 11: Secure Content Storage and Delivery', () => {
    it('should provide secure encrypted storage for all file types', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        upload: generateFileUpload()
      }), 100)

      for (const { user, upload } of testCases) {
        // Property: For any file upload, the system should provide secure
        // encrypted storage with proper access controls
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        const uploadOptions: SecureUploadOptions = {
          userId: mockUser.id,
          projectId: upload.projectId,
          filename: upload.filename,
          contentType: upload.contentType,
          isPublic: upload.isPublic,
          metadata: upload.metadata
        }

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        // Test secure upload URL generation
        const uploadResult = await storageService.generateSecureUploadUrl(uploadOptions)

        // Verify upload URL security
        expect(uploadResult).toBeTruthy()
        expect(uploadResult.uploadUrl).toMatch(/^https:\/\//)
        expect(uploadResult.key).toMatch(new RegExp(`^users/${mockUser.id}/`))
        expect(uploadResult.fields).toBeTruthy()

        // Verify encryption is enforced
        expect(uploadResult.fields['x-amz-server-side-encryption']).toBe('AES256')
        expect(uploadResult.fields['x-amz-meta-user-id']).toBe(mockUser.id)
        expect(uploadResult.fields['Content-Type']).toBe(upload.contentType)

        // Verify key structure provides user isolation
        if (upload.projectId) {
          expect(uploadResult.key).toMatch(new RegExp(`^users/${mockUser.id}/projects/${upload.projectId}/`))
        } else {
          expect(uploadResult.key).toMatch(new RegExp(`^users/${mockUser.id}/files/`))
        }

        // Verify key contains timestamp and random component for uniqueness
        expect(uploadResult.key).toMatch(/\d+-[a-f0-9]+-/)

        // Test file upload with buffer
        const testBuffer = crypto.randomBytes(Math.min(upload.size, 1024)) // Limit to 1KB for testing
        const directUploadResult = await storageService.uploadFile(testBuffer, uploadOptions)

        // Verify upload result
        expect(directUploadResult).toBeTruthy()
        expect(directUploadResult.key).toMatch(new RegExp(`^users/${mockUser.id}/`))
        expect(directUploadResult.size).toBe(testBuffer.length)
        expect(directUploadResult.url).toMatch(/^https:\/\//)

        // Verify public vs private URL handling
        if (upload.isPublic) {
          // Public files should use CDN URL if available
          expect(directUploadResult.url).toMatch(/cdn|cloudfront|public/)
        } else {
          // Private files should use signed URLs
          expect(directUploadResult.url).toMatch(/Signature|X-Amz-Signature/)
        }
      }
    })

    it('should generate time-limited access URLs with proper expiration', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        upload: generateFileUpload(),
        expirationTime: Math.floor(Math.random() * 7200) + 300 // 5 minutes to 2 hours
      }), 100)

      for (const { user, upload, expirationTime } of testCases) {
        // Property: For any file access request, the system should generate
        // time-limited URLs that expire at the specified time
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        const fileKey = `users/${mockUser.id}/files/${Date.now()}-test-${upload.filename}`

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        // Mock S3 HeadObject response for access verification
        const mockS3Response = {
          ContentLength: upload.size,
          LastModified: new Date(),
          ContentType: upload.contentType,
          ServerSideEncryption: 'AES256',
          Metadata: {
            'user-id': mockUser.id,
            'upload-timestamp': new Date().toISOString()
          }
        }

        // Mock the S3 client send method
        const mockS3Send = vi.fn().mockResolvedValue(mockS3Response)
        vi.mocked(storageService as any).s3Client = { send: mockS3Send }

        // Test download URL generation with custom expiration
        const downloadOptions: SecureDownloadOptions = {
          userId: mockUser.id,
          key: fileKey,
          expiresIn: expirationTime
        }

        const downloadUrl = await storageService.generateSecureDownloadUrl(downloadOptions)

        // Verify download URL structure
        expect(downloadUrl).toBeTruthy()
        expect(downloadUrl).toMatch(/^https:\/\//)
        expect(downloadUrl).toMatch(/X-Amz-Expires=\d+/)

        // Extract expiration from URL
        const expiresMatch = downloadUrl.match(/X-Amz-Expires=(\d+)/)
        if (expiresMatch) {
          const urlExpiration = parseInt(expiresMatch[1])
          expect(urlExpiration).toBe(expirationTime)
        }

        // Verify signature is present for security
        expect(downloadUrl).toMatch(/X-Amz-Signature=[a-f0-9]+/)

        // Test upload URL expiration
        const uploadOptions: SecureUploadOptions = {
          userId: mockUser.id,
          filename: upload.filename,
          contentType: upload.contentType,
          expiresIn: expirationTime
        }

        const uploadResult = await storageService.generateSecureUploadUrl(uploadOptions)
        
        // Verify upload URL has proper expiration
        expect(uploadResult.uploadUrl).toMatch(/^https:\/\//)
        // Upload URLs use different parameter format but should still be time-limited
        expect(uploadResult.uploadUrl).toMatch(/[?&]X-Amz-Date=/)

        // Test metadata retrieval
        const metadata = await storageService.getFileMetadata(mockUser.id, fileKey)

        // Verify metadata security and completeness
        expect(metadata).toBeTruthy()
        expect(metadata.size).toBe(upload.size)
        expect(metadata.contentType).toBe(upload.contentType)
        expect(metadata.encryption).toBe('AES256')
        expect(metadata.metadata['user-id']).toBe(mockUser.id)
      }
    })

    it('should enforce proper access controls and user isolation', async () => {
      const testCases = generateTestCases(() => ({
        owner: generateValidUser(),
        accessor: generateValidUser(),
        upload: generateFileUpload(),
        accessScenario: generateAccessScenario()
      }), 100)

      for (const { owner, accessor, upload, accessScenario } of testCases) {
        // Property: For any file access attempt, the system should enforce
        // proper access controls and maintain user data isolation
        
        const mockOwner: User = {
          id: `owner_${Math.random().toString(36).substring(2, 15)}`,
          ...owner,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }

        const mockAccessor: User = {
          id: `accessor_${Math.random().toString(36).substring(2, 15)}`,
          ...accessor,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }

        testUsers.push(mockOwner, mockAccessor)

        const fileKey = `users/${mockOwner.id}/files/${Date.now()}-${upload.filename}`

        // Mock S3 responses based on scenario
        const mockS3Response = {
          ContentLength: upload.size,
          LastModified: new Date(),
          ContentType: upload.contentType,
          ServerSideEncryption: 'AES256',
          Metadata: {
            'user-id': mockOwner.id,
            'upload-timestamp': new Date().toISOString()
          }
        }

        const mockS3Send = vi.fn()
        
        if (accessScenario.type === 'owner_access') {
          // Owner should have access
          mockS3Send.mockResolvedValue(mockS3Response)
          mockDatabaseService.getUserById.mockResolvedValue(mockOwner)

          const downloadUrl = await storageService.generateSecureDownloadUrl({
            userId: mockOwner.id,
            key: fileKey
          })

          expect(downloadUrl).toBeTruthy()
          expect(downloadUrl).toMatch(/^https:\/\//)
        } else if (accessScenario.type === 'unauthorized_access') {
          // Non-owner should be denied access
          mockDatabaseService.getUserById.mockResolvedValue(mockAccessor)

          await expect(storageService.generateSecureDownloadUrl({
            userId: mockAccessor.id,
            key: fileKey
          })).rejects.toThrow('Access denied')
        } else if (accessScenario.type === 'cross_user_access') {
          // User trying to access another user's file
          const otherUserKey = `users/${mockAccessor.id}/files/other-file.mp4`
          mockDatabaseService.getUserById.mockResolvedValue(mockOwner)

          await expect(storageService.generateSecureDownloadUrl({
            userId: mockOwner.id,
            key: otherUserKey
          })).rejects.toThrow('Access denied')
        } else if (accessScenario.type === 'malformed_key') {
          // Malformed key should be rejected
          const malformedKey = `invalid/key/structure/${upload.filename}`
          mockDatabaseService.getUserById.mockResolvedValue(mockOwner)

          await expect(storageService.generateSecureDownloadUrl({
            userId: mockOwner.id,
            key: malformedKey
          })).rejects.toThrow('Access denied')
        }

        vi.mocked(storageService as any).s3Client = { send: mockS3Send }

        // Test file deletion access control
        if (accessScenario.shouldSucceed) {
          mockS3Send.mockResolvedValue(mockS3Response)
          mockDatabaseService.getUserById.mockResolvedValue(mockOwner)

          await expect(storageService.deleteFile(mockOwner.id, fileKey)).resolves.not.toThrow()
        } else {
          mockDatabaseService.getUserById.mockResolvedValue(mockAccessor)

          await expect(storageService.deleteFile(mockAccessor.id, fileKey)).rejects.toThrow()
        }
      }
    })

    it('should maintain data integrity across all storage operations', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        uploads: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, () => generateFileUpload())
      }), 50) // Reduced count for performance

      for (const { user, uploads } of testCases) {
        // Property: For any sequence of storage operations, the system should
        // maintain data integrity and consistency
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        const uploadedFiles: Array<{ key: string; size: number; hash: string }> = []

        // Test multiple file uploads
        for (const upload of uploads) {
          const testBuffer = crypto.randomBytes(Math.min(upload.size, 1024))
          const contentHash = crypto.createHash('sha256').update(testBuffer).digest('hex')

          const uploadOptions: SecureUploadOptions = {
            userId: mockUser.id,
            projectId: upload.projectId,
            filename: upload.filename,
            contentType: upload.contentType,
            metadata: {
              ...upload.metadata,
              'content-hash': contentHash
            }
          }

          const uploadResult = await storageService.uploadFile(testBuffer, uploadOptions)

          // Verify upload integrity
          expect(uploadResult.key).toMatch(new RegExp(`^users/${mockUser.id}/`))
          expect(uploadResult.size).toBe(testBuffer.length)

          uploadedFiles.push({
            key: uploadResult.key,
            size: uploadResult.size,
            hash: contentHash
          })
        }

        // Test file listing integrity
        const mockListResponse = {
          Contents: uploadedFiles.map(file => ({
            Key: file.key,
            Size: file.size,
            LastModified: new Date()
          })),
          IsTruncated: false
        }

        const mockS3Send = vi.fn().mockResolvedValue(mockListResponse)
        vi.mocked(storageService as any).s3Client = { send: mockS3Send }

        const fileList = await storageService.listUserFiles(mockUser.id)

        // Verify listing integrity
        expect(fileList.files.length).toBe(uploadedFiles.length)
        fileList.files.forEach((file, index) => {
          expect(file.key).toBe(uploadedFiles[index].key)
          expect(file.size).toBe(uploadedFiles[index].size)
        })

        // Test storage metrics integrity
        const storageMetrics = await storageService.getUserStorageMetrics(mockUser.id)

        // Verify metrics accuracy
        expect(storageMetrics.fileCount).toBe(uploadedFiles.length)
        expect(storageMetrics.totalSize).toBe(uploadedFiles.reduce((sum, file) => sum + file.size, 0))
        expect(storageMetrics.encryption).toBe('AES256')

        // Test file metadata integrity
        for (const uploadedFile of uploadedFiles.slice(0, 3)) { // Test first 3 files
          const mockMetadataResponse = {
            ContentLength: uploadedFile.size,
            LastModified: new Date(),
            ContentType: 'video/mp4',
            ServerSideEncryption: 'AES256',
            Metadata: {
              'user-id': mockUser.id,
              'content-hash': uploadedFile.hash
            }
          }

          mockS3Send.mockResolvedValue(mockMetadataResponse)

          const metadata = await storageService.getFileMetadata(mockUser.id, uploadedFile.key)

          // Verify metadata integrity
          expect(metadata.size).toBe(uploadedFile.size)
          expect(metadata.encryption).toBe('AES256')
          expect(metadata.metadata['user-id']).toBe(mockUser.id)
          expect(metadata.metadata['content-hash']).toBe(uploadedFile.hash)
        }
      }
    })

    it('should handle concurrent storage operations without race conditions', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        concurrentOps: generateConcurrentOperations(`user_${Math.random().toString(36).substring(2, 15)}`)
      }), 30) // Reduced count for performance

      for (const { user, concurrentOps } of testCases) {
        // Property: For any set of concurrent storage operations, the system should
        // maintain consistency without race conditions
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        const operationResults: any[] = []

        // Execute concurrent operations
        const operationPromises = concurrentOps.map(async (op, index) => {
          await new Promise(resolve => setTimeout(resolve, op.delay))
          
          try {
            const uploadOptions: SecureUploadOptions = {
              userId: mockUser.id,
              projectId: op.projectId,
              filename: op.filename,
              contentType: op.contentType,
              metadata: op.metadata
            }

            if (op.shouldFail) {
              // Simulate operation failure
              throw new Error('Simulated storage failure')
            } else {
              // Generate upload URL
              const uploadResult = await storageService.generateSecureUploadUrl(uploadOptions)
              return { ...uploadResult, operationId: op.operationId }
            }
          } catch (error) {
            return { error: error.message, operationId: op.operationId }
          }
        })

        const results = await Promise.all(operationPromises)

        // Verify no race conditions occurred
        const successfulResults = results.filter(r => r && !('error' in r))
        const failedResults = results.filter(r => r && 'error' in r)

        // Verify expected success/failure ratio
        const expectedSuccesses = concurrentOps.filter(op => !op.shouldFail).length
        const expectedFailures = concurrentOps.filter(op => op.shouldFail).length

        expect(successfulResults.length).toBe(expectedSuccesses)
        expect(failedResults.length).toBe(expectedFailures)

        // Verify all successful operations have unique keys
        const keys = successfulResults.map(r => r.key)
        const uniqueKeys = new Set(keys)
        expect(uniqueKeys.size).toBe(keys.length)

        // Verify all keys follow proper structure
        keys.forEach(key => {
          expect(key).toMatch(new RegExp(`^users/${mockUser.id}/`))
          expect(key).toMatch(/\d+-[a-f0-9]+-/) // timestamp-random pattern
        })

        // Verify operation IDs are preserved
        results.forEach((result, index) => {
          if (result) {
            expect(result.operationId).toBe(concurrentOps[index].operationId)
          }
        })
      }
    })

    it('should provide consistent storage metrics and usage tracking', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        storagePattern: generateStorageUsagePattern(`user_${Math.random().toString(36).substring(2, 15)}`)
      }), 50) // Reduced count for performance

      for (const { user, storagePattern } of testCases) {
        // Property: For any storage usage pattern, the system should provide
        // consistent and accurate metrics and usage tracking
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        // Mock S3 list response with storage pattern
        const mockListResponse = {
          Contents: storagePattern.map(file => ({
            Key: file.key,
            Size: file.size,
            LastModified: file.lastModified
          })),
          IsTruncated: false
        }

        const mockS3Send = vi.fn().mockResolvedValue(mockListResponse)
        vi.mocked(storageService as any).s3Client = { send: mockS3Send }

        // Test storage metrics calculation
        const metrics = await storageService.getUserStorageMetrics(mockUser.id)

        // Verify metrics accuracy
        const expectedTotalSize = storagePattern.reduce((sum, file) => sum + file.size, 0)
        const expectedFileCount = storagePattern.length
        const expectedLastAccessed = new Date(Math.max(...storagePattern.map(f => f.lastModified.getTime())))

        expect(metrics.totalSize).toBe(expectedTotalSize)
        expect(metrics.fileCount).toBe(expectedFileCount)
        expect(metrics.lastAccessed.getTime()).toBe(expectedLastAccessed.getTime())
        expect(metrics.encryption).toBe('AES256')

        // Test file listing with pagination
        const pageSize = 10
        const mockPaginatedResponse = {
          Contents: storagePattern.slice(0, pageSize).map(file => ({
            Key: file.key,
            Size: file.size,
            LastModified: file.lastModified
          })),
          IsTruncated: storagePattern.length > pageSize,
          NextContinuationToken: storagePattern.length > pageSize ? 'next-token' : undefined
        }

        mockS3Send.mockResolvedValue(mockPaginatedResponse)

        const paginatedList = await storageService.listUserFiles(mockUser.id, {
          maxKeys: pageSize
        })

        // Verify pagination consistency
        expect(paginatedList.files.length).toBe(Math.min(pageSize, storagePattern.length))
        expect(paginatedList.isTruncated).toBe(storagePattern.length > pageSize)
        
        if (storagePattern.length > pageSize) {
          expect(paginatedList.nextContinuationToken).toBeTruthy()
        }

        // Test project-specific listing
        const projectFiles = storagePattern.filter(file => file.key.includes('/projects/'))
        if (projectFiles.length > 0) {
          const projectId = 'test-project'
          const mockProjectResponse = {
            Contents: projectFiles.map(file => ({
              Key: file.key,
              Size: file.size,
              LastModified: file.lastModified
            })),
            IsTruncated: false
          }

          mockS3Send.mockResolvedValue(mockProjectResponse)

          const projectList = await storageService.listUserFiles(mockUser.id, {
            projectId
          })

          // Verify project filtering works
          expect(projectList.files.length).toBe(projectFiles.length)
          projectList.files.forEach(file => {
            expect(file.key).toMatch(new RegExp(`users/${mockUser.id}/projects/`))
          })
        }

        // Test metrics consistency across multiple calls
        const metrics2 = await storageService.getUserStorageMetrics(mockUser.id)
        expect(metrics2).toEqual(metrics)
      }
    })
  })
})