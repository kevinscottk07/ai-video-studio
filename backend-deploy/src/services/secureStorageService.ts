import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { getS3Config } from '../config/aws.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import crypto from 'crypto';
import path from 'path';

export interface SecureUploadOptions {
  userId: string;
  projectId?: string;
  filename: string;
  contentType: string;
  isPublic?: boolean;
  expiresIn?: number; // seconds
  metadata?: Record<string, string>;
}

export interface SecureDownloadOptions {
  userId: string;
  key: string;
  expiresIn?: number; // seconds
  responseContentType?: string;
  responseContentDisposition?: string;
}

export interface StorageMetrics {
  totalSize: number;
  fileCount: number;
  lastAccessed: Date;
  encryption: string;
}

/**
 * Secure storage service providing encrypted S3 storage with time-limited access,
 * CloudFront CDN integration, and comprehensive security controls
 */
export class SecureStorageService {
  private s3Client: S3Client;
  private cloudFrontClient: CloudFrontClient;
  private config = getS3Config();

  constructor() {
    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.cloudFrontClient = new CloudFrontClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  /**
   * Generate secure upload URL with encryption and access controls
   */
  async generateSecureUploadUrl(options: SecureUploadOptions): Promise<{
    uploadUrl: string;
    key: string;
    fields: Record<string, string>;
  }> {
    try {
      // Generate secure key with user isolation
      const key = this.generateSecureKey(options.userId, options.projectId, options.filename);
      
      // Validate file type and size constraints
      this.validateUploadRequest(options);

      // Create upload command with encryption
      const command = new PutObjectCommand({
        Bucket: options.isPublic ? this.config.publicBucket : this.config.bucket,
        Key: key,
        ContentType: options.contentType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'user-id': options.userId,
          'project-id': options.projectId || '',
          'upload-timestamp': new Date().toISOString(),
          'content-hash': crypto.randomBytes(16).toString('hex'),
          ...options.metadata,
        },
        Tagging: `UserId=${options.userId}&ProjectId=${options.projectId || 'none'}&Public=${options.isPublic || false}`,
      });

      // Generate presigned URL
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });

      logger.info('Secure upload URL generated', {
        userId: options.userId,
        projectId: options.projectId,
        key,
        contentType: options.contentType,
        isPublic: options.isPublic,
      });

      return {
        uploadUrl,
        key,
        fields: {
          'Content-Type': options.contentType,
          'x-amz-server-side-encryption': 'AES256',
          'x-amz-meta-user-id': options.userId,
          'x-amz-meta-upload-timestamp': new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Error generating secure upload URL:', error);
      throw createError('Failed to generate upload URL', 500, 'UPLOAD_URL_GENERATION_FAILED');
    }
  }

  /**
   * Generate secure download URL with time-limited access
   */
  async generateSecureDownloadUrl(options: SecureDownloadOptions): Promise<string> {
    try {
      // Verify user has access to this resource
      await this.verifyUserAccess(options.userId, options.key);

      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: options.key,
        ResponseContentType: options.responseContentType,
        ResponseContentDisposition: options.responseContentDisposition,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });

      // Log access for audit trail
      logger.info('Secure download URL generated', {
        userId: options.userId,
        key: options.key,
        expiresIn: options.expiresIn,
      });

