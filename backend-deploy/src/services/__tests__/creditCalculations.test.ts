import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CreditService } from '../creditService.js';
import { databaseService } from '../databaseService.js';
import { paymentService } from '../paymentService.js';
import { calculateCredits, calculateRefund } from '../utils/credits.js';
import { 
  TransactionType, 
  OperationType, 
  VideoResolution, 
  VideoStyle,
  UserRole 
} from '../types/index.js';
import type { 
  User, 
  CreditTransaction, 
  CreditPurchase, 
  CreditBalance,
  CreditEstimate 
} from '../types/index.js';

// Mock dependencies
vi.mock('../databaseService.js');
vi.mock('../paymentService.js');
vi.mock('@ai-video-studio/utils/credits');

const mockDatabaseService = databaseService as any;
const mockPaymentService = paymentService as any;
const mockCalculateCredits = calculateCredits as any;
const mockCalculateRefund = calculateRefund as any;

describe('CreditService - Credit Calculations', () => {
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
      creditBalance: 100,
      totalCreditsEver: 500,
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

  describe('Credit Balance Calculations', () => {
    it('should calculate correct available credits with reserved credits', async () => {
      // Mock user with reserved credits
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      
      // Mock reserved credits (e.g., for ongoing operations)
      const mockReservedCredits = 20;
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(mockReservedCredits);
      vi.spyOn(creditService as any, 'getPendingTransactions').mockResolvedValue([]);

      const balance = await creditService.getCreditBalance('user-123');

      expect(balance).toEqual({
        current: 100,
        pending: 0,
        reserved: 20,
        lifetime: 500,
      });

      // Test available credits calculation
      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 85);
      expect(hasSufficientCredits).toBe(false); // 100 - 20 = 80 available, need 85

      const hasSufficientCreditsLower = await creditService.checkSufficientCredits('user-123', 75);
      expect(hasSufficientCreditsLower).toBe(true); // 100 - 20 = 80 available, need 75
    });

    it('should calculate correct balance with pending purchases', async () => {
      const mockPendingTransactions: CreditTransaction[] = [
        {
          id: 'pending-1',
          userId: 'user-123',
          type: TransactionType.PURCHASE,
          amount: 50,
          description: 'Pending credit purchase',
          createdAt: new Date(),
        },
        {
          id: 'pending-2',
          userId: 'user-123',
          type: TransactionType.DEDUCTION,
          amount: -10,
          description: 'Pending deduction',
          createdAt: new Date(),
        },
      ];

      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      vi.spyOn(creditService as any, 'getPendingTransactions').mockResolvedValue(mockPendingTransactions);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      const balance = await creditService.getCreditBalance('user-123');

      expect(balance).toEqual({
        current: 100,
        pending: 50, // Only purchase transactions count as pending
        reserved: 0,
        lifetime: 500,
      });
    });

    it('should handle edge case of zero balance', async () => {
      const userWithZeroBalance = { ...mockUser, creditBalance: 0 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithZeroBalance);
      vi.spyOn(creditService as any, 'getPendingTransactions').mockResolvedValue([]);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      const balance = await creditService.getCreditBalance('user-123');
      expect(balance.current).toBe(0);

      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 1);
      expect(hasSufficientCredits).toBe(false);
    });

    it('should handle negative balance edge case', async () => {
      const userWithNegativeBalance = { ...mockUser, creditBalance: -10 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithNegativeBalance);
      vi.spyOn(creditService as any, 'getPendingTransactions').mockResolvedValue([]);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      const balance = await creditService.getCreditBalance('user-123');
      expect(balance.current).toBe(-10);

      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 1);
      expect(hasSufficientCredits).toBe(false);
    });
  });

  describe('Credit Deduction Calculations', () => {
    it('should correctly deduct credits and update balance', async () => {
      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -50,
        description: 'Video generation',
        operationId: 'operation-123',
        awsCostCovered: 2.5,
        platformProfit: 0,
        createdAt: new Date(),
      };

      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 50, // 100 - 50
        totalCreditsEver: 500, // Unchanged for deductions
      });

      const result = await creditService.deductCredits(
        'user-123',
        50,
        'operation-123',
        'Video generation',
        2.5
      );

      expect(result.amount).toBe(-50);
      expect(result.awsCostCovered).toBe(2.5);
      expect(result.platformProfit).toBe(0); // 50 * 0.05 - 2.5 = 0

      // Verify balance update was called correctly
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('user-123', {
        creditBalance: 50,
        totalCreditsEver: 500,
      });
    });

    it('should calculate correct platform profit for deductions', async () => {
      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -100,
        description: 'High-value operation',
        operationId: 'operation-123',
        awsCostCovered: 3.0,
        platformProfit: 2.0, // 100 * 0.05 - 3.0 = 2.0
        createdAt: new Date(),
      };

      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 0,
      });

      await creditService.deductCredits(
        'user-123',
        100,
        'operation-123',
        'High-value operation',
        3.0
      );

      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -100,
        description: 'High-value operation',
        operationId: 'operation-123',
        awsCostCovered: 3.0,
        platformProfit: 2.0,
      });
    });

    it('should handle insufficient credits error', async () => {
      const userWithLowBalance = { ...mockUser, creditBalance: 10 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithLowBalance);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      await expect(creditService.deductCredits(
        'user-123',
        50,
        'operation-123',
        'Video generation'
      )).rejects.toThrow('Insufficient credits');

      // Ensure no transaction was created
      expect(mockDatabaseService.createCreditTransaction).not.toHaveBeenCalled();
      expect(mockDatabaseService.updateUser).not.toHaveBeenCalled();
    });

    it('should handle exact balance deduction', async () => {
      const userWithExactBalance = { ...mockUser, creditBalance: 50 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithExactBalance);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -50,
        description: 'Exact balance deduction',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...userWithExactBalance,
        creditBalance: 0,
      });

      const result = await creditService.deductCredits(
        'user-123',
        50,
        'operation-123',
        'Exact balance deduction'
      );

      expect(result.amount).toBe(-50);
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('user-123', {
        creditBalance: 0,
        totalCreditsEver: 500,
      });
    });
  });

  describe('Credit Refund Calculations', () => {
    it('should calculate correct refund based on progress percentage', async () => {
      // Mock the calculateRefund utility function
      mockCalculateRefund.mockReturnValue(25); // 50% refund for 50% progress

      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.REFUND,
        amount: 25,
        description: 'Operation failed - Refund for operation operation-123',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 125, // 100 + 25
      });

      const result = await creditService.refundCredits(
        'user-123',
        50,
        'operation-123',
        'Operation failed',
        50 // 50% progress
      );

      expect(mockCalculateRefund).toHaveBeenCalledWith(50, 50);
      expect(result.amount).toBe(25);

      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
        userId: 'user-123',
        type: TransactionType.REFUND,
        amount: 25,
        description: 'Operation failed - Refund for operation operation-123',
        operationId: 'operation-123',
        metadata: {
          originalAmount: 50,
          progressPercentage: 50,
          refundPercentage: 50,
        },
      });

      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('user-123', {
        creditBalance: 125,
        totalCreditsEver: 500, // Unchanged for refunds
      });
    });

    it('should handle full refund for 0% progress', async () => {
      mockCalculateRefund.mockReturnValue(45); // 90% refund (10% processing fee)

      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.REFUND,
        amount: 45,
        description: 'Operation cancelled - Refund for operation operation-123',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 145,
      });

      const result = await creditService.refundCredits(
        'user-123',
        50,
        'operation-123',
        'Operation cancelled',
        0 // 0% progress
      );

      expect(mockCalculateRefund).toHaveBeenCalledWith(50, 0);
      expect(result.amount).toBe(45);
    });

    it('should handle no refund for completed operations', async () => {
      mockCalculateRefund.mockReturnValue(0); // No refund for 100% progress

      await expect(creditService.refundCredits(
        'user-123',
        50,
        'operation-123',
        'Operation completed',
        100 // 100% progress
      )).rejects.toThrow('No refund applicable');

      expect(mockCalculateRefund).toHaveBeenCalledWith(50, 100);
      expect(mockDatabaseService.createCreditTransaction).not.toHaveBeenCalled();
      expect(mockDatabaseService.updateUser).not.toHaveBeenCalled();
    });

    it('should handle partial refund for partially completed operations', async () => {
      mockCalculateRefund.mockReturnValue(10); // Small refund for 80% progress

      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.REFUND,
        amount: 10,
        description: 'Operation interrupted - Refund for operation operation-123',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 110,
      });

      const result = await creditService.refundCredits(
        'user-123',
        50,
        'operation-123',
        'Operation interrupted',
        80 // 80% progress
      );

      expect(result.amount).toBe(10);
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('user-123', {
        creditBalance: 110,
        totalCreditsEver: 500,
      });
    });
  });

  describe('Credit Purchase Calculations', () => {
    it('should calculate correct purchase cost and create transaction', async () => {
      const mockPurchase: CreditPurchase = {
        id: 'purchase-123',
        userId: 'user-123',
        amount: 100,
        totalCost: 500, // $5.00 in cents (100 credits * $0.05)
        paymentProcessorId: '',
        status: 'pending',
        createdAt: new Date(),
      };

      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.createCreditPurchase.mockResolvedValue(mockPurchase);
      mockPaymentService.createCheckout.mockResolvedValue('https://checkout.lemonsqueezy.com/test');

      const result = await creditService.initiateCreditPurchase(
        'user-123',
        100,
        'https://success.com',
        'https://cancel.com'
      );

      expect(result.purchaseId).toBe('purchase-123');
      expect(mockDatabaseService.createCreditPurchase).toHaveBeenCalledWith({
        userId: 'user-123',
        amount: 100,
        totalCost: 500, // 100 * $0.05 * 100 cents
        metadata: {
          pricePerCredit: 0.05,
        },
      });
    });

    it('should handle different credit amounts correctly', async () => {
      const testCases = [
        { credits: 50, expectedCost: 250 }, // $2.50
        { credits: 200, expectedCost: 1000 }, // $10.00
        { credits: 1000, expectedCost: 5000 }, // $50.00
      ];

      for (const testCase of testCases) {
        const mockPurchase: CreditPurchase = {
          id: `purchase-${testCase.credits}`,
          userId: 'user-123',
          amount: testCase.credits,
          totalCost: testCase.expectedCost,
          paymentProcessorId: '',
          status: 'pending',
          createdAt: new Date(),
        };

        mockDatabaseService.getUserById.mockResolvedValue(mockUser);
        mockDatabaseService.createCreditPurchase.mockResolvedValue(mockPurchase);
        mockPaymentService.createCheckout.mockResolvedValue('https://checkout.lemonsqueezy.com/test');

        await creditService.initiateCreditPurchase(
          'user-123',
          testCase.credits,
          'https://success.com',
          'https://cancel.com'
        );

        expect(mockDatabaseService.createCreditPurchase).toHaveBeenCalledWith({
          userId: 'user-123',
          amount: testCase.credits,
          totalCost: testCase.expectedCost,
          metadata: {
            pricePerCredit: 0.05,
          },
        });
      }
    });

    it('should complete purchase and update balance correctly', async () => {
      const mockPurchase: CreditPurchase = {
        id: 'purchase-123',
        userId: 'user-123',
        amount: 100,
        totalCost: 500,
        paymentProcessorId: '',
        status: 'pending',
        createdAt: new Date(),
      };

      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.PURCHASE,
        amount: 100,
        description: 'Credit purchase - 100 credits',
        platformProfit: 5, // $5.00 total cost
        createdAt: new Date(),
      };

      mockDatabaseService.getCreditPurchaseById.mockResolvedValue(mockPurchase);
      mockDatabaseService.updateCreditPurchase.mockResolvedValue({
        ...mockPurchase,
        status: 'completed',
        paymentProcessorId: 'payment-123',
      });
      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 200, // 100 + 100
        totalCreditsEver: 600, // 500 + 100
      });

      const result = await creditService.completeCreditPurchase('purchase-123', 'payment-123');

      expect(result.status).toBe('completed');
      
      // Verify balance update includes both current balance and lifetime total
      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('user-123', {
        creditBalance: 200,
        totalCreditsEver: 600,
      });

      // Verify transaction creation with correct platform profit
      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
        userId: 'user-123',
        type: TransactionType.PURCHASE,
        amount: 100,
        description: 'Credit purchase - 100 credits',
        platformProfit: 5, // $5.00 total cost
        metadata: {
          purchaseId: 'purchase-123',
          paymentProcessorId: 'payment-123',
        },
      });
    });

    it('should handle invalid purchase amounts', async () => {
      const invalidAmounts = [0, -10, -100];

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

  describe('Operation Cost Estimation', () => {
    it('should estimate costs for different operation types', async () => {
      const mockEstimate: CreditEstimate = {
        operation: OperationType.VIDEO_GENERATION,
        estimatedCredits: 100,
        estimatedAWSCost: 3.0,
        platformProfit: 2.0,
        breakdown: {
          baseCredits: 50,
          complexityMultiplier: 1.0,
          durationMultiplier: 2.0,
          resolutionMultiplier: 1.0,
        },
      };

      mockCalculateCredits.mockReturnValue(mockEstimate);

      const result = await creditService.estimateOperationCost(
        OperationType.VIDEO_GENERATION,
        {
          duration: 120,
          resolution: VideoResolution.HD,
          style: VideoStyle.CINEMATIC,
          complexity: 'moderate',
        }
      );

      expect(mockCalculateCredits).toHaveBeenCalledWith(
        OperationType.VIDEO_GENERATION,
        {
          duration: 120,
          resolution: VideoResolution.HD,
          style: VideoStyle.CINEMATIC,
          complexity: 'moderate',
        }
      );

      expect(result).toEqual(mockEstimate);
    });

    it('should handle different complexity levels', async () => {
      const complexityLevels: Array<'simple' | 'moderate' | 'complex'> = ['simple', 'moderate', 'complex'];
      
      for (const complexity of complexityLevels) {
        const mockEstimate: CreditEstimate = {
          operation: OperationType.SCRIPT_GENERATION,
          estimatedCredits: complexity === 'simple' ? 4 : complexity === 'moderate' ? 5 : 8,
          estimatedAWSCost: 0.15,
          platformProfit: 0.10,
          breakdown: {
            baseCredits: 5,
            complexityMultiplier: complexity === 'simple' ? 0.8 : complexity === 'moderate' ? 1.0 : 1.5,
            durationMultiplier: 1.0,
            resolutionMultiplier: 1.0,
          },
        };

        mockCalculateCredits.mockReturnValue(mockEstimate);

        const result = await creditService.estimateOperationCost(
          OperationType.SCRIPT_GENERATION,
          { complexity }
        );

        expect(result.estimatedCredits).toBe(mockEstimate.estimatedCredits);
        expect(result.breakdown.complexityMultiplier).toBe(mockEstimate.breakdown.complexityMultiplier);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabaseService.getUserById.mockRejectedValue(new Error('Database connection failed'));

      await expect(creditService.getCreditBalance('user-123')).rejects.toThrow('Database connection failed');
    });

    it('should handle concurrent credit operations', async () => {
      // Simulate concurrent deductions
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      
      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: TransactionType.DEDUCTION,
        amount: -50,
        description: 'Concurrent operation',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 50,
      });

      // Both operations should succeed if called with sufficient balance
      const operation1 = creditService.deductCredits('user-123', 30, 'op-1', 'Operation 1');
      const operation2 = creditService.deductCredits('user-123', 30, 'op-2', 'Operation 2');

      const results = await Promise.all([operation1, operation2]);
      
      expect(results).toHaveLength(2);
      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledTimes(2);
    });

    it('should handle floating point precision in calculations', async () => {
      const userWithPreciseBalance = { ...mockUser, creditBalance: 10.99 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithPreciseBalance);
      vi.spyOn(creditService as any, 'getReservedCredits').mockResolvedValue(0);

      // Should handle precise credit amounts
      const hasSufficientCredits = await creditService.checkSufficientCredits('user-123', 10.99);
      expect(hasSufficientCredits).toBe(true);

      const hasInsufficientCredits = await creditService.checkSufficientCredits('user-123', 11.00);
      expect(hasInsufficientCredits).toBe(false);
    });
  });
});