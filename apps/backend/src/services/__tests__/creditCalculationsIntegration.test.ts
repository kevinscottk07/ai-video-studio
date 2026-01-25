import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreditService } from '../creditService.js';
import { databaseService } from '../databaseService.js';
import { paymentService } from '../paymentService.js';
import { 
  TransactionType, 
  OperationType, 
  VideoResolution, 
  VideoStyle,
  UserRole 
} from '@ai-video-studio/types';
import type { 
  User, 
  CreditTransaction, 
  CreditPurchase 
} from '@ai-video-studio/types';

// Mock dependencies
vi.mock('../databaseService.js');
vi.mock('../paymentService.js');

const mockDatabaseService = databaseService as any;
const mockPaymentService = paymentService as any;

describe('CreditService - Integration Tests for Credit Calculations', () => {
  let creditService: CreditService;
  let mockUser: User;

  beforeEach(() => {
    creditService = new CreditService();
    
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      authProviderId: 'auth-123',
      displayName: 'Test User',
      language: 'en',
      timezone: 'UTC',
      creditBalance: 1000,
      totalCreditsEver: 5000,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true,
      role: UserRole.USER,
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('End-to-End Credit Lifecycle', () => {
    it('should handle complete credit lifecycle: purchase -> deduct -> refund', async () => {
      // Step 1: Purchase credits
      const mockPurchase: CreditPurchase = {
        id: 'purchase-123',
        userId: 'user-123',
        amount: 500,
        totalCost: 2500, // $25.00 in cents
        paymentProcessorId: '',
        status: 'pending',
        createdAt: new Date(),
      };

      const mockPurchaseTransaction: CreditTransaction = {
        id: 'purchase-transaction-123',
        userId: 'user-123',
        type: TransactionType.PURCHASE,
        amount: 500,
        description: 'Credit purchase - 500 credits',
        platformProfit: 25,
        createdAt: new Date(),
      };

      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.createCreditPurchase.mockResolvedValue(mockPurchase);
      mockPaymentService.createCheckout.mockResolvedValue('https://checkout.lemonsqueezy.com/test');
      mockDatabaseService.getCreditPurchaseById.mockResolvedValue(mockPurchase);
      mockDatabaseService.updateCreditPurchase.mockResolvedValue({
        ...mockPurchase,
        status: 'completed',
        paymentProcessorId: 'payment-123',
      });
      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockPurchaseTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 1500, // 1000 + 500
        totalCreditsEver: 5500, // 5000 + 500
      });

      // Initiate purchase
      const purchaseResult = await creditService.initiateCreditPurchase(
        'user-123',
        500,
        'https://success.com',
        'https://cancel.com'
      );

      expect(purchaseResult.purchaseId).toBe('purchase-123');

      // Complete purchase
      const completedPurchase = await creditService.completeCreditPurchase('purchase-123', 'payment-123');
      expect(completedPurchase.status).toBe('completed');

      // Step 2: Deduct credits for operation
      const mockDeductionTransaction: CreditTransaction = {
        id: 'deduction-transaction-123',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -200,
        description: 'Video generation - HD quality',
        operationId: 'operation-123',
        awsCostCovered: 6.0,
        platformProfit: 4.0,
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockDeductionTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 1300, // 1500 - 200
      });

      const deductionResult = await creditService.deductCredits(
        'user-123',
        200,
        'operation-123',
        'Video generation - HD quality',
        6.0
      );

      expect(deductionResult.amount).toBe(-200);
      expect(deductionResult.awsCostCovered).toBe(6.0);
      expect(deductionResult.platformProfit).toBe(4.0);

      // Step 3: Refund credits due to operation failure
      const mockRefundTransaction: CreditTransaction = {
        id: 'refund-transaction-123',
        userId: 'user-123',
        type: TransactionType.REFUND,
        amount: 120, // 60% refund for 40% progress
        description: 'Operation failed - Refund for operation operation-123',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockRefundTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 1420, // 1300 + 120
      });

      const refundResult = await creditService.refundCredits(
        'user-123',
        200,
        'operation-123',
        'Operation failed',
        40 // 40% progress
      );

      expect(refundResult.amount).toBe(120);

      // Verify all transactions were created correctly
      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledTimes(3);
      expect(mockDatabaseService.updateUser).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple concurrent operations with credit validation', async () => {
      const userWithLimitedCredits = { ...mockUser, creditBalance: 150 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithLimitedCredits);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      // First operation should succeed
      const mockTransaction1: CreditTransaction = {
        id: 'transaction-1',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -100,
        description: 'Operation 1',
        operationId: 'operation-1',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValueOnce(mockTransaction1);
      mockDatabaseService.updateUser.mockResolvedValueOnce({
        ...userWithLimitedCredits,
        creditBalance: 50,
      });

      const result1 = await creditService.deductCredits('user-123', 100, 'operation-1', 'Operation 1');
      expect(result1.amount).toBe(-100);

      // Update mock to reflect new balance
      const userWithReducedCredits = { ...userWithLimitedCredits, creditBalance: 50 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithReducedCredits);

      // Second operation should fail due to insufficient credits
      await expect(creditService.deductCredits('user-123', 100, 'operation-2', 'Operation 2'))
        .rejects.toThrow('Insufficient credits');

      // Third operation with exact remaining balance should succeed
      const mockTransaction3: CreditTransaction = {
        id: 'transaction-3',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -50,
        description: 'Operation 3',
        operationId: 'operation-3',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValueOnce(mockTransaction3);
      mockDatabaseService.updateUser.mockResolvedValueOnce({
        ...userWithReducedCredits,
        creditBalance: 0,
      });

      const result3 = await creditService.deductCredits('user-123', 50, 'operation-3', 'Operation 3');
      expect(result3.amount).toBe(-50);
    });
  });

  describe('Complex Credit Calculations', () => {
    it('should calculate correct costs for different video generation scenarios', async () => {
      const testScenarios = [
        {
          name: 'Simple social media video',
          params: {
            duration: 30,
            resolution: VideoResolution.STANDARD,
            style: VideoStyle.SOCIAL_MEDIA,
            complexity: 'simple' as const,
          },
          expectedCreditsRange: [15, 25], // Approximate range
        },
        {
          name: 'HD advertisement video',
          params: {
            duration: 60,
            resolution: VideoResolution.HD,
            style: VideoStyle.ADVERTISEMENT,
            complexity: 'moderate' as const,
          },
          expectedCreditsRange: [70, 80], // Approximate range
        },
        {
          name: 'Ultra cinematic video',
          params: {
            duration: 120,
            resolution: VideoResolution.ULTRA,
            style: VideoStyle.CINEMATIC,
            complexity: 'complex' as const,
          },
          expectedCreditsRange: [1100, 1300], // Approximate range
        },
        {
          name: 'VR experience',
          params: {
            duration: 180,
            resolution: VideoResolution.ULTRA,
            style: VideoStyle.VR,
            complexity: 'complex' as const,
          },
          expectedCreditsRange: [2200, 2500], // Approximate range
        },
      ];

      for (const scenario of testScenarios) {
        const estimate = await creditService.estimateOperationCost(
          OperationType.VIDEO_GENERATION,
          scenario.params
        );

        expect(estimate.estimatedCredits).toBeGreaterThanOrEqual(scenario.expectedCreditsRange[0]);
        expect(estimate.estimatedCredits).toBeLessThanOrEqual(scenario.expectedCreditsRange[1]);
        expect(estimate.estimatedAWSCost).toBeGreaterThan(0);
        expect(estimate.platformProfit).toBeGreaterThan(0);
        expect(estimate.breakdown.baseCredits).toBe(50); // Base for video generation

        console.log(`${scenario.name}: ${estimate.estimatedCredits} credits, $${estimate.estimatedAWSCost.toFixed(2)} AWS cost, $${estimate.platformProfit.toFixed(2)} profit`);
      }
    });

    it('should calculate correct costs for different operation types', async () => {
      const operationTypes = [
        { type: OperationType.SCRIPT_GENERATION, expectedBase: 5 },
        { type: OperationType.VIDEO_GENERATION, expectedBase: 50 },
        { type: OperationType.MUSIC_GENERATION, expectedBase: 10 },
        { type: OperationType.VOICEOVER_GENERATION, expectedBase: 15 },
        { type: OperationType.VIDEO_EDITING, expectedBase: 25 },
      ];

      for (const { type, expectedBase } of operationTypes) {
        const estimate = await creditService.estimateOperationCost(type, {});
        
        expect(estimate.operation).toBe(type);
        expect(estimate.breakdown.baseCredits).toBe(expectedBase);
        expect(estimate.estimatedCredits).toBeGreaterThanOrEqual(expectedBase);
        expect(estimate.estimatedAWSCost).toBeGreaterThan(0);
        expect(estimate.platformProfit).toBeGreaterThan(0);
      }
    });
  });

  describe('Credit Balance Edge Cases', () => {
    it('should handle user with exactly zero balance', async () => {
      const userWithZeroBalance = { ...mockUser, creditBalance: 0 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithZeroBalance);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);
      vi.spyOn(creditService as any, 'getPendingTransactions').mockResolvedValue([]);

      const balance = await creditService.getCreditBalance('user-123');
      expect(balance.current).toBe(0);

      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 1);
      expect(hasSufficientCredits).toBe(false);

      await expect(creditService.deductCredits('user-123', 1, 'op-1', 'Test operation'))
        .rejects.toThrow('Insufficient credits');
    });

    it('should handle user with negative balance', async () => {
      const userWithNegativeBalance = { ...mockUser, creditBalance: -50 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithNegativeBalance);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);
      vi.spyOn(creditService as any, 'getPendingTransactions').mockResolvedValue([]);

      const balance = await creditService.getCreditBalance('user-123');
      expect(balance.current).toBe(-50);

      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 1);
      expect(hasSufficientCredits).toBe(false);

      await expect(creditService.deductCredits('user-123', 1, 'op-1', 'Test operation'))
        .rejects.toThrow('Insufficient credits');
    });

    it('should handle very large credit amounts', async () => {
      const userWithLargeBalance = { ...mockUser, creditBalance: 1000000 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithLargeBalance);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      const balance = await creditService.getCreditBalance('user-123');
      expect(balance.current).toBe(1000000);

      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 999999);
      expect(hasSufficientCredits).toBe(true);

      // Test large deduction
      const mockTransaction: CreditTransaction = {
        id: 'large-transaction',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -500000,
        description: 'Large operation',
        operationId: 'large-op',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...userWithLargeBalance,
        creditBalance: 500000,
      });

      const result = await creditService.deductCredits('user-123', 500000, 'large-op', 'Large operation');
      expect(result.amount).toBe(-500000);
    });

    it('should handle fractional credit amounts', async () => {
      const userWithFractionalBalance = { ...mockUser, creditBalance: 10.5 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithFractionalBalance);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      const balance = await creditService.getCreditBalance('user-123');
      expect(balance.current).toBe(10.5);

      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 10.5);
      expect(hasSufficientCredits).toBe(true);

      const hasInsufficientCredits = await creditService.checkSufficientCredits('user-123', 10.6);
      expect(hasInsufficientCredits).toBe(false);
    });
  });

  describe('Refund Calculation Edge Cases', () => {
    it('should handle refunds for different progress percentages', async () => {
      const testCases = [
        { progress: 0, originalAmount: 100, expectedRefund: 90 }, // 10% processing fee
        { progress: 10, originalAmount: 100, expectedRefund: 90 }, // Still 10% minimum
        { progress: 25, originalAmount: 100, expectedRefund: 75 },
        { progress: 50, originalAmount: 100, expectedRefund: 50 },
        { progress: 75, originalAmount: 100, expectedRefund: 25 },
        { progress: 90, originalAmount: 100, expectedRefund: 10 },
        { progress: 95, originalAmount: 100, expectedRefund: 5 },
        { progress: 100, originalAmount: 100, expectedRefund: 0 },
      ];

      for (const testCase of testCases) {
        if (testCase.expectedRefund === 0) {
          await expect(creditService.refundCredits(
            'user-123',
            testCase.originalAmount,
            'operation-123',
            'Test refund',
            testCase.progress
          )).rejects.toThrow('No refund applicable');
        } else {
          const mockTransaction: CreditTransaction = {
            id: `refund-${testCase.progress}`,
            userId: 'user-123',
            type: TransactionType.REFUND,
            amount: testCase.expectedRefund,
            description: `Test refund - Refund for operation operation-123`,
            operationId: 'operation-123',
            createdAt: new Date(),
          };

          mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
          mockDatabaseService.getUserById.mockResolvedValue(mockUser);
          mockDatabaseService.updateUser.mockResolvedValue({
            ...mockUser,
            creditBalance: mockUser.creditBalance + testCase.expectedRefund,
          });

          const result = await creditService.refundCredits(
            'user-123',
            testCase.originalAmount,
            'operation-123',
            'Test refund',
            testCase.progress
          );

          expect(result.amount).toBe(testCase.expectedRefund);
        }
      }
    });

    it('should handle refunds for very small amounts', async () => {
      // Small amounts that might result in 0 refund due to flooring
      const mockTransaction: CreditTransaction = {
        id: 'small-refund',
        userId: 'user-123',
        type: TransactionType.REFUND,
        amount: 0,
        description: 'Small refund - Refund for operation operation-123',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.updateUser.mockResolvedValue(mockUser);

      // This should result in 0 refund due to flooring
      await expect(creditService.refundCredits('user-123', 1, 'operation-123', 'Small refund', 60))
        .rejects.toThrow('No refund applicable');
    });
  });

  describe('Purchase Calculation Edge Cases', () => {
    it('should handle various purchase amounts and calculate correct costs', async () => {
      const purchaseAmounts = [1, 10, 100, 1000, 10000];
      const pricePerCredit = 0.05;

      for (const amount of purchaseAmounts) {
        const expectedCost = Math.round(amount * pricePerCredit * 100); // Convert to cents

        const mockPurchase: CreditPurchase = {
          id: `purchase-${amount}`,
          userId: 'user-123',
          amount,
          totalCost: expectedCost,
          paymentProcessorId: '',
          status: 'pending',
          createdAt: new Date(),
        };

        mockDatabaseService.getUserById.mockResolvedValue(mockUser);
        mockDatabaseService.createCreditPurchase.mockResolvedValue(mockPurchase);
        mockPaymentService.createCheckout.mockResolvedValue('https://checkout.lemonsqueezy.com/test');

        const result = await creditService.initiateCreditPurchase(
          'user-123',
          amount,
          'https://success.com',
          'https://cancel.com'
        );

        expect(result.purchaseId).toBe(`purchase-${amount}`);
        expect(mockDatabaseService.createCreditPurchase).toHaveBeenCalledWith({
          userId: 'user-123',
          amount,
          totalCost: expectedCost,
          metadata: {
            pricePerCredit,
          },
        });
      }
    });

    it('should reject invalid purchase amounts', async () => {
      const invalidAmounts = [0, -1, -100];

      for (const amount of invalidAmounts) {
        await expect(creditService.initiateCreditPurchase(
          'user-123',
          amount,
          'https://success.com',
          'https://cancel.com'
        )).rejects.toThrow('Invalid credit amount');
      }
    });
  });
});