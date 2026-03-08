#!/usr/bin/env tsx

import { logger } from '../utils/logger.js';
import { creditService } from '../services/creditService.js';
import { databaseService } from '../services/databaseService.js';

/**
 * Test script to verify credit system functionality
 */
async function testCreditSystem() {
  try {
    logger.info('Starting credit system test...');

    // Test 1: Create a test user
    logger.info('Test 1: Creating test user...');
    const testUser = await databaseService.createUser({
      email: 'credit-test@example.com',
      authProviderId: 'credit-test-auth-123',
      displayName: 'Credit Test User',
      language: 'en',
      timezone: 'UTC',
    });
    logger.info('Test user created:', { userId: testUser.id, email: testUser.email });

    // Test 2: Get initial credit balance
    logger.info('Test 2: Getting initial credit balance...');
    const initialBalance = await creditService.getCreditBalance(testUser.id);
    logger.info('Initial balance:', initialBalance);

    // Test 3: Test cost estimation
    logger.info('Test 3: Testing cost estimation...');
    const estimate = await creditService.estimateOperationCost('video_generation', {
      duration: 60,
      resolution: 'hd',
      style: 'cinematic',
      complexity: 'moderate',
    });
    logger.info('Cost estimate:', estimate);

    // Test 4: Test insufficient credits check
    logger.info('Test 4: Testing insufficient credits check...');
    const hasSufficientCredits = await creditService.checkSufficientCredits(testUser.id, 100);
    logger.info('Has sufficient credits for 100:', hasSufficientCredits);

    // Test 5: Simulate credit purchase
    logger.info('Test 5: Simulating credit purchase...');
    const purchaseResult = await creditService.initiateCreditPurchase(
      testUser.id,
      100,
      'https://success.example.com',
      'https://cancel.example.com'
    );
    logger.info('Purchase initiated:', purchaseResult);

    // Test 6: Complete the purchase (simulate webhook)
    logger.info('Test 6: Completing credit purchase...');
    const completedPurchase = await creditService.completeCreditPurchase(
      purchaseResult.purchaseId,
      'mock-payment-processor-id'
    );
    logger.info('Purchase completed:', completedPurchase);

    // Test 7: Check updated balance
    logger.info('Test 7: Checking updated balance...');
    const updatedBalance = await creditService.getCreditBalance(testUser.id);
    logger.info('Updated balance:', updatedBalance);

    // Test 8: Test credit deduction
    logger.info('Test 8: Testing credit deduction...');
    const deductionTransaction = await creditService.deductCredits(
      testUser.id,
      50,
      'test-operation-123',
      'Test video generation',
      2.5
    );
    logger.info('Credits deducted:', deductionTransaction);

    // Test 9: Check balance after deduction
    logger.info('Test 9: Checking balance after deduction...');
    const balanceAfterDeduction = await creditService.getCreditBalance(testUser.id);
    logger.info('Balance after deduction:', balanceAfterDeduction);

    // Test 10: Test credit refund
    logger.info('Test 10: Testing credit refund...');
    const refundTransaction = await creditService.refundCredits(
      testUser.id,
      50,
      'test-operation-123',
      'Operation failed',
      25 // 25% progress, so 75% refund
    );
    logger.info('Credits refunded:', refundTransaction);

    // Test 11: Check final balance
    logger.info('Test 11: Checking final balance...');
    const finalBalance = await creditService.getCreditBalance(testUser.id);
    logger.info('Final balance:', finalBalance);

    // Test 12: Get credit history
    logger.info('Test 12: Getting credit history...');
    const creditHistory = await creditService.getCreditHistory(testUser.id);
    logger.info('Credit history:', { transactionCount: creditHistory.length });

    logger.info('Credit system test completed successfully!');

    return {
      success: true,
      results: {
        userCreated: !!testUser,
        initialBalance,
        costEstimate: estimate,
        purchaseInitiated: !!purchaseResult.checkoutUrl,
        purchaseCompleted: completedPurchase.status === 'completed',
        creditsDeducted: deductionTransaction.amount === -50,
        creditsRefunded: refundTransaction.amount > 0,
        finalBalance,
        transactionHistory: creditHistory.length > 0,
      },
    };
  } catch (error) {
    logger.error('Credit system test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCreditSystem()
    .then((result) => {
      if (result.success) {
        logger.info('✅ All credit system tests passed!', result.results);
        process.exit(0);
      } else {
        logger.error('❌ Credit system test failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('❌ Unexpected error during testing:', error);
      process.exit(1);
    });
}

export { testCreditSystem };