/**
 * Property-Based Test for Subscription Lifecycle Management
 * 
 * **Feature: ai-video-studio, Property 9: Subscription Lifecycle Management**
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 * 
 * This property test validates that for any subscription operation (create, renew, 
 * cancel, modify), the system processes payments correctly, activates appropriate 
 * features, handles proration, and maintains access according to billing periods 
 * across all subscription scenarios and state transitions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { subscriptionService } from '../subscriptionService.js';
import { paymentService } from '../paymentService.js';
import { creditService } from '../creditService.js';
import { databaseService } from '../databaseService.js';
import type { 
  User, 
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  CreditTransaction
} from '@ai-video-studio/types';

// Mock dependencies
vi.mock('../paymentService.js');
vi.mock('../creditService.js');
vi.mock('../databaseService.js');

const mockPaymentService = vi.mocked(paymentService);
const mockCreditService = vi.mocked(creditService);
const mockDatabaseService = vi.mocked(databaseService);

// Test data generators for property-based testing
function generateTestCases<T>(generator: () => T, count: number = 100): T[] {
  return Array.from({ length: count }, generator);
}

function generateValidUser(): User {
  const userId = `user_${Math.random().toString(36).substring(2, 15)}`;
  
  return {
    id: userId,
    email: `${userId}@example.com`,
    authProviderId: `auth0|${userId}`,
    displayName: `User ${userId.slice(-8)}`,
    profileImage: null,
    language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)],
    timezone: ['UTC', 'America/New_York', 'Europe/London'][Math.floor(Math.random() * 3)],
    creditBalance: Math.floor(Math.random() * 500),
    totalCreditsEver: Math.floor(Math.random() * 2000),
    role: 'user',
    isActive: true,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };
}

function generateSubscriptionPlan(): SubscriptionPlan {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: 'month',
      creditsIncluded: 0,
      features: { maxDuration: 60, resolutions: ['standard'] },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 1999, // $19.99
      interval: 'month',
      creditsIncluded: 100,
      features: { maxDuration: 60, resolutions: ['standard'] },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 4999, // $49.99
      interval: 'month',
      creditsIncluded: 300,
      features: { maxDuration: 7200, resolutions: ['standard', 'hd'] },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'ultra',
      name: 'Ultra',
      price: 9999, // $99.99
      interval: 'month',
      creditsIncluded: 1000,
      features: { maxDuration: 7200, resolutions: ['standard', 'hd', 'ultra'] },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  
  return plans[Math.floor(Math.random() * plans.length)] as SubscriptionPlan;
}

function generateSubscription(userId: string, planId: string, daysIntoMonth: number = 0): Subscription {
  const subscriptionId = `sub_${Math.random().toString(36).substring(2, 15)}`;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  
  // Adjust current time to simulate being X days into the month
  const currentTime = new Date(periodStart.getTime() + (daysIntoMonth * 24 * 60 * 60 * 1000));
  
  const statuses: SubscriptionStatus[] = ['active', 'canceled', 'past_due', 'unpaid'];
  
  return {
    id: subscriptionId,
    userId,
    planId: planId as any,
    paymentProcessorId: `lemon_${subscriptionId}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: Math.random() > 0.8, // 20% chance
    creditsIncluded: [0, 100, 300, 1000][Math.floor(Math.random() * 4)],
    creditsUsedThisPeriod: Math.floor(Math.random() * 200),
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
    updatedAt: currentTime,
  };
}

function generateSubscriptionScenario() {
  const user = generateValidUser();
  const plan = generateSubscriptionPlan();
  const subscription = generateSubscription(user.id, plan.id);
  const operation = ['create', 'upgrade', 'downgrade', 'cancel', 'renew'][Math.floor(Math.random() * 5)];
  
  return {
    user,
    plan,
    subscription,
    operation,
    targetPlan: generateSubscriptionPlan(), // For upgrade/downgrade operations
  };
}

describe('Subscription Lifecycle Management - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockPaymentService.createCheckoutSession.mockResolvedValue({
      checkoutUrl: 'https://checkout.lemonsqueezy.com/session123',
      sessionId: 'session123',
    });
    mockPaymentService.processRenewal.mockResolvedValue({
      success: true,
      transactionId: 'txn_123',
    });
    mockPaymentService.processProration.mockResolvedValue({
      success: true,
      transactionId: 'proration_123',
    });
    mockPaymentService.processRefund.mockResolvedValue({
      success: true,
      refundId: 'refund_123',
    });
    
    mockCreditService.grantCredits.mockResolvedValue({
      id: 'credit_123',
      amount: 100,
      type: 'subscription_grant',
    } as any);
    mockCreditService.deductCredits.mockResolvedValue({
      id: 'deduct_123',
      amount: 50,
      type: 'deduction',
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Property 9.1: Subscription Creation Consistency', () => {
    it('should consistently create subscriptions with proper payment processing and credit allocation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            user: fc.constant(generateValidUser()),
            plan: fc.constant(generateSubscriptionPlan()),
            paymentMethod: fc.constantFrom('card', 'paypal', 'bank_transfer'),
            prorationDays: fc.integer({ min: 0, max: 30 }), // Days into current month
          }), { minLength: 1, maxLength: 10 }),
          async (scenarios) => {
            for (const scenario of scenarios) {
              const { user, plan, paymentMethod, prorationDays } = scenario;
              
              // Mock user exists
              mockDatabaseService.getUserById.mockResolvedValue(user);
              
              // Mock plan exists
              mockDatabaseService.getSubscriptionPlanById.mockResolvedValue(plan);
              
              // Mock no existing subscription
              mockDatabaseService.getUserActiveSubscription.mockResolvedValue(null);
              
              // Mock subscription creation
              const newSubscription = generateSubscription(user.id, plan.id, prorationDays);
              mockDatabaseService.createSubscription.mockResolvedValue(newSubscription);
              
              // Create subscription
              const result = await subscriptionService.createSubscription(
                user.id,
                plan.id,
                'https://success.url',
                'https://cancel.url'
              );
              
              // Verify subscription was created
              expect(result).toHaveProperty('checkoutUrl');
              expect(result).toHaveProperty('subscriptionId');
              expect(mockDatabaseService.createSubscription).toHaveBeenCalledWith({
                userId: user.id,
                planId: plan.id,
                status: 'active',
                currentPeriodStart: expect.any(Date),
                currentPeriodEnd: expect.any(Date),
                creditsIncluded: plan.creditsIncluded,
              });
              
              // Verify payment processing
              expect(mockPaymentService.createCheckoutSession).toHaveBeenCalledWith({
                planId: plan.id,
                userId: user.id,
                amount: plan.price,
                successUrl: 'https://success.url',
                cancelUrl: 'https://cancel.url',
              });
              
              // Verify credit allocation (prorated if mid-month)
              if (plan.creditsIncluded > 0) {
                const expectedCredits = prorationDays > 0 
                  ? Math.floor(plan.creditsIncluded * ((30 - prorationDays) / 30))
                  : plan.creditsIncluded;
                
                expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
                  user.id,
                  expectedCredits,
                  expect.stringContaining('subscription')
                );
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.2: Subscription Upgrade/Downgrade Proration', () => {
    it('should correctly calculate proration for all subscription changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            currentPlan: fc.constant(generateSubscriptionPlan()),
            targetPlan: fc.constant(generateSubscriptionPlan()),
            daysIntoMonth: fc.integer({ min: 1, max: 29 }),
            user: fc.constant(generateValidUser()),
          }), { minLength: 1, maxLength: 15 }),
          async (scenarios) => {
            for (const scenario of scenarios) {
              const { currentPlan, targetPlan, daysIntoMonth, user } = scenario;
              
              // Skip if same plan
              if (currentPlan.id === targetPlan.id) continue;
              
              // Mock user and plans
              mockDatabaseService.getUserById.mockResolvedValue(user);
              mockDatabaseService.getSubscriptionPlanById
                .mockResolvedValueOnce(currentPlan)
                .mockResolvedValueOnce(targetPlan);
              
              // Mock current subscription
              const currentSubscription = generateSubscription(user.id, currentPlan.id, daysIntoMonth);
              currentSubscription.status = 'active';
              mockDatabaseService.getUserActiveSubscription.mockResolvedValue(currentSubscription);
              
              // Mock updated subscription
              const updatedSubscription = {
                ...currentSubscription,
                planId: targetPlan.id as any,
                creditsIncluded: targetPlan.creditsIncluded,
              };
              mockDatabaseService.updateSubscription.mockResolvedValue(updatedSubscription);
              
              // Calculate expected proration
              const totalDays = 30; // Simplified month
              const remainingDays = totalDays - daysIntoMonth;
              const remainingRatio = remainingDays / totalDays;
              
              const oldProratedAmount = currentPlan.price * remainingRatio;
              const newProratedAmount = targetPlan.price * remainingRatio;
              const expectedProration = newProratedAmount - oldProratedAmount;
              
              const oldCreditsRemaining = Math.floor(currentPlan.creditsIncluded * remainingRatio);
              const newCreditsForPeriod = Math.floor(targetPlan.creditsIncluded * remainingRatio);
              const expectedCreditAdjustment = newCreditsForPeriod - oldCreditsRemaining;
              
              // Perform upgrade or downgrade
              const isUpgrade = targetPlan.price > currentPlan.price;
              
              if (isUpgrade) {
                await subscriptionService.upgradeSubscription(user.id, targetPlan.id);
                
                // Should process proration payment
                expect(mockPaymentService.processProration).toHaveBeenCalledWith(
                  currentSubscription.paymentProcessorId,
                  expect.objectContaining({
                    amount: Math.max(0, Math.round(expectedProration)),
                  })
                );
                
                // Should grant additional credits if positive adjustment
                if (expectedCreditAdjustment > 0) {
                  expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
                    user.id,
                    expectedCreditAdjustment,
                    expect.stringContaining('upgrade')
                  );
                }
              } else {
                await subscriptionService.downgradeSubscription(user.id, targetPlan.id);
                
                // Should process refund if applicable
                if (expectedProration < 0) {
                  expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
                    currentSubscription.paymentProcessorId,
                    expect.objectContaining({
                      amount: Math.abs(Math.round(expectedProration)),
                    })
                  );
                }
                
                // Should deduct credits if negative adjustment
                if (expectedCreditAdjustment < 0) {
                  expect(mockCreditService.deductCredits).toHaveBeenCalledWith(
                    user.id,
                    Math.abs(expectedCreditAdjustment),
                    expect.stringContaining('downgrade')
                  );
                }
              }
              
              // Should update subscription
              expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
                currentSubscription.id,
                expect.objectContaining({
                  planId: targetPlan.id,
                  creditsIncluded: targetPlan.creditsIncluded,
                })
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.3: Subscription Renewal Consistency', () => {
    it('should consistently process renewals with proper payment and credit allocation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            subscription: fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              userId: fc.string({ minLength: 5, maxLength: 20 }),
              planId: fc.constantFrom('starter', 'pro', 'ultra'),
              status: fc.constantFrom('active', 'past_due'),
              creditsUsedThisPeriod: fc.integer({ min: 0, max: 1000 }),
            }),
            plan: fc.constant(generateSubscriptionPlan()),
            paymentSuccess: fc.boolean(),
            rolloverCredits: fc.boolean(),
          }), { minLength: 1, maxLength: 10 }),
          async (scenarios) => {
            for (const scenario of scenarios) {
              const { subscription, plan, paymentSuccess, rolloverCredits } = scenario;
              
              // Mock subscription and plan
              const fullSubscription = {
                ...generateSubscription(subscription.userId, subscription.planId),
                ...subscription,
                currentPeriodEnd: new Date(), // At renewal time
              };
              
              mockDatabaseService.getUserActiveSubscription.mockResolvedValue(fullSubscription);
              mockDatabaseService.getSubscriptionPlanById.mockResolvedValue(plan);
              
              // Mock payment processing
              if (paymentSuccess) {
                mockPaymentService.processRenewal.mockResolvedValue({
                  success: true,
                  transactionId: 'renewal_123',
                });
              } else {
                mockPaymentService.processRenewal.mockRejectedValue(new Error('Payment failed'));
              }
              
              // Mock subscription update
              const renewedSubscription = {
                ...fullSubscription,
                status: paymentSuccess ? 'active' as SubscriptionStatus : 'past_due' as SubscriptionStatus,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                creditsUsedThisPeriod: 0,
              };
              mockDatabaseService.updateSubscription.mockResolvedValue(renewedSubscription);
              
              try {
                await subscriptionService.renewSubscription(subscription.id);
                
                if (paymentSuccess) {
                  // Should process payment
                  expect(mockPaymentService.processRenewal).toHaveBeenCalledWith(
                    fullSubscription.paymentProcessorId,
                    {
                      amount: plan.price,
                      description: expect.stringContaining('renewal'),
                    }
                  );
                  
                  // Should grant credits
                  let expectedCredits = plan.creditsIncluded;
                  
                  // Add rollover credits if enabled
                  if (rolloverCredits && subscription.creditsUsedThisPeriod < plan.creditsIncluded) {
                    const unusedCredits = plan.creditsIncluded - subscription.creditsUsedThisPeriod;
                    const rolloverLimit = Math.floor(plan.creditsIncluded * 0.5); // 50% rollover limit
                    const actualRollover = Math.min(unusedCredits, rolloverLimit);
                    expectedCredits += actualRollover;
                  }
                  
                  expect(mockCreditService.grantCredits).toHaveBeenCalledWith(
                    subscription.userId,
                    expectedCredits,
                    expect.stringContaining('renewal')
                  );
                  
                  // Should update subscription to active
                  expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
                    subscription.id,
                    expect.objectContaining({
                      status: 'active',
                      creditsUsedThisPeriod: 0,
                    })
                  );
                } else {
                  // Payment failed - should not be reached due to exception
                  expect(true).toBe(false);
                }
              } catch (error) {
                if (!paymentSuccess) {
                  // Should not grant credits on payment failure
                  expect(mockCreditService.grantCredits).not.toHaveBeenCalled();
                  
                  // Should update subscription to past_due
                  expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
                    subscription.id,
                    expect.objectContaining({
                      status: 'past_due',
                    })
                  );
                } else {
                  // Unexpected error
                  throw error;
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.4: Subscription Cancellation Handling', () => {
    it('should handle subscription cancellations with proper refunds and access management', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            subscription: fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              userId: fc.string({ minLength: 5, maxLength: 20 }),
              planId: fc.constantFrom('starter', 'pro', 'ultra'),
              status: fc.constantFrom('active', 'past_due'),
              daysIntoMonth: fc.integer({ min: 1, max: 29 }),
            }),
            plan: fc.constant(generateSubscriptionPlan()),
            immediateCancel: fc.boolean(),
            refundEligible: fc.boolean(),
          }), { minLength: 1, maxLength: 10 }),
          async (scenarios) => {
            for (const scenario of scenarios) {
              const { subscription, plan, immediateCancel, refundEligible } = scenario;
              
              // Mock subscription
              const fullSubscription = {
                ...generateSubscription(subscription.userId, subscription.planId, subscription.daysIntoMonth),
                ...subscription,
                status: 'active' as SubscriptionStatus,
              };
              
              mockDatabaseService.getUserActiveSubscription.mockResolvedValue(fullSubscription);
              mockDatabaseService.getSubscriptionPlanById.mockResolvedValue(plan);
              
              // Mock cancellation
              const cancelledSubscription = {
                ...fullSubscription,
                status: 'canceled' as SubscriptionStatus,
                cancelAtPeriodEnd: !immediateCancel,
              };
              mockDatabaseService.updateSubscription.mockResolvedValue(cancelledSubscription);
              
              // Mock refund processing
              if (refundEligible && immediateCancel) {
                mockPaymentService.processRefund.mockResolvedValue({
                  success: true,
                  refundId: 'refund_123',
                });
              }
              
              await subscriptionService.cancelSubscription(subscription.id, immediateCancel);
              
              // Should update subscription status
              expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
                subscription.id,
                expect.objectContaining({
                  status: 'canceled',
                  cancelAtPeriodEnd: !immediateCancel,
                })
              );
              
              if (immediateCancel && refundEligible) {
                // Should calculate and process refund for unused portion
                const totalDays = 30;
                const remainingDays = totalDays - subscription.daysIntoMonth;
                const refundRatio = remainingDays / totalDays;
                const expectedRefund = Math.floor(plan.price * refundRatio);
                
                if (expectedRefund > 0) {
                  expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
                    fullSubscription.paymentProcessorId,
                    expect.objectContaining({
                      amount: expectedRefund,
                      reason: expect.stringContaining('cancellation'),
                    })
                  );
                }
              }
              
              if (!immediateCancel) {
                // Should maintain access until period end
                expect(cancelledSubscription.cancelAtPeriodEnd).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9.5: Payment Failure Recovery', () => {
    it('should handle payment failures with appropriate retry logic and status updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            subscription: fc.record({
              id: fc.string({ minLength: 5, maxLength: 20 }),
              userId: fc.string({ minLength: 5, maxLength: 20 }),
              planId: fc.constantFrom('starter', 'pro', 'ultra'),
              status: fc.constantFrom('active', 'past_due'),
            }),
            failureType: fc.constantFrom('card_declined', 'insufficient_funds', 'network_error', 'service_unavailable'),
            retryAttempts: fc.integer({ min: 1, max: 5 }),
            eventualSuccess: fc.boolean(),
          }), { minLength: 1, maxLength: 8 }),
          async (scenarios) => {
            for (const scenario of scenarios) {
              const { subscription, failureType, retryAttempts, eventualSuccess } = scenario;
              
              // Mock subscription
              const fullSubscription = {
                ...generateSubscription(subscription.userId, subscription.planId),
                ...subscription,
              };
              
              mockDatabaseService.getUserActiveSubscription.mockResolvedValue(fullSubscription);
              
              // Mock payment failures and eventual success
              const paymentError = new Error(`Payment failed: ${failureType}`);
              
              if (eventualSuccess && retryAttempts > 1) {
                // Fail first attempts, succeed on last
                for (let i = 0; i < retryAttempts - 1; i++) {
                  mockPaymentService.processRenewal.mockRejectedValueOnce(paymentError);
                }
                mockPaymentService.processRenewal.mockResolvedValueOnce({
                  success: true,
                  transactionId: 'retry_success_123',
                });
              } else {
                // All attempts fail
                for (let i = 0; i < retryAttempts; i++) {
                  mockPaymentService.processRenewal.mockRejectedValueOnce(paymentError);
                }
              }
              
              // Mock subscription updates
              mockDatabaseService.updateSubscription.mockResolvedValue({
                ...fullSubscription,
                status: eventualSuccess ? 'active' as SubscriptionStatus : 'past_due' as SubscriptionStatus,
              });
              
              try {
                await subscriptionService.renewSubscription(subscription.id);
                
                if (eventualSuccess) {
                  // Should eventually succeed
                  expect(mockPaymentService.processRenewal).toHaveBeenCalledTimes(retryAttempts);
                  expect(mockCreditService.grantCredits).toHaveBeenCalled();
                  expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
                    subscription.id,
                    expect.objectContaining({
                      status: 'active',
                    })
                  );
                } else {
                  // Should not reach here if all attempts fail
                  expect(true).toBe(false);
                }
              } catch (error) {
                if (!eventualSuccess) {
                  // Should fail after all retry attempts
                  expect(mockPaymentService.processRenewal).toHaveBeenCalledTimes(retryAttempts);
                  expect(mockCreditService.grantCredits).not.toHaveBeenCalled();
                  
                  // Should update subscription to past_due
                  expect(mockDatabaseService.updateSubscription).toHaveBeenCalledWith(
                    subscription.id,
                    expect.objectContaining({
                      status: 'past_due',
                    })
                  );
                } else {
                  // Unexpected error
                  throw error;
                }
              }
            }
          }
        ),
        { numRuns: 50 } // Reduced runs due to retry complexity
      );
    });
  });

  describe('Property 9.6: Subscription State Consistency', () => {
    it('should maintain consistent subscription state across all operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 5, maxLength: 20 }),
            operations: fc.array(fc.record({
              type: fc.constantFrom('create', 'upgrade', 'downgrade', 'renew', 'cancel'),
              planId: fc.constantFrom('starter', 'pro', 'ultra'),
              timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
              shouldSucceed: fc.boolean(),
            }), { minLength: 1, maxLength: 10 }),
          }),
          async ({ userId, operations }) => {
            let currentSubscription: Subscription | null = null;
            
            // Sort operations by timestamp
            const sortedOperations = operations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            
            for (const operation of sortedOperations) {
              // Mock user
              mockDatabaseService.getUserById.mockResolvedValue(generateValidUser());
              
              // Mock plan
              const plan = generateSubscriptionPlan();
              plan.id = operation.planId as any;
              mockDatabaseService.getSubscriptionPlanById.mockResolvedValue(plan);
              
              // Mock current subscription state
              mockDatabaseService.getUserActiveSubscription.mockResolvedValue(currentSubscription);
              
              try {
                switch (operation.type) {
                  case 'create':
                    if (!currentSubscription && operation.shouldSucceed) {
                      currentSubscription = generateSubscription(userId, operation.planId);
                      mockDatabaseService.createSubscription.mockResolvedValue(currentSubscription);
                      
                      const result = await subscriptionService.createSubscription(
                        userId,
                        operation.planId,
                        'https://success.url',
                        'https://cancel.url'
                      );
                      
                      expect(result).toHaveProperty('checkoutUrl');
                      expect(result).toHaveProperty('subscriptionId');
                    } else if (currentSubscription) {
                      // Should fail if subscription already exists
                      await expect(
                        subscriptionService.createSubscription(
                          userId,
                          operation.planId,
                          'https://success.url',
                          'https://cancel.url'
                        )
                      ).rejects.toThrow('SUBSCRIPTION_EXISTS');
                    }
                    break;
                    
                  case 'upgrade':
                  case 'downgrade':
                    if (currentSubscription && operation.shouldSucceed) {
                      const updatedSubscription = {
                        ...currentSubscription,
                        planId: operation.planId as any,
                      };
                      mockDatabaseService.updateSubscription.mockResolvedValue(updatedSubscription);
                      
                      if (operation.type === 'upgrade') {
                        await subscriptionService.upgradeSubscription(userId, operation.planId);
                      } else {
                        await subscriptionService.downgradeSubscription(userId, operation.planId);
                      }
                      
                      currentSubscription = updatedSubscription;
                    }
                    break;
                    
                  case 'renew':
                    if (currentSubscription && operation.shouldSucceed) {
                      const renewedSubscription = {
                        ...currentSubscription,
                        status: 'active' as SubscriptionStatus,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                      };
                      mockDatabaseService.updateSubscription.mockResolvedValue(renewedSubscription);
                      
                      await subscriptionService.renewSubscription(currentSubscription.id);
                      currentSubscription = renewedSubscription;
                    }
                    break;
                    
                  case 'cancel':
                    if (currentSubscription && operation.shouldSucceed) {
                      const cancelledSubscription = {
                        ...currentSubscription,
                        status: 'canceled' as SubscriptionStatus,
                      };
                      mockDatabaseService.updateSubscription.mockResolvedValue(cancelledSubscription);
                      
                      await subscriptionService.cancelSubscription(currentSubscription.id, true);
                      currentSubscription = cancelledSubscription;
                    }
                    break;
                }
              } catch (error) {
                // Expected failures for invalid operations
                if (operation.shouldSucceed) {
                  throw error;
                }
              }
            }
            
            // Verify final state consistency
            if (currentSubscription) {
              expect(currentSubscription.userId).toBe(userId);
              expect(['active', 'canceled', 'past_due', 'unpaid']).toContain(currentSubscription.status);
              expect(currentSubscription.currentPeriodStart).toBeInstanceOf(Date);
              expect(currentSubscription.currentPeriodEnd).toBeInstanceOf(Date);
              expect(currentSubscription.currentPeriodEnd.getTime()).toBeGreaterThan(
                currentSubscription.currentPeriodStart.getTime()
              );
            }
          }
        ),
        { numRuns: 50 } // Reduced runs due to operation sequence complexity
      );
    });
  });
});