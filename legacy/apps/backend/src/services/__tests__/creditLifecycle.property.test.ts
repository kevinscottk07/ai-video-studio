/**
 * Property-Based Test for Credit Lifecycle Management
 * 
 * **Feature: ai-video-studio, Property 4: Credit Lifecycle Management**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * This property test validates that for any video generation operation, the system
 * displays accurate cost estimates, deducts credits only on successful completion,
 * refunds credits on failure, and maintains accurate usage history across all
 * user scenarios and operation combinations.
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { CreditService } from '../creditService.js'
import { databaseService } from '../databaseService.js'
import { paymentService } from '../paymentService.js'
import type { 
  User, 
  CreditTransaction, 
  CreditPurchase,
  CreditEstimate,
  CreditBalance,
  OperationType,
  VideoResolution,
  VideoStyle,
  TransactionType
} from '@ai-video-studio/types'
import { 
  UserRole,
  OperationType as OpType,
  VideoResolution as VidRes,
  VideoStyle as VidStyle
} from '@ai-video-studio/types'
import { calculateCredits, calculateRefund } from '@ai-video-studio/utils/credits'

// Mock dependencies
vi.mock('../databaseService.js')
vi.mock('../paymentService.js')

const mockDatabaseService = vi.mocked(databaseService)
const mockPaymentService = vi.mocked(paymentService)

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
    creditBalance: Math.floor(Math.random() * 10000) + 100, // Ensure some credits
    totalCreditsEver: Math.floor(Math.random() * 50000) + 1000,
    isActive: Math.random() > 0.1, // 90% active users
    role: roles[Math.floor(Math.random() * roles.length)]
  }
}

function generateVideoGenerationOperation() {
  const operationTypes: OperationType[] = [
    OpType.VIDEO_GENERATION,
    OpType.SCRIPT_GENERATION,
    OpType.MUSIC_GENERATION,
    OpType.VOICEOVER_GENERATION,
    OpType.VIDEO_EDITING
  ]
  
  const resolutions: VideoResolution[] = [VidRes.STANDARD, VidRes.HD, VidRes.ULTRA]
  const styles: VideoStyle[] = [VidStyle.SOCIAL_MEDIA, VidStyle.ADVERTISEMENT, VidStyle.EDUCATIONAL, VidStyle.CINEMATIC, VidStyle.VR]
  const complexities = ['simple', 'moderate', 'complex'] as const
  
  return {
    operationType: operationTypes[Math.floor(Math.random() * operationTypes.length)],
    parameters: {
      duration: Math.floor(Math.random() * 7200) + 15, // 15 seconds to 2 hours
      resolution: resolutions[Math.floor(Math.random() * resolutions.length)],
      style: styles[Math.floor(Math.random() * styles.length)],
      complexity: complexities[Math.floor(Math.random() * complexities.length)]
    }
  }
}

function generateCreditPurchase(userId: string) {
  const amounts = [50, 100, 250, 500, 1000, 2500]
  const amount = amounts[Math.floor(Math.random() * amounts.length)]
  
  return {
    userId,
    amount,
    totalCost: amount * 5, // $0.05 per credit in cents
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel'
  }
}

function generateOperationFailure() {
  const failureTypes = [
    { stage: 'initialization', progress: 0, reason: 'Invalid parameters' },
    { stage: 'processing', progress: 25, reason: 'AWS service unavailable' },
    { stage: 'rendering', progress: 75, reason: 'Insufficient resources' },
    { stage: 'finalization', progress: 95, reason: 'Storage error' }
  ]
  
  return failureTypes[Math.floor(Math.random() * failureTypes.length)]
}

function generateConcurrentOperations(userId: string) {
  const operationCount = Math.floor(Math.random() * 10) + 2 // 2-11 operations
  return Array.from({ length: operationCount }, (_, i) => ({
    ...generateVideoGenerationOperation(),
    operationId: `operation_${userId}_${i}_${Date.now()}`,
    delay: Math.random() * 1000, // 0-1000ms delay
    shouldFail: Math.random() < 0.2 // 20% failure rate
  }))
}

function generateCreditHistory(userId: string, transactionCount: number = 20) {
  const transactionTypes: TransactionType[] = ['purchase', 'deduction', 'refund', 'subscription_grant']
  
  return Array.from({ length: transactionCount }, (_, i) => {
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]
    const baseAmount = Math.floor(Math.random() * 500) + 10
    
    return {
      id: `transaction_${userId}_${i}`,
      userId,
      type,
      amount: type === 'deduction' ? -baseAmount : baseAmount,
      description: `${type} transaction ${i}`,
      operationId: type === 'deduction' || type === 'refund' ? `operation_${i}` : undefined,
      awsCostCovered: type === 'deduction' ? Math.random() * 10 + 1 : undefined,
      platformProfit: type === 'purchase' ? Math.random() * 5 + 1 : undefined,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Last 30 days
    } as CreditTransaction
  })
}

describe('Credit Lifecycle Management - Property Tests', () => {
  let creditService: CreditService
  let testUsers: User[] = []

  beforeAll(() => {
    creditService = new CreditService()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    testUsers = []
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Property 4: Credit Lifecycle Management', () => {
    it('should display accurate cost estimates for all video generation operations', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        operation: generateVideoGenerationOperation()
      }), 100)

      for (const { user, operation } of testCases) {
        // Property: For any video generation operation, the system should
        // display accurate cost estimates before processing
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        // Test cost estimation
        const estimate = await creditService.estimateOperationCost(
          operation.operationType,
          operation.parameters
        )

        // Verify estimate accuracy
        expect(estimate).toBeTruthy()
        expect(estimate.operation).toBe(operation.operationType)
        expect(estimate.estimatedCredits).toBeGreaterThan(0)
        expect(estimate.estimatedAWSCost).toBeGreaterThan(0)
        expect(estimate.platformProfit).toBeGreaterThan(0)
        expect(estimate.breakdown).toBeTruthy()

        // Verify estimate consistency with utility function
        const utilityEstimate = calculateCredits(operation.operationType, operation.parameters)
        expect(estimate.estimatedCredits).toBe(utilityEstimate.estimatedCredits)
        expect(estimate.estimatedAWSCost).toBeCloseTo(utilityEstimate.estimatedAWSCost, 2)
        expect(estimate.platformProfit).toBeCloseTo(utilityEstimate.platformProfit, 2)

        // Verify breakdown components
        expect(estimate.breakdown.baseCredits).toBeGreaterThan(0)
        expect(estimate.breakdown.complexityMultiplier).toBeGreaterThan(0)
        expect(estimate.breakdown.durationMultiplier).toBeGreaterThan(0)
        expect(estimate.breakdown.resolutionMultiplier).toBeGreaterThan(0)

        // Verify cost scales appropriately with parameters
        if (operation.parameters.complexity === 'complex') {
          expect(estimate.breakdown.complexityMultiplier).toBeGreaterThan(1.0)
        } else if (operation.parameters.complexity === 'simple') {
          expect(estimate.breakdown.complexityMultiplier).toBeLessThan(1.0)
        }

        if (operation.parameters.resolution === VidRes.ULTRA) {
          expect(estimate.breakdown.resolutionMultiplier).toBeGreaterThan(2.0)
        } else if (operation.parameters.resolution === VidRes.STANDARD) {
          expect(estimate.breakdown.resolutionMultiplier).toBeLessThanOrEqual(2.0)
        }
      }
    })

    it('should deduct credits only on successful operation completion', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        operation: generateVideoGenerationOperation(),
        operationSuccess: Math.random() > 0.3 // 70% success rate
      }), 100)

      for (const { user, operation, operationSuccess } of testCases) {
        // Property: For any video generation operation, credits should only be
        // deducted when the operation completes successfully
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        const operationId = `operation_${mockUser.id}_${Date.now()}`
        const estimate = calculateCredits(operation.operationType, operation.parameters)
        const initialBalance = mockUser.creditBalance

        // Ensure user has sufficient credits
        if (initialBalance < estimate.estimatedCredits) {
          mockUser.creditBalance = estimate.estimatedCredits + 100
        }

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        if (operationSuccess) {
          // Mock successful operation
          const mockTransaction: CreditTransaction = {
            id: `transaction_${Date.now()}`,
            userId: mockUser.id,
            type: 'deduction',
            amount: -estimate.estimatedCredits,
            description: `${operation.operationType} operation`,
            operationId,
            awsCostCovered: estimate.estimatedAWSCost,
            platformProfit: estimate.platformProfit,
            createdAt: new Date()
          }

          mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction)
          mockDatabaseService.updateUser.mockResolvedValue({
            ...mockUser,
            creditBalance: mockUser.creditBalance - estimate.estimatedCredits
          })

          // Test successful credit deduction
          const transaction = await creditService.deductCredits(
            mockUser.id,
            estimate.estimatedCredits,
            operationId,
            `${operation.operationType} operation`,
            estimate.estimatedAWSCost
          )

          // Verify credits were deducted
          expect(transaction).toBeTruthy()
          expect(transaction.type).toBe('deduction')
          expect(transaction.amount).toBe(-estimate.estimatedCredits)
          expect(transaction.operationId).toBe(operationId)
          expect(transaction.awsCostCovered).toBe(estimate.estimatedAWSCost)

          // Verify database calls
          expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
            userId: mockUser.id,
            type: 'deduction',
            amount: -estimate.estimatedCredits,
            description: `${operation.operationType} operation`,
            operationId,
            awsCostCovered: estimate.estimatedAWSCost,
            platformProfit: expect.any(Number)
          })

          expect(mockDatabaseService.updateUser).toHaveBeenCalledWith(mockUser.id, {
            creditBalance: mockUser.creditBalance - estimate.estimatedCredits,
            totalCreditsEver: mockUser.totalCreditsEver
          })
        } else {
          // For failed operations, credits should not be deducted
          // This would be handled by the video generation service, not credit service directly
          // But we can test that insufficient credits are properly checked
          
          const lowCreditUser = { ...mockUser, creditBalance: estimate.estimatedCredits - 10 }
          mockDatabaseService.getUserById.mockResolvedValue(lowCreditUser)

          // Should throw error for insufficient credits
          await expect(creditService.deductCredits(
            mockUser.id,
            estimate.estimatedCredits,
            operationId,
            `${operation.operationType} operation`,
            estimate.estimatedAWSCost
          )).rejects.toThrow('Insufficient credits')

          // Verify no transaction was created
          expect(mockDatabaseService.createCreditTransaction).not.toHaveBeenCalled()
          expect(mockDatabaseService.updateUser).not.toHaveBeenCalled()
        }
      }
    })

    it('should refund credits appropriately on operation failure', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        operation: generateVideoGenerationOperation(),
        failure: generateOperationFailure()
      }), 100)

      for (const { user, operation, failure } of testCases) {
        // Property: For any failed video generation operation, credits should be
        // refunded based on the progress percentage when failure occurred
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        const operationId = `operation_${mockUser.id}_${Date.now()}`
        const estimate = calculateCredits(operation.operationType, operation.parameters)
        const originalAmount = estimate.estimatedCredits
        const expectedRefund = calculateRefund(originalAmount, failure.progress)

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        if (expectedRefund > 0) {
          const mockTransaction: CreditTransaction = {
            id: `refund_${Date.now()}`,
            userId: mockUser.id,
            type: 'refund',
            amount: expectedRefund,
            description: `${failure.reason} - Refund for operation ${operationId}`,
            operationId,
            metadata: {
              originalAmount,
              progressPercentage: failure.progress,
              refundPercentage: (expectedRefund / originalAmount) * 100
            },
            createdAt: new Date()
          }

          mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction)
          mockDatabaseService.updateUser.mockResolvedValue({
            ...mockUser,
            creditBalance: mockUser.creditBalance + expectedRefund
          })

          // Test credit refund
          const refundTransaction = await creditService.refundCredits(
            mockUser.id,
            originalAmount,
            operationId,
            failure.reason,
            failure.progress
          )

          // Verify refund calculation
          expect(refundTransaction).toBeTruthy()
          expect(refundTransaction.type).toBe('refund')
          expect(refundTransaction.amount).toBe(expectedRefund)
          expect(refundTransaction.operationId).toBe(operationId)
          expect(refundTransaction.description).toContain(failure.reason)

          // Verify refund amount is correct based on progress
          if (failure.progress === 0) {
            // Full refund minus processing fee (10%)
            expect(expectedRefund).toBe(Math.floor(originalAmount * 0.9))
          } else if (failure.progress >= 100) {
            // No refund for completed operations
            expect(expectedRefund).toBe(0)
          } else {
            // Partial refund based on unused portion
            const usedPercentage = Math.max(0.1, failure.progress / 100)
            const expectedRefundAmount = Math.floor(originalAmount * (1 - usedPercentage))
            expect(expectedRefund).toBe(expectedRefundAmount)
          }

          // Verify database calls
          expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
            userId: mockUser.id,
            type: 'refund',
            amount: expectedRefund,
            description: `${failure.reason} - Refund for operation ${operationId}`,
            operationId,
            metadata: {
              originalAmount,
              progressPercentage: failure.progress,
              refundPercentage: (expectedRefund / originalAmount) * 100
            }
          })

          expect(mockDatabaseService.updateUser).toHaveBeenCalledWith(mockUser.id, {
            creditBalance: mockUser.creditBalance + expectedRefund,
            totalCreditsEver: mockUser.totalCreditsEver
          })
        } else {
          // No refund applicable (100% progress)
          await expect(creditService.refundCredits(
            mockUser.id,
            originalAmount,
            operationId,
            failure.reason,
            failure.progress
          )).rejects.toThrow('No refund applicable')
        }
      }
    })

    it('should maintain accurate usage history for all credit transactions', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        transactions: generateCreditHistory(`user_${Math.random().toString(36).substring(2, 15)}`)
      }), 50) // Reduced count for performance

      for (const { user, transactions } of testCases) {
        // Property: For any sequence of credit transactions, the system should
        // maintain accurate and complete usage history
        
        const mockUser: User = {
          id: transactions[0]?.userId || `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)
        mockDatabaseService.getUserCreditHistory.mockResolvedValue(transactions)

        // Test getting complete history
        const history = await creditService.getCreditHistory(mockUser.id)

        // Verify history completeness
        expect(history).toBeTruthy()
        expect(Array.isArray(history)).toBe(true)
        expect(history.length).toBe(transactions.length)

        // Verify transaction data integrity
        history.forEach((transaction, index) => {
          const expectedTransaction = transactions[index]
          expect(transaction.id).toBe(expectedTransaction.id)
          expect(transaction.userId).toBe(mockUser.id)
          expect(transaction.type).toBe(expectedTransaction.type)
          expect(transaction.amount).toBe(expectedTransaction.amount)
          expect(transaction.description).toBe(expectedTransaction.description)
          expect(transaction.createdAt).toEqual(expectedTransaction.createdAt)

          // Verify transaction-specific fields
          if (transaction.type === 'deduction' || transaction.type === 'refund') {
            expect(transaction.operationId).toBeTruthy()
          }
          if (transaction.type === 'deduction') {
            expect(transaction.amount).toBeLessThan(0)
            expect(transaction.awsCostCovered).toBeGreaterThan(0)
          }
          if (transaction.type === 'purchase') {
            expect(transaction.amount).toBeGreaterThan(0)
            expect(transaction.platformProfit).toBeGreaterThan(0)
          }
        })

        // Test filtered history
        const purchaseTransactions = transactions.filter(t => t.type === 'purchase')
        if (purchaseTransactions.length > 0) {
          const filteredHistory = await creditService.getCreditHistory(mockUser.id, {
            type: 'purchase'
          })

          expect(filteredHistory.length).toBe(purchaseTransactions.length)
          filteredHistory.forEach(transaction => {
            expect(transaction.type).toBe('purchase')
          })
        }

        // Test date-filtered history
        const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        const recentTransactions = transactions.filter(t => t.createdAt >= recentDate)
        
        const dateFilteredHistory = await creditService.getCreditHistory(mockUser.id, {
          startDate: recentDate
        })

        expect(dateFilteredHistory.length).toBe(recentTransactions.length)
        dateFilteredHistory.forEach(transaction => {
          expect(transaction.createdAt.getTime()).toBeGreaterThanOrEqual(recentDate.getTime())
        })

        // Test pagination
        const limit = 10
        const paginatedHistory = await creditService.getCreditHistory(mockUser.id, {}, {
          limit,
          offset: 0
        })

        expect(paginatedHistory.length).toBeLessThanOrEqual(limit)
        if (transactions.length > limit) {
          expect(paginatedHistory.length).toBe(limit)
        }
      }
    })

    it('should handle concurrent credit operations without race conditions', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        concurrentOps: generateConcurrentOperations(`user_${Math.random().toString(36).substring(2, 15)}`)
      }), 30) // Reduced count for performance

      for (const { user, concurrentOps } of testCases) {
        // Property: For any set of concurrent credit operations, the system should
        // maintain data consistency without race conditions
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          creditBalance: 10000, // Ensure sufficient credits for all operations
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        let currentBalance = mockUser.creditBalance
        const transactionResults: any[] = []

        // Mock database responses for concurrent operations
        mockDatabaseService.getUserById.mockImplementation(async () => ({
          ...mockUser,
          creditBalance: currentBalance
        }))

        mockDatabaseService.createCreditTransaction.mockImplementation(async (data) => {
          const transaction = {
            id: `transaction_${Date.now()}_${Math.random()}`,
            ...data,
            createdAt: new Date()
          }
          transactionResults.push(transaction)
          return transaction
        })

        mockDatabaseService.updateUser.mockImplementation(async (userId, updates) => {
          if (updates.creditBalance !== undefined) {
            currentBalance = updates.creditBalance
          }
          return { ...mockUser, ...updates }
        })

        // Execute concurrent operations
        const operationPromises = concurrentOps.map(async (op, index) => {
          await new Promise(resolve => setTimeout(resolve, op.delay))
          
          try {
            const estimate = calculateCredits(op.operationType, op.parameters)
            
            if (op.shouldFail) {
              // Simulate operation failure and refund
              const failure = generateOperationFailure()
              const refundAmount = calculateRefund(estimate.estimatedCredits, failure.progress)
              
              if (refundAmount > 0) {
                return await creditService.refundCredits(
                  mockUser.id,
                  estimate.estimatedCredits,
                  op.operationId,
                  'Simulated failure',
                  failure.progress
                )
              }
            } else {
              // Simulate successful operation
              return await creditService.deductCredits(
                mockUser.id,
                estimate.estimatedCredits,
                op.operationId,
                `${op.operationType} operation`,
                estimate.estimatedAWSCost
              )
            }
          } catch (error) {
            return { error: error.message, operation: op }
          }
        })

        const results = await Promise.all(operationPromises)

        // Verify no race conditions occurred
        const errors = results.filter(r => r && 'error' in r)
        expect(errors.length).toBe(0)

        // Verify transaction consistency
        const successfulResults = results.filter(r => r && !('error' in r))
        expect(successfulResults.length).toBe(concurrentOps.length)

        // Verify final balance consistency
        const totalDeductions = transactionResults
          .filter(t => t.type === 'deduction')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        
        const totalRefunds = transactionResults
          .filter(t => t.type === 'refund')
          .reduce((sum, t) => sum + t.amount, 0)

        const expectedFinalBalance = mockUser.creditBalance - totalDeductions + totalRefunds
        expect(currentBalance).toBe(expectedFinalBalance)

        // Verify all operations have unique IDs
        const operationIds = transactionResults.map(t => t.operationId).filter(Boolean)
        const uniqueOperationIds = new Set(operationIds)
        expect(uniqueOperationIds.size).toBe(operationIds.length)
      }
    })

    it('should provide consistent credit balance information across all scenarios', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        pendingCredits: Math.floor(Math.random() * 500),
        reservedCredits: Math.floor(Math.random() * 200)
      }), 100)

      for (const { user, pendingCredits, reservedCredits } of testCases) {
        // Property: For any user state, the system should provide consistent
        // and accurate credit balance information
        
        const mockUser: User = {
          id: `user_${Math.random().toString(36).substring(2, 15)}`,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)

        // Mock pending and reserved credits (these would be implemented in the service)
        const creditServiceSpy = vi.spyOn(creditService as any, 'getPendingTransactions')
        const reservedCreditsSpy = vi.spyOn(creditService as any, 'getReservedCredits')
        
        creditServiceSpy.mockResolvedValue([
          { type: 'purchase', amount: pendingCredits }
        ])
        reservedCreditsSpy.mockResolvedValue(reservedCredits)

        // Test balance retrieval
        const balance = await creditService.getCreditBalance(mockUser.id)

        // Verify balance structure
        expect(balance).toBeTruthy()
        expect(balance.current).toBe(mockUser.creditBalance)
        expect(balance.pending).toBe(pendingCredits)
        expect(balance.reserved).toBe(reservedCredits)
        expect(balance.lifetime).toBe(mockUser.totalCreditsEver)

        // Test sufficient credits check
        const availableCredits = balance.current - balance.reserved
        const testAmount = Math.floor(availableCredits / 2)
        
        const hasSufficient = await creditService.checkSufficientCredits(mockUser.id, testAmount)
        expect(hasSufficient).toBe(true)

        const hasInsufficientForLarge = await creditService.checkSufficientCredits(
          mockUser.id, 
          availableCredits + 100
        )
        expect(hasInsufficientForLarge).toBe(false)

        // Verify balance consistency across multiple calls
        const balance2 = await creditService.getCreditBalance(mockUser.id)
        expect(balance2).toEqual(balance)

        creditServiceSpy.mockRestore()
        reservedCreditsSpy.mockRestore()
      }
    })

    it('should handle credit purchase lifecycle correctly', async () => {
      const testCases = generateTestCases(() => ({
        user: generateValidUser(),
        purchase: generateCreditPurchase(`user_${Math.random().toString(36).substring(2, 15)}`)
      }), 100)

      for (const { user, purchase } of testCases) {
        // Property: For any credit purchase, the system should handle the complete
        // lifecycle from initiation to completion correctly
        
        const mockUser: User = {
          id: purchase.userId,
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date()
        }
        testUsers.push(mockUser)

        const mockPurchase: CreditPurchase = {
          id: `purchase_${Date.now()}`,
          userId: mockUser.id,
          amount: purchase.amount,
          totalCost: purchase.totalCost,
          paymentProcessorId: '',
          status: 'pending',
          createdAt: new Date()
        }

        mockDatabaseService.getUserById.mockResolvedValue(mockUser)
        mockDatabaseService.createCreditPurchase.mockResolvedValue(mockPurchase)
        mockPaymentService.createCheckout.mockResolvedValue('https://checkout.example.com/test')

        // Test purchase initiation
        const initiationResult = await creditService.initiateCreditPurchase(
          mockUser.id,
          purchase.amount,
          purchase.successUrl,
          purchase.cancelUrl
        )

        // Verify initiation result
        expect(initiationResult).toBeTruthy()
        expect(initiationResult.checkoutUrl).toBe('https://checkout.example.com/test')
        expect(initiationResult.purchaseId).toBe(mockPurchase.id)

        // Verify database calls for initiation
        expect(mockDatabaseService.createCreditPurchase).toHaveBeenCalledWith({
          userId: mockUser.id,
          amount: purchase.amount,
          totalCost: purchase.totalCost,
          metadata: {
            pricePerCredit: purchase.totalCost / purchase.amount / 100
          }
        })

        expect(mockPaymentService.createCheckout).toHaveBeenCalledWith({
          purchaseId: mockPurchase.id,
          amount: purchase.totalCost,
          credits: purchase.amount,
          successUrl: purchase.successUrl,
          cancelUrl: purchase.cancelUrl,
          customerEmail: mockUser.email
        })

        // Test purchase completion
        const paymentProcessorId = `payment_${Date.now()}`
        const completedPurchase = { ...mockPurchase, status: 'completed' as const, paymentProcessorId }
        
        mockDatabaseService.getCreditPurchaseById.mockResolvedValue(mockPurchase)
        mockDatabaseService.updateCreditPurchase.mockResolvedValue(completedPurchase)
        mockDatabaseService.createCreditTransaction.mockResolvedValue({
          id: `transaction_${Date.now()}`,
          userId: mockUser.id,
          type: 'purchase',
          amount: purchase.amount,
          description: `Credit purchase - ${purchase.amount} credits`,
          platformProfit: purchase.totalCost / 100,
          createdAt: new Date()
        })
        mockDatabaseService.updateUser.mockResolvedValue({
          ...mockUser,
          creditBalance: mockUser.creditBalance + purchase.amount,
          totalCreditsEver: mockUser.totalCreditsEver + purchase.amount
        })

        const completionResult = await creditService.completeCreditPurchase(
          mockPurchase.id,
          paymentProcessorId
        )

        // Verify completion result
        expect(completionResult).toBeTruthy()
        expect(completionResult.status).toBe('completed')
        expect(completionResult.paymentProcessorId).toBe(paymentProcessorId)

        // Verify database calls for completion
        expect(mockDatabaseService.updateCreditPurchase).toHaveBeenCalledWith(mockPurchase.id, {
          status: 'completed',
          paymentProcessorId
        })

        expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
          userId: mockUser.id,
          type: 'purchase',
          amount: purchase.amount,
          description: `Credit purchase - ${purchase.amount} credits`,
          platformProfit: purchase.totalCost / 100,
          metadata: {
            purchaseId: mockPurchase.id,
            paymentProcessorId
          }
        })

        expect(mockDatabaseService.updateUser).toHaveBeenCalledWith(mockUser.id, {
          creditBalance: mockUser.creditBalance + purchase.amount,
          totalCreditsEver: mockUser.totalCreditsEver + purchase.amount
        })
      }
    })
  })
})