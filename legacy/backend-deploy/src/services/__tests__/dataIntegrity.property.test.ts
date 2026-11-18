/**
 * Property-Based Test for Data Integrity
 * 
 * **Feature: ai-video-studio, Property 7: Project Lifecycle Management**
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
 * 
 * This property test validates that for any project operation (create, modify, delete),
 * the system maintains proper state transitions, preserves data integrity, and provides
 * appropriate search/filter capabilities across all user scenarios and data combinations.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { PrismaService } from '../prismaService.js'
import { DatabaseService } from '../databaseService.js'
import { initializePrisma, disconnectPrisma, getPrisma } from '../../config/prisma.js'
import type { 
  User, 
  Project, 
  MediaAsset,
  GenerationJob,
  GenerationRequest
} from '../types/index.js';
import { 
  ProjectStatus, 
  UserRole,
  JobStatus,
  OperationType,
  VideoResolution,
  VideoStyle
} from '../types/index.js';

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
    creditBalance: Math.floor(Math.random() * 10000),
    totalCreditsEver: Math.floor(Math.random() * 50000),
    isActive: Math.random() > 0.1, // 90% active users
    role: roles[Math.floor(Math.random() * roles.length)]
  }
}

function generateValidProject(userId: string): Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'assets'> {
  const titles = [
    'Marketing Video', 'Product Demo', 'Tutorial Series', 'Brand Story', 
    'Event Highlights', 'Customer Testimonial', 'Training Material', 'Social Media Content'
  ]
  const descriptions = [
    'A comprehensive video showcasing our latest features',
    'Educational content for new users',
    'Behind-the-scenes look at our company',
    'Step-by-step guide for beginners',
    'Promotional material for upcoming launch'
  ]
  const statuses: ProjectStatus[] = [ProjectStatus.DRAFT, ProjectStatus.GENERATING, ProjectStatus.COMPLETED, ProjectStatus.FAILED]
  
  return {
    userId,
    title: `${titles[Math.floor(Math.random() * titles.length)]} ${Math.floor(Math.random() * 1000)}`,
    description: Math.random() > 0.3 ? descriptions[Math.floor(Math.random() * descriptions.length)] : undefined,
    settings: {
      resolution: [VideoResolution.STANDARD, VideoResolution.HD, VideoResolution.ULTRA][Math.floor(Math.random() * 3)],
      duration: Math.floor(Math.random() * 7200) + 15, // 15 seconds to 2 hours
      style: [VideoStyle.CINEMATIC, VideoStyle.ADVERTISEMENT, VideoStyle.SOCIAL_MEDIA, VideoStyle.EDUCATIONAL][Math.floor(Math.random() * 4)],
      language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)],
      musicEnabled: Math.random() > 0.5,
      voiceoverEnabled: Math.random() > 0.5
    },
    status: statuses[Math.floor(Math.random() * statuses.length)],
    isPublic: Math.random() > 0.7, // 30% public projects
    communityMetrics: {
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      views: Math.floor(Math.random() * 10000)
    }
  }
}

function generateValidMediaAsset(projectId: string): Omit<MediaAsset, 'id' | 'uploadedAt'> {
  const fileTypes = [
    { ext: 'mp4', mime: 'video/mp4', size: () => Math.floor(Math.random() * 100000000) + 1000000 }, // 1-100MB
    { ext: 'jpg', mime: 'image/jpeg', size: () => Math.floor(Math.random() * 5000000) + 100000 }, // 100KB-5MB
    { ext: 'png', mime: 'image/png', size: () => Math.floor(Math.random() * 10000000) + 500000 }, // 500KB-10MB
    { ext: 'wav', mime: 'audio/wav', size: () => Math.floor(Math.random() * 50000000) + 1000000 }, // 1-50MB
    { ext: 'mp3', mime: 'audio/mpeg', size: () => Math.floor(Math.random() * 10000000) + 500000 } // 500KB-10MB
  ]
  
  const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)]
  const filename = `asset_${Math.random().toString(36).substring(2, 15)}.${fileType.ext}`
  
  return {
    projectId,
    filename,
    originalName: `User Asset ${Math.floor(Math.random() * 1000)}.${fileType.ext}`,
    mimeType: fileType.mime,
    size: fileType.size(),
    url: `https://s3.amazonaws.com/ai-video-studio/${filename}`,
    thumbnailUrl: fileType.mime.startsWith('video/') || fileType.mime.startsWith('image/') 
      ? `https://s3.amazonaws.com/ai-video-studio/thumbs/${filename.replace(/\.[^.]+$/, '.jpg')}`
      : undefined
  }
}

function generateValidGenerationJob(projectId: string, userId: string): Omit<GenerationJob, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'> {
  const operationTypes: OperationType[] = [OperationType.VIDEO_GENERATION, OperationType.SCRIPT_GENERATION, OperationType.MUSIC_GENERATION, OperationType.VOICEOVER_GENERATION]
  const statuses: JobStatus[] = [JobStatus.QUEUED, JobStatus.PROCESSING, JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELED]
  
  return {
    projectId,
    userId,
    request: {
      projectId,
      operationType: operationTypes[Math.floor(Math.random() * operationTypes.length)],
      parameters: {
        prompt: `Generate content with ${Math.random().toString(36).substring(2, 15)}`,
        duration: Math.floor(Math.random() * 300) + 15,
        resolution: [VideoResolution.STANDARD, VideoResolution.HD, VideoResolution.ULTRA][Math.floor(Math.random() * 3)],
        style: [VideoStyle.CINEMATIC, VideoStyle.ADVERTISEMENT, VideoStyle.SOCIAL_MEDIA][Math.floor(Math.random() * 3)]
      }
    },
    status: statuses[Math.floor(Math.random() * statuses.length)],
    progress: Math.floor(Math.random() * 101), // 0-100%
    creditsRequired: Math.floor(Math.random() * 500) + 10,
    creditsDeducted: Math.floor(Math.random() * 500),
    estimatedAWSCost: Math.random() * 10 + 0.5, // $0.50 - $10.50
    actualAWSCost: Math.random() > 0.5 ? Math.random() * 12 + 0.3 : undefined, // $0.30 - $12.30
    platformProfit: Math.random() * 5 + 0.25, // $0.25 - $5.25
    resultUrl: Math.random() > 0.4 ? `https://s3.amazonaws.com/results/${Math.random().toString(36).substring(2, 15)}.mp4` : undefined,
    errorMessage: Math.random() > 0.8 ? 'Generation failed due to insufficient resources' : undefined
  }
}

function generateProjectOperation() {
  const operations = ['create', 'update', 'delete', 'search', 'filter'] as const
  return operations[Math.floor(Math.random() * operations.length)]
}

function generateProjectFilters() {
  const statuses: ProjectStatus[] = [ProjectStatus.DRAFT, ProjectStatus.GENERATING, ProjectStatus.COMPLETED, ProjectStatus.FAILED]
  return {
    status: Math.random() > 0.5 ? statuses[Math.floor(Math.random() * statuses.length)] : undefined,
    isPublic: Math.random() > 0.5 ? Math.random() > 0.5 : undefined,
    limit: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 1 : undefined,
    offset: Math.random() > 0.5 ? Math.floor(Math.random() * 100) : undefined
  }
}

function generateConcurrentOperations() {
  const operationCount = Math.floor(Math.random() * 10) + 2 // 2-11 operations
  return Array.from({ length: operationCount }, () => ({
    operation: generateProjectOperation(),
    delay: Math.random() * 1000, // 0-1000ms delay
    data: Math.random() > 0.5 ? generateValidProject('temp-user-id') : undefined
  }))
}

describe('Data Integrity - Property Tests', () => {
  let prismaService: PrismaService
  let databaseService: DatabaseService
  let testUsers: User[] = []

  beforeAll(async () => {
    await initializePrisma()
    prismaService = new PrismaService()
    databaseService = new DatabaseService()
  })

  afterAll(async () => {
    // Clean up test data
    const prisma = getPrisma()
    
    // Clean up in reverse dependency order
    await prisma.generationJob.deleteMany({
      where: { user: { email: { contains: 'test-data-integrity-' } } }
    })
    await prisma.mediaAsset.deleteMany({
      where: { project: { user: { email: { contains: 'test-data-integrity-' } } } }
    })
    await prisma.project.deleteMany({
      where: { user: { email: { contains: 'test-data-integrity-' } } }
    })
    await prisma.user.deleteMany({
      where: { email: { contains: 'test-data-integrity-' } }
    })

    await disconnectPrisma()
  })

  beforeEach(() => {
    testUsers = []
  })

  afterEach(async () => {
    // Clean up test users created in this test
    if (testUsers.length > 0) {
      const prisma = getPrisma()
      const userIds = testUsers.map(u => u.id)
      
      await prisma.generationJob.deleteMany({
        where: { userId: { in: userIds } }
      })
      await prisma.mediaAsset.deleteMany({
        where: { project: { userId: { in: userIds } } }
      })
      await prisma.project.deleteMany({
        where: { userId: { in: userIds } }
      })
      await prisma.user.deleteMany({
        where: { id: { in: userIds } }
      })
    }
  })

  describe('Property 7: Project Lifecycle Management', () => {
    it('should maintain proper state transitions for all project operations', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        project: generateValidProject('temp-user-id'),
        operation: generateProjectOperation(),
        newData: generateValidProject('temp-user-id')
      }), 100)

      for (const { user, project, operation, newData } of testCases) {
        // Property: For any project operation, the system should maintain
        // proper state transitions and data consistency
        
        // Create test user with unique email
        const testUser = await prismaService.createUser({
          ...user,
          email: `test-data-integrity-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`
        })
        testUsers.push(testUser)

        let createdProject: Project | null = null

        try {
          switch (operation) {
            case 'create':
              // Test project creation
              createdProject = await prismaService.createProject({
                ...project,
                userId: testUser.id
              })

              // Verify project was created with correct initial state
              expect(createdProject).toBeTruthy()
              expect(createdProject.userId).toBe(testUser.id)
              expect(createdProject.title).toBe(project.title)
              expect(createdProject.status).toBe(project.status)
              expect(createdProject.isPublic).toBe(project.isPublic)
              expect(createdProject.createdAt).toBeInstanceOf(Date)
              expect(createdProject.updatedAt).toBeInstanceOf(Date)
              
              // Verify community metrics are initialized
              expect(createdProject.communityMetrics).toBeTruthy()
              if (project.status === ProjectStatus.DRAFT && createdProject.communityMetrics) {
                // Draft projects should have zero community metrics
                expect(createdProject.communityMetrics.likes).toBe(0)
                expect(createdProject.communityMetrics.comments).toBe(0)
                expect(createdProject.communityMetrics.shares).toBe(0)
                expect(createdProject.communityMetrics.views).toBe(0)
              }
              break

            case 'update':
              // First create a project to update
              createdProject = await prismaService.createProject({
                ...project,
                userId: testUser.id
              })

              const originalUpdatedAt = createdProject.updatedAt

              // Wait a small amount to ensure timestamp difference
              await new Promise(resolve => setTimeout(resolve, 10))

              // Test project update
              const updatedProject = await prismaService.updateProject(
                createdProject.id,
                {
                  title: newData.title,
                  description: newData.description,
                  settings: newData.settings,
                  status: newData.status,
                  isPublic: newData.isPublic
                }
              )

              // Verify update maintained data integrity
              expect(updatedProject.id).toBe(createdProject.id)
              expect(updatedProject.userId).toBe(testUser.id)
              expect(updatedProject.title).toBe(newData.title)
              expect(updatedProject.description).toBe(newData.description)
              expect(updatedProject.settings).toEqual(newData.settings)
              expect(updatedProject.status).toBe(newData.status)
              expect(updatedProject.isPublic).toBe(newData.isPublic)
              expect(updatedProject.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
              
              // Verify immutable fields weren't changed
              expect(updatedProject.createdAt).toEqual(createdProject.createdAt)
              break

            case 'delete':
              // First create a project to delete
              createdProject = await prismaService.createProject({
                ...project,
                userId: testUser.id
              })

              // Test project deletion
              await prismaService.deleteProject(createdProject.id)

              // Verify project was deleted
              const deletedProject = await prismaService.getUserProjects(testUser.id)
              expect(deletedProject.find(p => p.id === createdProject!.id)).toBeUndefined()
              break

            case 'search':
            case 'filter':
              // Create multiple projects for search/filter testing
              const projects = await Promise.all([
                prismaService.createProject({ ...project, userId: testUser.id, title: 'Search Test 1' }),
                prismaService.createProject({ ...newData, userId: testUser.id, title: 'Search Test 2' })
              ])

              const filters = generateProjectFilters()
              const searchResults = await prismaService.getUserProjects(testUser.id, filters)

              // Verify search/filter results maintain data integrity
              expect(Array.isArray(searchResults)).toBe(true)
              searchResults.forEach(result => {
                expect(result.userId).toBe(testUser.id)
                expect(result.id).toBeTruthy()
                expect(result.title).toBeTruthy()
                expect(result.createdAt).toBeInstanceOf(Date)
                expect(result.updatedAt).toBeInstanceOf(Date)

                // Verify filter criteria are respected
                if (filters.status) {
                  expect(result.status).toBe(filters.status)
                }
                if (filters.isPublic !== undefined) {
                  expect(result.isPublic).toBe(filters.isPublic)
                }
              })

              // Verify limit is respected
              if (filters.limit) {
                expect(searchResults.length).toBeLessThanOrEqual(filters.limit)
              }
              break
          }
        } catch (error: unknown) {
          // Operations should not fail for valid data
          const errorMessage = error instanceof Error ? error.message : String(error)
          throw new Error(`Operation ${operation} failed with valid data: ${errorMessage}`)
        }
      }
    })

    it('should preserve data integrity during concurrent project operations', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        concurrentOps: generateConcurrentOperations()
      }), 50) // Reduced count for performance

      for (const { user, concurrentOps } of testCases) {
        // Property: For any set of concurrent project operations, the system
        // should preserve data integrity without race conditions
        
        // Create test user
        const testUser = await prismaService.createUser({
          ...user,
          email: `test-data-integrity-concurrent-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`
        })
        testUsers.push(testUser)

        // Create initial projects for operations that need them
        const initialProjects = await Promise.all([
          prismaService.createProject({ ...generateValidProject(testUser.id), title: 'Concurrent Test 1' }),
          prismaService.createProject({ ...generateValidProject(testUser.id), title: 'Concurrent Test 2' })
        ])

        // Execute concurrent operations
        const operationPromises = concurrentOps.map(async (op, index) => {
          await new Promise(resolve => setTimeout(resolve, op.delay))
          
          try {
            switch (op.operation) {
              case 'create':
                return await prismaService.createProject({
                  ...generateValidProject(testUser.id),
                  title: `Concurrent Create ${index}`
                })
              
              case 'update':
                if (initialProjects.length > 0) {
                  const projectToUpdate = initialProjects[index % initialProjects.length]
                  return await prismaService.updateProject(projectToUpdate.id, {
                    title: `Updated ${index}`,
                    description: `Updated description ${index}`
                  })
                }
                break
              
              case 'search':
              case 'filter':
                return await prismaService.getUserProjects(testUser.id, generateProjectFilters())
              
              case 'delete':
                // Only delete if we have projects and this isn't the last operation
                if (initialProjects.length > 1 && index < concurrentOps.length - 1) {
                  const projectToDelete = initialProjects.pop()
                  if (projectToDelete) {
                    await prismaService.deleteProject(projectToDelete.id)
                    return { deleted: projectToDelete.id }
                  }
                }
                break
            }
          } catch (error) {
            return { error: error.message, operation: op.operation }
          }
        })

        const results = await Promise.all(operationPromises)

        // Verify no race conditions occurred
        const errors = results.filter(r => r && 'error' in r)
        expect(errors.length).toBe(0)

        // Verify final state consistency
        const finalProjects = await prismaService.getUserProjects(testUser.id)
        finalProjects.forEach(project => {
          expect(project.userId).toBe(testUser.id)
          expect(project.id).toBeTruthy()
          expect(project.title).toBeTruthy()
          expect(project.createdAt).toBeInstanceOf(Date)
          expect(project.updatedAt).toBeInstanceOf(Date)
          expect(project.updatedAt.getTime()).toBeGreaterThanOrEqual(project.createdAt.getTime())
        })
      }
    })

    it('should maintain referential integrity with related entities', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        project: generateValidProject('temp-user-id'),
        assets: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => 
          generateValidMediaAsset('temp-project-id')
        ),
        jobs: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
          generateValidGenerationJob('temp-project-id', 'temp-user-id')
        )
      }), 50) // Reduced count for performance

      for (const { user, project, assets, jobs } of testCases) {
        // Property: For any project with related entities, the system should
        // maintain referential integrity across all operations
        
        // Create test user
        const testUser = await prismaService.createUser({
          ...user,
          email: `test-data-integrity-refs-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`
        })
        testUsers.push(testUser)

        // Create project
        const createdProject = await prismaService.createProject({
          ...project,
          userId: testUser.id
        })

        // Create related media assets
        const createdAssets = await Promise.all(
          assets.map(asset => 
            prismaService.createMediaAsset({
              ...asset,
              projectId: createdProject.id,
              sizeBytes: asset.size
            })
          )
        )

        // Create related generation jobs
        const createdJobs = await Promise.all(
          jobs.map(job => 
            prismaService.createGenerationJob({
              projectId: createdProject.id,
              userId: testUser.id,
              operationType: job.request.operationType,
              requestData: job.request,
              creditsRequired: job.creditsRequired,
              estimatedAWSCost: job.estimatedAWSCost,
              platformProfit: job.platformProfit
            })
          )
        )

        // Verify all relationships are correctly established
        expect(createdAssets.length).toBe(assets.length)
        expect(createdJobs.length).toBe(jobs.length)

        createdAssets.forEach(asset => {
          expect(asset.projectId).toBe(createdProject.id)
          expect(asset.id).toBeTruthy()
          expect(asset.filename).toBeTruthy()
          expect(asset.mimeType).toBeTruthy()
          expect(asset.size).toBeGreaterThan(0)
          expect(asset.url).toBeTruthy()
        })

        createdJobs.forEach(job => {
          expect(job.projectId).toBe(createdProject.id)
          expect(job.userId).toBe(testUser.id)
          expect(job.id).toBeTruthy()
          expect(job.creditsRequired).toBeGreaterThan(0)
          expect(job.estimatedAWSCost).toBeGreaterThan(0)
          expect(job.platformProfit).toBeGreaterThan(0)
          expect(job.createdAt).toBeInstanceOf(Date)
          expect(job.updatedAt).toBeInstanceOf(Date)
        })

        // Test cascading operations
        const projectAssets = await prismaService.getProjectAssets(createdProject.id)
        expect(projectAssets.length).toBe(createdAssets.length)

        // Update project and verify relationships are maintained
        const updatedProject = await prismaService.updateProject(createdProject.id, {
          title: 'Updated Project Title',
          status: ProjectStatus.COMPLETED
        })

        expect(updatedProject.id).toBe(createdProject.id)
        
        // Verify assets still belong to the project after update
        const assetsAfterUpdate = await prismaService.getProjectAssets(updatedProject.id)
        expect(assetsAfterUpdate.length).toBe(createdAssets.length)

        // Test deletion with referential integrity
        await prismaService.deleteProject(createdProject.id)

        // Verify cascading deletion worked correctly
        const assetsAfterDeletion = await prismaService.getProjectAssets(createdProject.id)
        expect(assetsAfterDeletion.length).toBe(0)
      }
    })

    it('should provide appropriate search and filter capabilities', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        projects: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, () => 
          generateValidProject('temp-user-id')
        ),
        searchFilters: generateProjectFilters()
      }), 50) // Reduced count for performance

      for (const { user, projects, searchFilters } of testCases) {
        // Property: For any set of projects and search criteria, the system
        // should provide accurate and consistent search/filter results
        
        // Create test user
        const testUser = await prismaService.createUser({
          ...user,
          email: `test-data-integrity-search-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`
        })
        testUsers.push(testUser)

        // Create projects with varied data for testing filters
        const createdProjects = await Promise.all(
          projects.map((project, index) => {
            const { status, ...projectWithoutStatus } = project
            return prismaService.createProject({
              ...projectWithoutStatus,
              userId: testUser.id,
              title: `Search Test Project ${index}`
            }).then(async (createdProject) => {
              // Update status after creation if needed
              const targetStatus = index % 4 === 0 ? ProjectStatus.DRAFT : 
                                 index % 4 === 1 ? ProjectStatus.GENERATING :
                                 index % 4 === 2 ? ProjectStatus.COMPLETED : ProjectStatus.FAILED
              const targetPublic = index % 3 === 0
              
              if (createdProject.status !== targetStatus || createdProject.isPublic !== targetPublic) {
                return await prismaService.updateProject(createdProject.id, {
                  status: targetStatus,
                  isPublic: targetPublic
                })
              }
              return createdProject
            })
          })
        )

        // Test search without filters
        const allProjects = await prismaService.getUserProjects(testUser.id)
        expect(allProjects.length).toBe(createdProjects.length)
        
        // Verify all projects belong to the user
        allProjects.forEach(project => {
          expect(project.userId).toBe(testUser.id)
          expect(createdProjects.some(cp => cp.id === project.id)).toBe(true)
        })

        // Test search with filters
        const filteredResults = await prismaService.getUserProjects(testUser.id, searchFilters)
        
        // Verify filter results are consistent
        expect(Array.isArray(filteredResults)).toBe(true)
        
        filteredResults.forEach(result => {
          expect(result.userId).toBe(testUser.id)
          
          // Verify status filter
          if (searchFilters.status) {
            expect(result.status).toBe(searchFilters.status)
          }
          
          // Verify public filter
          if (searchFilters.isPublic !== undefined) {
            expect(result.isPublic).toBe(searchFilters.isPublic)
          }
        })

        // Verify limit is respected
        if (searchFilters.limit) {
          expect(filteredResults.length).toBeLessThanOrEqual(searchFilters.limit)
        }

        // Test ordering consistency
        const orderedResults = await prismaService.getUserProjects(testUser.id, { 
          limit: 100 // Get all results
        })
        
        // Results should be ordered by updatedAt desc (most recent first)
        for (let i = 1; i < orderedResults.length; i++) {
          expect(orderedResults[i-1].updatedAt.getTime()).toBeGreaterThanOrEqual(
            orderedResults[i].updatedAt.getTime()
          )
        }

        // Test pagination consistency
        if (createdProjects.length > 2) {
          const page1 = await prismaService.getUserProjects(testUser.id, { limit: 2, offset: 0 })
          const page2 = await prismaService.getUserProjects(testUser.id, { limit: 2, offset: 2 })
          
          expect(page1.length).toBeLessThanOrEqual(2)
          expect(page2.length).toBeLessThanOrEqual(2)
          
          // No overlap between pages
          const page1Ids = page1.map(p => p.id)
          const page2Ids = page2.map(p => p.id)
          const overlap = page1Ids.filter(id => page2Ids.includes(id))
          expect(overlap.length).toBe(0)
        }
      }
    })

    it('should handle edge cases and boundary conditions gracefully', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        edgeCase: ['empty_title', 'max_length_title', 'special_chars', 'null_description', 'large_settings'][
          Math.floor(Math.random() * 5)
        ]
      }), 100)

      for (const { user, edgeCase } of testCases) {
        // Property: For any edge case or boundary condition, the system
        // should handle it gracefully without compromising data integrity
        
        // Create test user
        const testUser = await prismaService.createUser({
          ...user,
          email: `test-data-integrity-edge-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@example.com`
        })
        testUsers.push(testUser)

        let projectData = generateValidProject(testUser.id)

        // Apply edge case modifications
        switch (edgeCase) {
          case 'empty_title':
            // Test with minimal valid title
            projectData.title = 'A' // Minimum length
            break
          
          case 'max_length_title':
            // Test with maximum length title
            projectData.title = 'A'.repeat(255) // Assuming 255 char limit
            break
          
          case 'special_chars':
            // Test with special characters
            projectData.title = 'Test Project with Special Chars: !@#$%^&*()_+-=[]{}|;:,.<>?'
            projectData.description = 'Description with unicode: 🎬🎥📹 and émojis'
            break
          
          case 'null_description':
            // Test with null/undefined description
            projectData.description = undefined
            break
          
          case 'large_settings':
            // Test with large settings object - add as any to bypass strict typing for test
            projectData.settings = {
              ...projectData.settings,
              // Add extra data that might be stored in settings JSON field
              ...(Math.random() > 0.5 ? {
                customFilters: Array.from({ length: 10 }, (_, i) => ({ id: i, value: Math.random() })),
                userPreferences: {
                  tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
                  notes: 'A'.repeat(500)
                }
              } : {})
            } as any
            break
        }

        try {
          // Test project creation with edge case data
          const createdProject = await prismaService.createProject(projectData)
          
          // Verify project was created successfully
          expect(createdProject).toBeTruthy()
          expect(createdProject.userId).toBe(testUser.id)
          expect(createdProject.title).toBe(projectData.title)
          expect(createdProject.description).toBe(projectData.description)
          expect(createdProject.settings).toEqual(projectData.settings)
          
          // Test retrieval maintains data integrity
          const retrievedProject = await prismaService.getUserProjects(testUser.id)
          const foundProject = retrievedProject.find(p => p.id === createdProject.id)
          
          expect(foundProject).toBeTruthy()
          expect(foundProject?.title).toBe(projectData.title)
          expect(foundProject?.description).toBe(projectData.description)
          expect(foundProject?.settings).toEqual(projectData.settings)
          
          // Test update operations work with edge case data
          const updateData = {
            title: `Updated ${projectData.title}`,
            description: projectData.description ? `Updated ${projectData.description}` : 'Added description'
          }
          
          const updatedProject = await prismaService.updateProject(createdProject.id, updateData)
          expect(updatedProject.title).toBe(updateData.title)
          expect(updatedProject.description).toBe(updateData.description)
          
        } catch (error) {
          // Edge cases should not cause system failures
          throw new Error(`Edge case ${edgeCase} caused system failure: ${error}`)
        }
      }
    })
  })
})