import { databaseService } from './databaseService.js';
import { paymentService } from './paymentService.js';
import { logger } from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import { calculateCredits, calculateRefund } from '@ai-video-studio/utils/credits';
import type {
  CreditTransaction,
  CreditPurchase,
  CreditEstimate,
  CreditBalance,
  TransactionType,
  OperationType,
  User,
  VideoResolution,
  VideoStyle
} from '@ai-video-studio/types';

/**
 * Credit Management Service
 * Handles credit purchases, balance tracking, cost estimation, and transaction history
 */
export class CreditService {
  
  // ============================================================================
  // CREDIT BALANCE OPERATIONS
  // ============================================================================

  /**
   * Get user's current credit balance with detailed breakdown
   */
  async getCreditBalance(userId: string): Promise<CreditBalance> {
    try {
      const user = await databaseService.getUserById(userId);
      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get pending purchases (if any)
      const pendingTransactions = await this.getPendingTransactions(userId);
      const pendingCredits = pendingTransactions
        .filter(t => t.type === 'purchase')
        .reduce((sum, t) => sum + t.amount, 0);

      // Get reserved credits (for ongoing operations)
      const reservedCredits = await this.getReservedCredits(userId);

      return {
        current: user.creditBalance,
        pending: pendingCredits,
        reserved: reservedCredits,
        lifetime: user.totalCreditsEver,
      };
    } catch (error) {
      logger.error('Error getting credit balance:', error);
      throw error;
    }
  }

  /**
   * Check if user has sufficient credits for an operation
   */
  async checkSufficientCredits(userId: string, requiredCredits: number): Promise<boolean> {
    try {
      const balance = await this.getCreditBalance(userId);
      const availableCredits = balance.current - balance.reserved;
      return availableCredits >= requiredCredits;
    } catch (error) {
      logger.error('Error checking sufficient credits:', error);
      throw error;
    }
  }

  /**
   * Update user's credit balance (internal method)
   */
  private async updateUserCreditBalance(userId: string, amount: number): Promise<void> {
    try {
      const user = await databaseService.getUserById(userId);
      if (!user) {
        throw createError('User not found', 404, 'USER_NOT_FOUND');
      }

      const newBalance = user.creditBalance + amount;
      const newLifetimeTotal = amount > 0 ? user.totalCreditsEver + amount : user.totalCreditsEver;

      await databaseService.updateUser(userId, {
        creditBalance: newBalance,
        totalCreditsEver: newLifetimeTotal,
      });

      logger.info('Credit balance updated', {
        userId,
        previousBalance: user.creditBalance,
        newBalance,
        change: amount,
      });
    } catch (error) {
      logger.error('Error updating credit balance:', error);
      throw error;
    }
  }

  // ============================================================================
  // CREDIT PURCHASE OPERATIONS
  // ============================================================================

  /**
   * Initiate credit purchase with LemonSqueezy
   */
  async initiateCreditPurchase(
    userId: string,
    amount: number,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkoutUrl: string; purchaseId: string }> {
    try {
      if (amount <= 0) {
        throw createError('Invalid credit amount', 400, 'INVALID_AMOUNT');
      }

      // Calculate total cost (e.g., $0.05 per credit)
      const pricePerCredit = 0.05;
      const totalCost = Math.round(amount * pricePerCredit * 100); // Convert to cents

      // Create pending purchase record
      const purchase = await this.createPendingPurchase(userId, amount, totalCost);

      // Create LemonSqueezy checkout session
      const checkoutUrl = await this.createLemonSqueezyCheckout({
        purchaseId: purchase.id,
        amount: totalCost,
        credits: amount,
        successUrl,
        cancelUrl,
        customerEmail: (await databaseService.getUserById(userId))?.email,
      });

      logger.info('Credit purchase initiated', {
        userId,
        purchaseId: purchase.id,
        amount,
        totalCost,
      });

      return {
        checkoutUrl,
        purchaseId: purchase.id,
      };
    } catch (error) {
      logger.error('Error initiating credit purchase:', error);
      throw error;
    }
  }

