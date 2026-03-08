import { apiClient } from './client';
import type {
  CreditBalance,
  CreditTransaction,
  CreditPurchase,
  CreditEstimate,
  PurchaseCreditsRequest,
  PurchaseCreditsResponse,
  GetCreditHistoryRequest,
  GetCreditHistoryResponse,
  EstimateCreditsRequest,
  EstimateCreditsResponse,
  OperationType,
  TransactionType,
} from '../types';

export const creditApi = {
  /**
   * Get user's current credit balance
   */
  async getCreditBalance(token: string): Promise<CreditBalance> {
    const response = await apiClient.get('/credits/balance', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Initiate credit purchase
   */
  async purchaseCredits(
    token: string,
    request: PurchaseCreditsRequest
  ): Promise<PurchaseCreditsResponse> {
    const response = await apiClient.post('/credits/purchase', request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Get credit transaction history
   */
  async getCreditHistory(
    token: string,
    request: GetCreditHistoryRequest = {}
  ): Promise<GetCreditHistoryResponse> {
    const params = new URLSearchParams();
    
    if (request.filters?.type) {
      params.append('type', request.filters.type);
    }
    if (request.filters?.dateRange?.start) {
      params.append('startDate', request.filters.dateRange.start.toISOString());
    }
    if (request.filters?.dateRange?.end) {
      params.append('endDate', request.filters.dateRange.end.toISOString());
    }
    if (request.pagination?.limit) {
      params.append('limit', request.pagination.limit.toString());
    }
    if (request.pagination?.page) {
      params.append('offset', ((request.pagination.page - 1) * (request.pagination.limit || 50)).toString());
    }

    const response = await apiClient.get(`/credits/history?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Estimate credit cost for an operation
   */
  async estimateCredits(
    token: string,
    request: EstimateCreditsRequest
  ): Promise<EstimateCreditsResponse> {
    const response = await apiClient.post('/credits/estimate', request, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data;
  },

  /**
   * Deduct credits for an operation (internal use)
   */
  async deductCredits(
    token: string,
    amount: number,
    operationId: string,
    description: string,
    awsCostCovered?: number
  ): Promise<CreditTransaction> {
    const response = await apiClient.post('/credits/deduct', {
      amount,
      operationId,
      description,
      awsCostCovered,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data.transaction;
  },

  /**
   * Refund credits for a failed operation (internal use)
   */
  async refundCredits(
    token: string,
    originalAmount: number,
    operationId: string,
    reason: string,
    progressPercentage = 0
  ): Promise<CreditTransaction> {
    const response = await apiClient.post('/credits/refund', {
      originalAmount,
      operationId,
      reason,
      progressPercentage,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.data.transaction;
  },
};