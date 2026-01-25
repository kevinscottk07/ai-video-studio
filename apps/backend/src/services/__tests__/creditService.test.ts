import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CreditService } from '../creditService.js';
import { databaseService } from '../databaseService.js';
import { paymentService } from '../paymentService.js';
import type { User, CreditTransaction, CreditPurchase } from '@ai-video-studio/types';

// Mock dependencies
jest.mock('../databaseService.js');
jest.mock('../paymentService.js');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;
const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;

describe('CreditService', () => {
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
      role: 'user',
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getCreditBalance', () => {
    it('should return user credit balance with breakdown', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);

      const balance = await creditService.getCreditBalance('user-123');

      expect(balance).toEqual({
        current: 100,
        pending: 0,
        reserved: 0,
        lifetime: 500,
      });

      expect(mockDatabaseService.getUserById).toHaveBeenCalledWith('user-123');
    });

    it('should throw error if user not found', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(null);

      await expect(creditService.getCreditBalance('user-123')).rejects.toThrow('User not found');
    });
  });

  describe('checkSufficientCredits', () => {
    it('should return true when user has sufficient credits', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);

      const result = await creditService.checkSufficientCredits('user-123', 50);

      expect(result).toBe(true);
    });

    it('should return false when user has insufficient credits', async () => {
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);

      const result = await creditService.checkSufficientCredits('user-123', 150);

      expect(result).toBe(false);
    });
  });

  describe('initiateCreditPurchase', () => {
    it('should create purchase and return checkout URL', async () => {
      const mockPurchase: CreditPurchase = {
        id: 'purchase-123',
        userId: 'user-123',
        amount: 100,
        totalCost: 500, // $5.00 in cents
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

      expect(result).toEqual({
        checkoutUrl: 'https://checkout.lemonsqueezy.com/test',
        purchaseId: 'purchase-123',
      });

      expect(mockDatabaseService.createCreditPurchase).toHaveBeenCalledWith({
        userId: 'user-123',
        amount: 100,
        totalCost: 500,
        metadata: {
          pricePerCredit: 0.05,
        },
      });

      expect(mockPaymentService.createCheckout).toHaveBeenCalledWith({
        purchaseId: 'purchase-123',
        amount: 500,
        credits: 100,
        successUrl: 'https://success.com',
        cancelUrl: 'https://cancel.com',
        customerEmail: 'test@example.com',
      });
    });

    it('should throw error for invalid amount', async () => {
      await expect(creditService.initiateCreditPurchase(
        'user-123',
        0,
        'https://success.com',
        'https://cancel.com'
      )).rejects.toThrow('Invalid credit amount');
    });
  });

  describe('completeCreditPurchase', () => {
    it('should complete purchase and update user balance', async () => {
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
        type: 'purchase',
        amount: 100,
        description: 'Credit purchase - 100 credits',
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
        creditBalance: 200,
        totalCreditsEver: 600,
      });

      const result = await creditService.completeCreditPurchase('purchase-123', 'payment-123');

      expect(result.status).toBe('completed');
      expect(result.paymentProcessorId).toBe('payment-123');

      expect(mockDatabaseService.updateCreditPurchase).toHaveBeenCalledWith('purchase-123', {
        status: 'completed',
        paymentProcessorId: 'payment-123',
      });

      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'purchase',
        amount: 100,
        description: 'Credit purchase - 100 credits',
        platformProfit: 5,
        metadata: {
          purchaseId: 'purchase-123',
          paymentProcessorId: 'payment-123',
        },
      });

      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('user-123', {
        creditBalance: 200,
        totalCreditsEver: 600,
      });
    });

    it('should throw error if purchase not found', async () => {
      mockDatabaseService.getCreditPurchaseById.mockResolvedValue(null);

      await expect(creditService.completeCreditPurchase('purchase-123', 'payment-123'))
        .rejects.toThrow('Purchase not found');
    });

    it('should throw error if purchase already processed', async () => {
      const mockPurchase: CreditPurchase = {
        id: 'purchase-123',
        userId: 'user-123',
        amount: 100,
        totalCost: 500,
        paymentProcessorId: 'payment-123',
        status: 'completed',
        createdAt: new Date(),
      };

      mockDatabaseService.getCreditPurchaseById.mockResolvedValue(mockPurchase);

      await expect(creditService.completeCreditPurchase('purchase-123', 'payment-123'))
        .rejects.toThrow('Purchase already processed');
    });
  });

  describe('deductCredits', () => {
    it('should deduct credits and create transaction', async () => {
      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: 'deduction',
        amount: -50,
        description: 'Video generation',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 50,
      });

      const result = await creditService.deductCredits(
        'user-123',
        50,
        'operation-123',
        'Video generation',
        2.5
      );

      expect(result).toEqual(mockTransaction);

      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'deduction',
        amount: -50,
        description: 'Video generation',
        operationId: 'operation-123',
        awsCostCovered: 2.5,
        platformProfit: 0,
      });

      expect(mockDatabaseService.updateUser).toHaveBeenCalledWith('user-123', {
        creditBalance: 50,
        totalCreditsEver: 500,
      });
    });

    it('should throw error for insufficient credits', async () => {
      const userWithLowBalance = { ...mockUser, creditBalance: 10 };
      mockDatabaseService.getUserById.mockResolvedValue(userWithLowBalance);

      await expect(creditService.deductCredits(
        'user-123',
        50,
        'operation-123',
        'Video generation'
      )).rejects.toThrow('Insufficient credits');
    });
  });

  describe('refundCredits', () => {
    it('should refund credits based on progress', async () => {
      const mockTransaction: CreditTransaction = {
        id: 'transaction-123',
        userId: 'user-123',
        type: 'refund',
        amount: 25, // 50% refund for 50% progress
        description: 'Operation failed - Refund for operation operation-123',
        operationId: 'operation-123',
        createdAt: new Date(),
      };

      mockDatabaseService.createCreditTransaction.mockResolvedValue(mockTransaction);
      mockDatabaseService.getUserById.mockResolvedValue(mockUser);
      mockDatabaseService.updateUser.mockResolvedValue({
        ...mockUser,
        creditBalance: 125,
      });

      const result = await creditService.refundCredits(
        'user-123',
        50,
        'operation-123',
        'Operation failed',
        50 // 50% progress
      );

      expect(result).toEqual(mockTransaction);

      expect(mockDatabaseService.createCreditTransaction).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'refund',
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
        totalCreditsEver: 500,
      });
    });

    it('should throw error when no refund applicable', async () => {
      await expect(creditService.refundCredits(
        'user-123',
        50,
        'operation-123',
        'Operation completed',
        100 // 100% progress, no refund
      )).rejects.toThrow('No refund applicable');
    });
  });

  describe('estimateOperationCost', () => {
    it('should estimate cost for video generation', async () => {
      const estimate = await creditService.estimateOperationCost('video_generation', {
        duration: 60,
        resolution: 'hd',
        style: 'cinematic',
        complexity: 'moderate',
      });

      expect(estimate).toHaveProperty('operation', 'video_generation');
      expect(estimate).toHaveProperty('estimatedCredits');
      expect(estimate).toHaveProperty('estimatedAWSCost');
      expect(estimate).toHaveProperty('platformProfit');
      expect(estimate).toHaveProperty('breakdown');
      expect(estimate.estimatedCredits).toBeGreaterThan(0);
    });

    it('should estimate cost for script generation', async () => {
      const estimate = await creditService.estimateOperationCost('script_generation', {
        complexity: 'simple',
      });

      expect(estimate.operation).toBe('script_generation');
      expect(estimate.estimatedCredits).toBe(4); // 5 * 0.8 (simple complexity)
    });
  });

  describe('getCreditHistory', () => {
    it('should return user credit history', async () => {
      const mockTransactions: CreditTransaction[] = [
        {
          id: 'transaction-1',
          userId: 'user-123',
          type: 'purchase',
          amount: 100,
          description: 'Credit purchase',
          createdAt: new Date('2023-01-01'),
        },
        {
          id: 'transaction-2',
          userId: 'user-123',
          type: 'deduction',
          amount: -50,
          description: 'Video generation',
          createdAt: new Date('2023-01-02'),
        },
      ];

      mockDatabaseService.getUserCreditHistory.mockResolvedValue(mockTransactions);

      const result = await creditService.getCreditHistory('user-123');

      expect(result).toEqual(mockTransactions);
      expect(mockDatabaseService.getUserCreditHistory).toHaveBeenCalledWith('user-123', 50, 0);
    });

    it('should filter transactions by type', async () => {
      const mockTransactions: CreditTransaction[] = [
        {
          id: 'transaction-1',
          userId: 'user-123',
          type: 'purchase',
          amount: 100,
          description: 'Credit purchase',
          createdAt: new Date('2023-01-01'),
        },
      ];

      mockDatabaseService.getUserCreditHistory.mockResolvedValue(mockTransactions);

      const result = await creditService.getCreditHistory('user-123', {
        type: 'purchase',
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('purchase');
    });
  });
});