  /**
   * Complete credit purchase after successful payment
   */
  async completeCreditPurchase(
    purchaseId: string,
    paymentProcessorId: string
  ): Promise<CreditPurchase> {
    try {
      // Get purchase record
      const purchase = await this.getPurchaseById(purchaseId);
      if (!purchase) {
        throw createError('Purchase not found', 404, 'PURCHASE_NOT_FOUND');
      }

      if (purchase.status !== 'pending') {
        throw createError('Purchase already processed', 400, 'PURCHASE_ALREADY_PROCESSED');
      }

      // Update purchase status
      await this.updatePurchaseStatus(purchaseId, 'completed', paymentProcessorId);

      // Create credit transaction
      await this.createCreditTransaction({
        userId: purchase.userId,
        type: 'purchase',
        amount: purchase.amount,
        description: `Credit purchase - ${purchase.amount} credits`,
        platformProfit: purchase.totalCost / 100, // Convert from cents
        metadata: {
          purchaseId,
          paymentProcessorId,
        },
      });

      // Update user's credit balance
      await this.updateUserCreditBalance(purchase.userId, purchase.amount);

      logger.info('Credit purchase completed', {
        purchaseId,
        userId: purchase.userId,
        amount: purchase.amount,
        paymentProcessorId,
      });

      return {
        ...purchase,
        status: 'completed',
        paymentProcessorId,
      };
    } catch (error) {
      logger.error('Error completing credit purchase:', error);
      throw error;
    }
  }

  /**
   * Handle failed credit purchase
   */
  async failCreditPurchase(purchaseId: string, reason?: string): Promise<void> {
    try {
      await this.updatePurchaseStatus(purchaseId, 'failed');
      
      logger.info('Credit purchase failed', {
        purchaseId,
        reason,
      });
    } catch (error) {
      logger.error('Error handling failed credit purchase:', error);
      throw error;
    }
  }

  // ============================================================================
  // CREDIT DEDUCTION AND REFUND OPERATIONS
  // ============================================================================