      return downloadUrl;
    } catch (error) {
      logger.error('Error generating secure download URL:', error);
      throw createError('Failed to generate download URL', 500, 'DOWNLOAD_URL_GENERATION_FAILED');
    }
  }

  /**
   * Upload file directly with encryption
   */
  async uploadFile(
    buffer: Buffer,
    options: SecureUploadOptions
  ): Promise<{ key: string; url: string; size: number }> {
    try {
      const key = this.generateSecureKey(options.userId, options.projectId, options.filename);
      
      this.validateUploadRequest(options);

      const command = new PutObjectCommand({
        Bucket: options.isPublic ? this.config.publicBucket : this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          'user-id': options.userId,
          'project-id': options.projectId || '',
          'upload-timestamp': new Date().toISOString(),
          'content-hash': crypto.createHash('sha256').update(buffer).digest('hex'),
          ...options.metadata,
        },
        Tagging: `UserId=${options.userId}&ProjectId=${options.projectId || 'none'}&Public=${options.isPublic || false}`,
      });

      await this.s3Client.send(command);

      // Generate URL based on whether it's public or private
      const url = options.isPublic && this.config.cdnDomain
        ? `https://${this.config.cdnDomain}/${key}`
        : await this.generateSecureDownloadUrl({ userId: options.userId, key });

      logger.info('File uploaded successfully', {
        userId: options.userId,
        key,
        size: buffer.length,
        contentType: options.contentType,
        isPublic: options.isPublic,
      });

      return {
        key,
        url,
        size: buffer.length,
      };
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw createError('Failed to upload file', 500, 'FILE_UPLOAD_FAILED');
    }
  }

  /**
   * Delete file securely with access verification
   */
  async deleteFile(userId: string, key: string): Promise<void> {
    try {
      // Verify user has access to delete this resource
      await this.verifyUserAccess(userId, key);

      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);

      // Invalidate CloudFront cache if using CDN
      if (this.config.cdnDomain) {
        await this.invalidateCloudFrontCache([key]);
      }

      logger.info('File deleted successfully', { userId, key });
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw createError('Failed to delete file', 500, 'FILE_DELETE_FAILED');
    }
  }

  /**
   * Get file metadata and verify access
   */
  async getFileMetadata(userId: string, key: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
    metadata: Record<string, string>;
    encryption: string;
  }> {
    try {
      await this.verifyUserAccess(userId, key);

      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata || {},
        encryption: response.ServerSideEncryption || 'none',
      };
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw createError('Failed to get file metadata', 500, 'METADATA_FETCH_FAILED');
    }
  }

  /**
   * List user's files with pagination
   */
  async listUserFiles(
    userId: string,
    options?: {
      projectId?: string;
      prefix?: string;
      maxKeys?: number;
      continuationToken?: string;
    }
  ): Promise<{
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      contentType: string;
    }>;
    nextContinuationToken?: string;
    isTruncated: boolean;
  }> {
    try {
      const prefix = this.getUserPrefix(userId, options?.projectId);
      
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket,
        Prefix: prefix,
        MaxKeys: options?.maxKeys || 100,
        ContinuationToken: options?.continuationToken,
      });

      const response = await this.s3Client.send(command);

      const files = (response.Contents || []).map(obj => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
        contentType: 'unknown', // Would need separate HEAD request for each file
      }));

      return {
        files,
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated || false,
      };
    } catch (error) {
      logger.error('Error listing user files:', error);
      throw createError('Failed to list files', 500, 'FILE_LIST_FAILED');
    }
  }

  /**
   * Get storage usage metrics for a user
   */
  async getUserStorageMetrics(userId: string): Promise<StorageMetrics> {
    try {
      const prefix = this.getUserPrefix(userId);
      
      let totalSize = 0;
      let fileCount = 0;
      let lastAccessed = new Date(0);
      let continuationToken: string | undefined;

      do {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3Client.send(command);

        for (const obj of response.Contents || []) {
          totalSize += obj.Size || 0;
          fileCount++;
          if (obj.LastModified && obj.LastModified > lastAccessed) {
            lastAccessed = obj.LastModified;
          }
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return {
        totalSize,
        fileCount,
        lastAccessed,
        encryption: 'AES256',
      };
    } catch (error) {
      logger.error('Error getting storage metrics:', error);
      throw createError('Failed to get storage metrics', 500, 'METRICS_FETCH_FAILED');
    }
  }

  /**
   * Bulk delete user files (for GDPR compliance)
   */
  async deleteUserFiles(userId: string): Promise<void> {
    try {
      const prefix = this.getUserPrefix(userId);
      const objectsToDelete: { Key: string }[] = [];
      let continuationToken: string | undefined;

      // Collect all objects to delete
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const response = await this.s3Client.send(listCommand);

        for (const obj of response.Contents || []) {
          objectsToDelete.push({ Key: obj.Key! });
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      // Delete objects in batches
      const batchSize = 1000; // S3 limit
      for (let i = 0; i < objectsToDelete.length; i += batchSize) {
        const batch = objectsToDelete.slice(i, i + batchSize);
        
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: this.config.bucket,
          Delete: {
            Objects: batch,
            Quiet: true,
          },
        });

        await this.s3Client.send(deleteCommand);
      }

      logger.info('User files deleted successfully', {
        userId,
        deletedCount: objectsToDelete.length,
      });
    } catch (error) {
      logger.error('Error deleting user files:', error);
      throw createError('Failed to delete user files', 500, 'BULK_DELETE_FAILED');
    }
  }

  // Private helper methods

  private generateSecureKey(userId: string, projectId?: string, filename?: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const sanitizedFilename = filename ? this.sanitizeFilename(filename) : 'file';
    
    if (projectId) {
      return `users/${userId}/projects/${projectId}/${timestamp}-${random}-${sanitizedFilename}`;
    }
    
    return `users/${userId}/files/${timestamp}-${random}-${sanitizedFilename}`;
  }

  private getUserPrefix(userId: string, projectId?: string): string {
    if (projectId) {
      return `users/${userId}/projects/${projectId}/`;
    }
    return `users/${userId}/`;
  }

  private sanitizeFilename(filename: string): string {
    // Remove or replace unsafe characters
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  private validateUploadRequest(options: SecureUploadOptions): void {
    // Validate file size
    if (this.config.maxFileSize && options.metadata?.['content-length']) {
      const size = parseInt(options.metadata['content-length']);
      if (size > this.config.maxFileSize) {
        throw createError(
          `File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
          400,
          'FILE_TOO_LARGE'
        );
      }
    }

    // Validate MIME type
    if (this.config.allowedMimeTypes && !this.config.allowedMimeTypes.includes(options.contentType)) {
      throw createError(
        `File type ${options.contentType} is not allowed`,
        400,
        'INVALID_FILE_TYPE'
      );
    }

    // Validate filename
    if (options.filename.length > 255) {
      throw createError('Filename too long', 400, 'FILENAME_TOO_LONG');
    }
  }

  private async verifyUserAccess(userId: string, key: string): Promise<void> {
    try {
      // Check if the key belongs to the user
      if (!key.startsWith(`users/${userId}/`)) {
        throw createError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Verify the object exists and get its metadata
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Verify user ID in metadata matches
      const metadataUserId = response.Metadata?.['user-id'];
      if (metadataUserId && metadataUserId !== userId) {
        throw createError('Access denied', 403, 'ACCESS_DENIED');
      }
    } catch (error) {
      if (error.name === 'NotFound') {
        throw createError('File not found', 404, 'FILE_NOT_FOUND');
      }
      if (error.code === 'ACCESS_DENIED') {
        throw error;
      }
      logger.error('Error verifying user access:', error);
      throw createError('Access verification failed', 500, 'ACCESS_VERIFICATION_FAILED');
    }
  }

  private async invalidateCloudFrontCache(keys: string[]): Promise<void> {
    try {
      if (!this.config.cdnDomain) return;

      const command = new CreateInvalidationCommand({
        DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch: {
          Paths: {
            Quantity: keys.length,
            Items: keys.map(key => `/${key}`),
          },
          CallerReference: `invalidation-${Date.now()}`,
        },
      });

      await this.cloudFrontClient.send(command);
      logger.info('CloudFront cache invalidated', { keys });
    } catch (error) {
      logger.error('Error invalidating CloudFront cache:', error);
      // Don't throw error, just log it
    }
  }
}

// Export singleton instance
export const secureStorageService = new SecureStorageService();