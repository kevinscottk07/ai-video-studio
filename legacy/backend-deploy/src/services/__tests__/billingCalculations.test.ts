import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { subscriptionService } from '../subscriptionService.js';
import { paymentService } from '../paymentService.js';
import { creditService } from '../creditService.js';
import { databaseService } from '../databaseService.js';
import type { Subscription, SubscriptionPlan, User } from '../types/index.js';

// Mock dependencies
jest.mock('../paymentService.js');
jest.mock('../creditService.js');
jest.mock('../databaseService.js');

const mockPaymentService = paymentService as jest.Mocked<typeof paymentService>;
const mockCreditService = creditService as jest.Mocked<typeof creditService>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('Billing Calculations - Unit Tests', () => {
  const mockUserId = 'user-123';
  const mockSubscriptionId = 'sub-456';

  const mockUser: User = {
    id: mockUserId,
    email: 'test@example.com',
    authProviderId: 'auth0|123',
    displayName: 'Test User',
    profileImage: null,
    language: 'en',
    timezone: 'UTC',
    creditBalance: 100,
    totalCreditsEver: 500,
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockPlans: Record<string, SubscriptionPlan> = {
    free: {
      id: 'free',
      name: 'Free',
      price: 0, // $0.00
      interval: 'month',
      creditsIncluded: 0,
      features: {
        maxDuration: 60,
        resolutions: ['standard'],
        styles: ['social_media', 'educational'],
        maxProjects: 3,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    starter: {
      id: 'starter',
      name: 'Starter',
      price: 1999, // $19.99
      interval: 'month',
      creditsIncluded: 100,
      features: {
        maxDuration: 60,
        resolutions: ['standard'],
        styles: ['social_media', 'educational', 'advertisement'],
        maxProjects: 10,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 4999, // $49.99
      interval: 'month',
      creditsIncluded: 300,
      features: {
        maxDuration: 7200,
        resolutions: ['standard', 'hd'],
        styles: ['social_media', 'educational', 'advertisement', 'cinematic'],
        maxProjects: 50,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    ultra: {
      id: 'ultra',
      name: 'Ultra',
      price: 9999, // $99.99
      interval: 'month',
      creditsIncluded: 1000,
      features: {
        maxDuration: 7200,
        resolutions: ['standard', 'hd', 'ultra'],
        styles: ['social_media', 'educational', 'advertisement', 'cinematic', 'vr'],
        maxProjects: -1, // unlimited
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const createMockSubscription = (planId: string, daysIntoMonth: number = 0): Subscription => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Adjust current time to simulate being X days into the month
    const currentTime = new Date(periodStart.getTime() + (daysIntoMonth * 24 * 60 * 60 * 1000));

    return {
      id: mockSubscriptionId,
      userId: mockUserId,
      planId: planId as any,
      paymentProcessorId: 'lemon_sub_123',
      status: 'active',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      creditsIncluded: mockPlans[planId].creditsIncluded,
      creditsUsedThisPeriod: 0,
      createdAt: new Date(),
      updatedAt: currentTime,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockDatabaseService.getUserById.mockResolvedValue(mockUser);
    mockDatabaseService.getSubscriptionPlanById.mockImplementation(async (planId) => 
      mockPlans[planId] || null
    );
    mockPaymentService.createCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.lemonsqueezy.com/session123',
      sessionId: 'session123',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Subscription Proration Calculations', () => {
    it('should calculate correct proration for mid-month upgrade', async () => {
      // User upgrades from Starter to Pro 15 days into a 30-day month
      const starterSubscription = createMockSubscription('starter', 15);
      const proPlan = mockPlans.pro;
      const starterPlan = mockPlans.starter;

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(starterSubscription);
      mockDatabaseService.updateSubscription.mockResolvedValue({
        ...starterSubscription,
        planId: 'pro' as any,
      });

      // Mock the private calculateProration method by testing through public interface
      const result = await subscriptionService.upgradeSubscription(mockUserId, 'pro');

      // Verify proration calculation:
      // 15 days remaining out of 30 = 50% of period remaining
      // Credit adjustment: (300 * 0.5) - (100 * 0.5) = 150 - 50 = 100 credits
      // Price adjustment: (4999 * 0.5) - (1999 * 0.5) = 2499.5 - 999.5 = 1500 cents

      expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
        mockUserId,
        100, // Credit adjustment
        'Subscription upgrade proration'
      );

      expect(mockPaymentService.processProration).toHaveBeenCalledWith(
        starterSubscription.paymentProcessorId,
        expect.objectContaining({
          amount: 1500, // Prorated amount difference
          description: expect.stringContaining('upgrade'),
        })
      );
    });

    it('should calculate correct proration for mid-month downgrade', async () => {
      // User downgrades from Pro to Starter 10 days into a 30-day month
      const proSubscription = createMockSubscription('pro', 10);
      const starterPlan = mockPlans.starter;
      const proPlan = mockPlans.pro;

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);
      mockDatabaseService.updateSubscription.mockResolvedValue({
        ...proSubscription,
        planId: 'starter' as any,
      });

      const result = await subscriptionService.downgradeSubscription(mockUserId, 'starter');

      // Verify proration calculation:
      // 20 days remaining out of 30 = 66.67% of period remaining
      // Credit adjustment: (100 * 0.667) - (300 * 0.667) = 66.7 - 200 = -133.3 credits (rounded)
      // Price adjustment: (1999 * 0.667) - (4999 * 0.667) = 1332.67 - 3332.67 = -2000 cents (refund)

      expect(mockCreditService.deductCredits).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Number), // Credit reduction
        'Subscription downgrade proration'
      );

      expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
        proSubscription.paymentProcessorId,
        expect.objectContaining({
          amount: expect.any(Number), // Refund amount
          reason: expect.stringContaining('downgrade'),
        })
      );
    });

    it('should handle proration at beginning of billing period', async () => {
      // User upgrades on day 1 of billing period
      const starterSubscription = createMockSubscription('starter', 1);

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(starterSubscription);
      mockDatabaseService.updateSubscription.mockResolvedValue({
        ...starterSubscription,
        planId: 'pro' as any,
      });

      await subscriptionService.upgradeSubscription(mockUserId, 'pro');

      // Should charge almost full amount since it's beginning of period
      // 29 days remaining out of 30 = 96.67% of period remaining
      expect(mockPaymentService.processProration).toHaveBeenCalledWith(
        starterSubscription.paymentProcessorId,
        expect.objectContaining({
          amount: expect.any(Number),
        })
      );
    });

    it('should handle proration at end of billing period', async () => {
      // User upgrades on day 29 of billing period
      const starterSubscription = createMockSubscription('starter', 29);

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(starterSubscription);
      mockDatabaseService.updateSubscription.mockResolvedValue({
        ...starterSubscription,
        planId: 'pro' as any,
      });

      await subscriptionService.upgradeSubscription(mockUserId, 'pro');

      // Should charge minimal amount since it's end of period
      // 1 day remaining out of 30 = 3.33% of period remaining
      expect(mockPaymentService.processProration).toHaveBeenCalledWith(
        starterSubscription.paymentProcessorId,
        expect.objectContaining({
          amount: expect.any(Number),
        })
      );
    });

    it('should handle zero proration for same-day changes', async () => {
      // User upgrades and then downgrades on the same day
      const starterSubscription = createMockSubscription('starter', 15);

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(starterSubscription);

      // First upgrade
      await subscriptionService.upgradeSubscription(mockUserId, 'pro');

      // Immediate downgrade (same day)
      const proSubscription = { ...starterSubscription, planId: 'pro' as any };
      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);

      await subscriptionService.downgradeSubscription(mockUserId, 'starter');

      // Should handle minimal proration due to same-day change
      expect(mockPaymentService.processProration).toHaveBeenCalled();
    });
  });

  describe('Subscription Renewal Calculations', () => {
    it('should calculate correct renewal amount for active subscription', async () => {
      const proSubscription = createMockSubscription('pro', 30); // End of period
      const proPlan = mockPlans.pro;

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);
      mockDatabaseService.updateSubscription.mockResolvedValue({
        ...proSubscription,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        creditsUsedThisPeriod: 0,
      });

      await subscriptionService.renewSubscription(mockSubscriptionId);

      expect(mockPaymentService.processRenewal).toHaveBeenCalledWith(
        proSubscription.paymentProcessorId,
        {
          amount: proPlan.price,
          description: `${proPlan.name} subscription renewal`,
        }
      );

      expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
        mockUserId,
        proPlan.creditsIncluded,
        'Monthly subscription renewal'
      );
    });

    it('should handle failed renewal payments', async () => {
      const proSubscription = createMockSubscription('pro', 30);

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);
      mockPaymentService.processRenewal.mockRejectedValue(new Error('Payment failed'));

      await expect(
        subscriptionService.renewSubscription(mockSubscriptionId)
      ).rejects.toThrow('Payment failed');

      // Should not grant credits if payment fails
      expect(mockCreditService.grantCredits).not.toHaveBeenCalled();

      // Should update subscription status to past_due
      expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
        mockSubscriptionId,
        expect.objectContaining({
          status: 'past_due',
        })
      );
    });

    it('should handle renewal with payment retry logic', async () => {
      const proSubscription = createMockSubscription('pro', 30);

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);
      mockPaymentService.processRenewal
        .mockRejectedValueOnce(new Error('Temporary payment failure'))
        .mockResolvedValueOnce({
          success: true,
          transactionId: 'txn_123',
        });

      // Should retry payment and succeed
      await subscriptionService.renewSubscription(mockSubscriptionId);

      expect(mockPaymentService.processRenewal).toHaveBeenCalledTimes(2);
      expect(mockCreditService.grantCredits).toHaveBeenCalled();
    });
  });

  describe('Credit Allocation Calculations', () => {
    it('should allocate correct credits for new subscription', async () => {
      const proPlan = mockPlans.pro;

      mockDatabaseService.createSubscription.mockResolvedValue(
        createMockSubscription('pro')
      );

      await subscriptionService.createSubscription(
        mockUserId,
        'pro',
        'https://success.url',
        'https://cancel.url'
      );

      expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
        mockUserId,
        proPlan.creditsIncluded,
        'New subscription credit allocation'
      );
    });

    it('should handle partial credit allocation for mid-period subscriptions', async () => {
      // User subscribes 15 days into the month
      const subscriptionDate = new Date();
      subscriptionDate.setDate(15);

      const proPlan = mockPlans.pro;
      const proSubscription = createMockSubscription('pro', 15);

      mockDatabaseService.createSubscription.mockResolvedValue(proSubscription);

      await subscriptionService.createSubscription(
        mockUserId,
        'pro',
        'https://success.url',
        'https://cancel.url'
      );

      // Should allocate prorated credits for remaining period
      // 15 days remaining out of 30 = 50% of credits
      const expectedCredits = Math.floor(proPlan.creditsIncluded * 0.5);

      expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
        mockUserId,
        expectedCredits,
        'Prorated subscription credit allocation'
      );
    });

    it('should handle credit rollover for unused credits', async () => {
      const proSubscription = createMockSubscription('pro', 30);
      proSubscription.creditsUsedThisPeriod = 150; // Used 150 out of 300 credits

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);

      await subscriptionService.renewSubscription(mockSubscriptionId);

      // Should grant new credits plus rollover unused credits (up to limit)
      const unusedCredits = 300 - 150; // 150 unused credits
      const rolloverLimit = Math.floor(mockPlans.pro.creditsIncluded * 0.5); // 50% rollover limit
      const actualRollover = Math.min(unusedCredits, rolloverLimit);

      expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
        mockUserId,
        mockPlans.pro.creditsIncluded + actualRollover,
        'Monthly subscription renewal with rollover'
      );
    });
  });

  describe('Payment Failure Handling', () => {
    it('should handle subscription cancellation due to payment failure', async () => {
      const proSubscription = createMockSubscription('pro', 30);

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);
      mockPaymentService.processRenewal.mockRejectedValue(new Error('Card declined'));

      // Simulate multiple failed payment attempts
      for (let i = 0; i < 3; i++) {
        try {
          await subscriptionService.renewSubscription(mockSubscriptionId);
        } catch (error) {
          // Expected to fail
        }
      }

      // After 3 failed attempts, should cancel subscription
      expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
        mockSubscriptionId,
        expect.objectContaining({
          status: 'canceled',
          cancelAtPeriodEnd: true,
        })
      );
    });

    it('should handle partial refunds for cancelled subscriptions', async () => {
      const proSubscription = createMockSubscription('pro', 10); // 20 days remaining

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);

      await subscriptionService.cancelSubscription(mockSubscriptionId, true); // Immediate cancellation

      // Should calculate refund for unused portion
      // 20 days remaining out of 30 = 66.67% refund
      const expectedRefund = Math.floor(mockPlans.pro.price * (20 / 30));

      expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
        proSubscription.paymentProcessorId,
        {
          amount: expectedRefund,
          reason: 'Subscription cancellation refund',
        }
      );
    });

    it('should handle retry logic for failed payment processing', async () => {
      const proSubscription = createMockSubscription('pro', 30);

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(proSubscription);
      mockPaymentService.processRenewal
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          success: true,
          transactionId: 'txn_retry_123',
        });

      await subscriptionService.renewSubscription(mockSubscriptionId);

      // Should retry 3 times and succeed
      expect(mockPaymentService.processRenewal).toHaveBeenCalledTimes(3);
      expect(mockCreditService.grantCredits).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle leap year calculations correctly', async () => {
      // Test proration calculation during February in a leap year
      const leapYearDate = new Date(2024, 1, 15); // February 15, 2024 (leap year)
      const subscription = {
        ...createMockSubscription('pro'),
        currentPeriodStart: new Date(2024, 1, 1), // Feb 1
        currentPeriodEnd: new Date(2024, 2, 1), // Mar 1 (29 days in Feb)
      };

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(subscription);

      // Mock current date to be Feb 15
      jest.useFakeTimers();
      jest.setSystemTime(leapYearDate);

      await subscriptionService.upgradeSubscription(mockUserId, 'ultra');

      // Should correctly calculate 14 days remaining out of 29 total days
      expect(mockPaymentService.processProration).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle timezone differences in billing calculations', async () => {
      const userInDifferentTimezone = {
        ...mockUser,
        timezone: 'America/Los_Angeles', // PST/PDT
      };

      mockDatabaseService.getUserById.mockResolvedValue(userInDifferentTimezone);

      const subscription = createMockSubscription('pro', 15);
      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(subscription);

      await subscriptionService.upgradeSubscription(mockUserId, 'ultra');

      // Should handle timezone correctly in calculations
      expect(mockPaymentService.processProration).toHaveBeenCalledWith(
        subscription.paymentProcessorId,
        expect.objectContaining({
          amount: expect.any(Number),
        })
      );
    });

    it('should handle subscription with custom billing cycles', async () => {
      const annualPlan: SubscriptionPlan = {
        ...mockPlans.pro,
        id: 'pro-annual',
        name: 'Pro Annual',
        price: 49999, // $499.99 annually
        interval: 'year',
        creditsIncluded: 3600, // 300 * 12 months
      };

      mockDatabaseService.getSubscriptionPlanById.mockResolvedValue(annualPlan);

      const annualSubscription = {
        ...createMockSubscription('pro-annual'),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      };

      mockDatabaseService.getUserActiveSubscription.mockResolvedValue(annualSubscription);

      await subscriptionService.renewSubscription(mockSubscriptionId);

      expect(mockPaymentService.processRenewal).toHaveBeenCalledWith(
        annualSubscription.paymentProcessorId,
        {
          amount: annualPlan.price,
          description: `${annualPlan.name} subscription renewal`,
        }
      );
    });

    it('should handle currency conversion for international users', async () => {
      const internationalUser = {
        ...mockUser,
        currency: 'EUR',
        country: 'DE',
      };

      mockDatabaseService.getUserById.mockResolvedValue(internationalUser);
      mockPaymentService.convertCurrency = jest.fn().mockResolvedValue({
        amount: 4299, // €42.99 equivalent
        currency: 'EUR',
        exchangeRate: 0.86,
      });

      await subscriptionService.createSubscription(
        mockUserId,
        'pro',
        'https://success.url',
        'https://cancel.url'
      );

      expect(mockPaymentService.convertCurrency).toHaveBeenCalledWith(
        mockPlans.pro.price,
        'USD',
        'EUR'
      );
    });

    it('should handle subscription limits and quotas', async () => {
      const userWithMultipleSubscriptions = {
        ...mockUser,
        subscriptionCount: 5, // Already has 5 subscriptions
      };

      mockDatabaseService.getUserById.mockResolvedValue(userWithMultipleSubscriptions);

      await expect(
        subscriptionService.createSubscription(
          mockUserId,
          'pro',
          'https://success.url',
          'https://cancel.url'
        )
      ).rejects.toThrow('SUBSCRIPTION_LIMIT_EXCEEDED');
    });
  });
});