  /**
   * Deduct credits for an operation
   */
  async deductCredits(
    userId: string,
    amount: number,
    operationId: string,
    description: string,
    awsCostCovered?: number
  ): Promise<CreditTransaction> {
    try {
      // Check sufficient credits
      const hasSufficientCredits = await this.checkSufficientCredits(userId, amount);
      if (!hasSufficientCredits) {
        throw createError('Insufficient credits', 400, 'INSUFFICIENT_CREDITS');
      }

      // Create deduction transaction
      const transaction = await this.createCreditTransaction({
        userId,
        type: 'deduction',
        amount: -amount, // Negative for deduction
        description,
        operationId,
        awsCostCovered,
        platformProfit: awsCostCovered ? (amount * 0.05) - awsCostCovered : undefined,
      });

      // Update user's credit balance
      await this.updateUserCreditBalance(userId, -amount);

      logger.info('Credits deducted', {
        userId,
        amount,
        operationId,
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      logger.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Refund credits for a failed or cancelled operation
   */
  async refundCredits(
    userId: string,
    originalAmount: number,
    operationId: string,
    reason: string,
    progressPercentage = 0
  ): Promise<CreditTransaction> {
    try {
      // Calculate refund amount based on progress
      const refundAmount = calculateRefund(originalAmount, progressPercentage);

      if (refundAmount <= 0) {
        throw createError('No refund applicable', 400, 'NO_REFUND_APPLICABLE');
      }

      // Create refund transaction
      const transaction = await this.createCreditTransaction({
        userId,
        type: 'refund',
        amount: refundAmount,
        description: `${reason} - Refund for operation ${operationId}`,
        operationId,
        metadata: {
          originalAmount,
          progressPercentage,
          refundPercentage: (refundAmount / originalAmount) * 100,
        },
      });

      // Update user's credit balance
      await this.updateUserCreditBalance(userId, refundAmount);

      logger.info('Credits refunded', {
        userId,
        originalAmount,
        refundAmount,
        operationId,
        reason,
        transactionId: transaction.id,
      });

      return transaction;
    } catch (error) {
      logger.error('Error refunding credits:', error);
      throw error;
    }
  }

  // ============================================================================
  // COST ESTIMATION OPERATIONS
  // ============================================================================

  /**
   * Estimate credit cost for an operation
   */
  async estimateOperationCost(
    operationType: OperationType,
    parameters: {
      duration?: number;
      resolution?: VideoResolution;
      style?: VideoStyle;
      complexity?: 'simple' | 'moderate' | 'complex';
    }
  ): Promise<CreditEstimate> {
    try {
      const estimate = calculateCredits(operationType, parameters);
      
      logger.debug('Operation cost estimated', {
        operationType,
        parameters,
        estimate,
      });

      return estimate;
    } catch (error) {
      logger.error('Error estimating operation cost:', error);
      throw error;
    }
  }

  /**
   * Calculate credits required from AWS cost
   * Applies platform profit margin to AWS costs
   */
  calculateCreditsFromCost(awsCost: number): number {
    try {
      // Platform pricing: $0.05 per credit
      const creditValue = 0.05;
      
      // Apply profit margin (e.g., 200% markup on AWS costs)
      const profitMargin = parseFloat(process.env.PLATFORM_PROFIT_MARGIN || '2.0');
      const totalCost = awsCost * profitMargin;
      
      // Convert to credits and round up to ensure we cover costs
      const creditsRequired = Math.ceil(totalCost / creditValue);
      
      logger.debug('Credits calculated from AWS cost', {
        awsCost,
        profitMargin,
        totalCost,
        creditsRequired,
        creditValue,
      });

      return creditsRequired;
    } catch (error) {
      logger.error('Error calculating credits from cost:', error);
      throw error;
    }
  }

  // ============================================================================
  // TRANSACTION HISTORY OPERATIONS
  // ============================================================================

  /**
   * Get user's credit transaction history
   */
  async getCreditHistory(
    userId: string,
    filters?: {
      type?: TransactionType;
      startDate?: Date;
      endDate?: Date;
    },
    pagination?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<CreditTransaction[]> {
    try {
      const limit = pagination?.limit || 50;
      const offset = pagination?.offset || 0;

      let transactions = await databaseService.getUserCreditHistory(userId, limit, offset);

      // Apply filters
      if (filters?.type) {
        transactions = transactions.filter(t => t.type === filters.type);
      }

      if (filters?.startDate) {
        transactions = transactions.filter(t => t.createdAt >= filters.startDate!);
      }

      if (filters?.endDate) {
        transactions = transactions.filter(t => t.createdAt <= filters.endDate!);
      }

      return transactions;
    } catch (error) {
      logger.error('Error getting credit history:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async createCreditTransaction(data: {
    userId: string;
    type: TransactionType;
    amount: number;
    description: string;
    operationId?: string;
    awsCostCovered?: number;
    platformProfit?: number;
    metadata?: any;
  }): Promise<CreditTransaction> {
    return await databaseService.createCreditTransaction(data);
  }

  private async getPendingTransactions(userId: string): Promise<CreditTransaction[]> {
    // This would need to be implemented in the database service
    // For now, return empty array
    return [];
  }

  private async getReservedCredits(userId: string): Promise<number> {
    // Get credits reserved for ongoing operations
    // This would query generation jobs with status 'queued' or 'processing'
    // For now, return 0
    return 0;
  }

  private async createPendingPurchase(
    userId: string,
    amount: number,
    totalCost: number
  ): Promise<CreditPurchase> {
    return await databaseService.createCreditPurchase({
      userId,
      amount,
      totalCost,
      metadata: {
        pricePerCredit: totalCost / amount / 100, // Convert back to dollars
      },
    });
  }

  private async getPurchaseById(purchaseId: string): Promise<CreditPurchase | null> {
    return await databaseService.getCreditPurchaseById(purchaseId);
  }

  private async updatePurchaseStatus(
    purchaseId: string,
    status: 'pending' | 'completed' | 'failed',
    paymentProcessorId?: string
  ): Promise<void> {
    await databaseService.updateCreditPurchase(purchaseId, {
      status,
      paymentProcessorId,
    });
  }

  private async createLemonSqueezyCheckout(params: {
    purchaseId: string;
    amount: number;
    credits: number;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  }): Promise<string> {
    return await paymentService.createCheckout(params);
  }
}

// Export singleton instance
export const creditService = new CreditService();