import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth0 } from '@auth0/auth0-react';
import { creditApi } from '../services/api/creditApi';
import { useRealTime } from './useRealTime';
import { useToast } from '../providers/ToastProvider';
import type {
  CreditBalance,
  CreditTransaction,
  PurchaseCreditsRequest,
  GetCreditHistoryRequest,
  EstimateCreditsRequest,
  TransactionType,
} from '../types';

export const useCredits = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { subscribe, unsubscribe } = useRealTime();

  // Query for credit balance
  const {
    data: balance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const token = await getAccessTokenSilently();
      return creditApi.getCreditBalance(token);
    },
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Query for credit history
  const useCreditHistory = (request: GetCreditHistoryRequest = {}) => {
    return useQuery({
      queryKey: ['credits', 'history', request],
      queryFn: async () => {
        if (!isAuthenticated) return null;
        const token = await getAccessTokenSilently();
        return creditApi.getCreditHistory(token, request);
      },
      enabled: isAuthenticated,
      staleTime: 60000, // 1 minute
    });
  };

  // Mutation for purchasing credits
  const purchaseCreditsMutation = useMutation({
    mutationFn: async (request: PurchaseCreditsRequest) => {
      const token = await getAccessTokenSilently();
      return creditApi.purchaseCredits(token, request);
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        // Redirect to checkout
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: 'Purchase Initiated',
          description: 'Your credit purchase has been initiated successfully.',
          variant: 'success',
        });
        // Refetch balance after successful purchase
        refetchBalance();
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Purchase Failed',
        description: error.response?.data?.message || 'Failed to initiate credit purchase.',
        variant: 'destructive',
      });
    },
  });

  // Mutation for estimating credits
  const estimateCreditsMutation = useMutation({
    mutationFn: async (request: EstimateCreditsRequest) => {
      const token = await getAccessTokenSilently();
      return creditApi.estimateCredits(token, request);
    },
  });

  // Real-time credit updates
  React.useEffect(() => {
    if (!isAuthenticated) return;

    const handleCreditUpdate = (data: { balance: CreditBalance; transaction?: CreditTransaction }) => {
      // Update balance in cache
      queryClient.setQueryData(['credits', 'balance'], data.balance);
      
      // Invalidate history to refetch
      queryClient.invalidateQueries({ queryKey: ['credits', 'history'] });

      // Show toast notification for transactions
      if (data.transaction) {
        const { type, amount, description } = data.transaction;
        let title = '';
        let variant: 'success' | 'info' | 'warning' = 'info';

        switch (type) {
          case 'purchase':
            title = 'Credits Added';
            variant = 'success';
            break;
          case 'deduction':
            title = 'Credits Used';
            variant = 'info';
            break;
          case 'refund':
            title = 'Credits Refunded';
            variant = 'success';
            break;
          case 'subscription_grant':
            title = 'Monthly Credits Added';
            variant = 'success';
            break;
        }

        toast({
          title,
          description: `${Math.abs(amount)} credits - ${description}`,
          variant,
        });
      }
    };

    subscribe('credits:updated', handleCreditUpdate);

    return () => {
      unsubscribe('credits:updated', handleCreditUpdate);
    };
  }, [isAuthenticated, queryClient, subscribe, unsubscribe, toast]);

  return {
    // Balance data
    balance,
    isLoadingBalance,
    balanceError,
    refetchBalance,

    // History hook
    useCreditHistory,

    // Mutations
    purchaseCredits: purchaseCreditsMutation.mutate,
    isPurchasing: purchaseCreditsMutation.isPending,
    purchaseError: purchaseCreditsMutation.error,

    estimateCredits: estimateCreditsMutation.mutateAsync,
    isEstimating: estimateCreditsMutation.isPending,
    estimateError: estimateCreditsMutation.error,

    // Utility functions
    formatCredits: (credits: number) => {
      if (credits < 1000) return credits.toString();
      if (credits < 1000000) return `${(credits / 1000).toFixed(1)}K`;
      return `${(credits / 1000000).toFixed(1)}M`;
    },

    formatCreditValue: (credits: number, pricePerCredit = 0.05) => {
      const value = credits * pricePerCredit;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    },

    getTransactionTypeColor: (type: TransactionType) => {
      switch (type) {
        case 'purchase':
        case 'subscription_grant':
        case 'refund':
          return 'text-success';
        case 'deduction':
          return 'text-muted-foreground';
        default:
          return 'text-foreground';
      }
    },

    getTransactionTypeIcon: (type: TransactionType) => {
      switch (type) {
        case 'purchase':
        case 'subscription_grant':
          return 'plus';
        case 'deduction':
          return 'minus';
        case 'refund':
          return 'rotate-ccw';
        default:
          return 'circle';
      }
    },
  };
};

// Hook for checking if user has sufficient credits
export const useCreditCheck = () => {
  const { balance } = useCredits();

  const checkSufficientCredits = (requiredCredits: number): boolean => {
    if (!balance) return false;
    const availableCredits = balance.current - balance.reserved;
    return availableCredits >= requiredCredits;
  };

  const getAvailableCredits = (): number => {
    if (!balance) return 0;
    return balance.current - balance.reserved;
  };

  return {
    checkSufficientCredits,
    getAvailableCredits,
    balance,
  };
};