# Credit System Implementation

## Overview

This document outlines the implementation of the credit purchase and balance tracking system for the AI Video Studio platform, as specified in task 6.1.

## Components Implemented

### 1. Credit Service (`src/services/creditService.ts`)

The main service handling all credit-related operations:

#### Core Features:
- **Credit Balance Management**: Get current balance with detailed breakdown (current, pending, reserved, lifetime)
- **Credit Purchase Flow**: Initiate purchases with LemonSqueezy integration
- **Credit Deduction**: Deduct credits for AI operations with AWS cost tracking
- **Credit Refunds**: Refund credits for failed operations based on progress
- **Cost Estimation**: Calculate credit costs for different operations
- **Transaction History**: Retrieve user's credit transaction history

#### Key Methods:
- `getCreditBalance(userId)`: Get user's credit balance breakdown
- `checkSufficientCredits(userId, amount)`: Verify if user has enough credits
- `initiateCreditPurchase(userId, amount, successUrl, cancelUrl)`: Start purchase flow
- `completeCreditPurchase(purchaseId, paymentProcessorId)`: Complete purchase after payment
- `deductCredits(userId, amount, operationId, description, awsCost)`: Deduct credits for operations
- `refundCredits(userId, originalAmount, operationId, reason, progress)`: Refund credits
- `estimateOperationCost(operationType, parameters)`: Estimate credit cost
- `getCreditHistory(userId, filters, pagination)`: Get transaction history

### 2. Payment Service (`src/services/paymentService.ts`)

Handles LemonSqueezy payment integration:

#### Features:
- **Checkout Creation**: Create secure checkout sessions
- **Webhook Validation**: Validate webhook signatures
- **Event Processing**: Process payment events (completed, failed, refunded)
- **Subscription Management**: Handle subscription checkouts and cancellations

#### Key Methods:
- `createCheckout(params)`: Create LemonSqueezy checkout session
- `validateWebhookSignature(payload, signature)`: Validate webhook security
- `processWebhookEvent(event)`: Process payment events
- `createSubscriptionCheckout(params)`: Create subscription checkout
- `cancelSubscription(subscriptionId)`: Cancel subscription

### 3. API Routes (`src/routes/credits.ts`)

RESTful API endpoints for credit management:

#### Endpoints:
- `GET /api/v1/credits/balance`: Get user's credit balance
- `POST /api/v1/credits/purchase`: Initiate credit purchase
- `POST /api/v1/credits/estimate`: Estimate operation cost
- `GET /api/v1/credits/history`: Get transaction history
- `POST /api/v1/credits/deduct`: Deduct credits (internal)
- `POST /api/v1/credits/refund`: Refund credits (internal)
- `GET /api/v1/credits/admin/stats`: Admin statistics

### 4. Webhook Handler (`src/routes/webhooks.ts`)

Handles LemonSqueezy webhook events:

#### Features:
- **Signature Validation**: Secure webhook validation
- **Event Processing**: Handle purchase completion, failures, and subscriptions
- **Error Handling**: Robust error handling for webhook events

#### Endpoints:
- `POST /api/v1/webhooks/lemonsqueezy`: Process LemonSqueezy events

### 5. Database Schema Updates

Added new table for credit purchases:

```sql
CREATE TABLE "credit_purchases" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "amount" INTEGER NOT NULL,
    "total_cost" INTEGER NOT NULL,
    "payment_processor_id" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 6. Database Service Updates (`src/services/databaseService.ts`)

Extended with credit purchase methods:

#### New Methods:
- `createCreditPurchase(purchaseData)`: Create purchase record
- `getCreditPurchaseById(purchaseId)`: Get purchase by ID
- `updateCreditPurchase(purchaseId, updates)`: Update purchase status
- `getUserCreditPurchases(userId, limit, offset)`: Get user's purchases
- Updated `updateUser()` to handle credit balance updates

### 7. Testing Infrastructure

#### Unit Tests (`src/services/__tests__/creditService.test.ts`)
Comprehensive test suite covering:
- Credit balance operations
- Purchase flow (initiate, complete, fail)
- Credit deduction and refund logic
- Cost estimation
- Transaction history
- Error handling scenarios

#### Integration Test (`src/scripts/testCreditSystem.ts`)
End-to-end test script that verifies:
- User creation
- Credit balance tracking
- Purchase simulation
- Credit operations (deduct, refund)
- Transaction history

#### Test Configuration
- `vitest.config.ts`: Test configuration
- `src/test/setup.ts`: Test setup and mocks

## Credit Pricing Model

### Base Costs
- Script Generation: 5 credits
- Video Generation: 50 credits
- Music Generation: 10 credits
- Voiceover Generation: 15 credits
- Video Editing: 25 credits

### Multipliers
- **Resolution**: Standard (1x), HD (2x), Ultra (4x)
- **Style**: Social Media (1x), Advertisement (1.5x), Educational (1.2x), Cinematic (2x), VR (3x)
- **Complexity**: Simple (0.8x), Moderate (1x), Complex (1.5x)
- **Duration**: Linear scaling based on 60-second baseline

### Pricing
- Default: $0.05 per credit
- AWS cost coverage: ~60% of credit value
- Platform profit: ~40% of credit value

## Security Features

### Payment Security
- Webhook signature validation
- Secure checkout session creation
- Payment processor integration
- Fraud prevention measures

### API Security
- Authentication required for all endpoints
- Rate limiting on purchase endpoints
- Input validation and sanitization
- Audit logging for all transactions

## Error Handling

### Comprehensive Error Coverage
- Invalid credit amounts
- Insufficient credits
- Payment failures
- Network timeouts
- Database errors
- Webhook validation failures

### Graceful Degradation
- Mock payment URLs in development
- Fallback error messages
- Transaction rollback on failures
- Automatic retry mechanisms

## Monitoring and Logging

### Audit Trail
- All credit transactions logged
- Purchase attempts tracked
- Refund operations recorded
- Admin actions audited

### Metrics Tracking
- Credit usage patterns
- Purchase conversion rates
- Refund frequencies
- Revenue analytics

## Environment Configuration

### Required Environment Variables
```bash
LEMONSQUEEZY_API_KEY=your_api_key
LEMONSQUEEZY_STORE_ID=your_store_id
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
```

## Usage Examples

### Purchase Credits
```typescript
const result = await creditService.initiateCreditPurchase(
  userId,
  100, // credits
  'https://success.com',
  'https://cancel.com'
);
// Returns: { checkoutUrl, purchaseId }
```

### Check Balance
```typescript
const balance = await creditService.getCreditBalance(userId);
// Returns: { current, pending, reserved, lifetime }
```

### Estimate Cost
```typescript
const estimate = await creditService.estimateOperationCost('video_generation', {
  duration: 60,
  resolution: 'hd',
  style: 'cinematic'
});
// Returns: { estimatedCredits, estimatedAWSCost, platformProfit, breakdown }
```

### Deduct Credits
```typescript
const transaction = await creditService.deductCredits(
  userId,
  50,
  operationId,
  'Video generation',
  2.5 // AWS cost
);
```

## Requirements Fulfilled

✅ **Requirement 3.1**: Credit cost display before processing  
✅ **Requirement 3.2**: Insufficient credit prevention with purchase options  
✅ **Requirement 3.3**: Credit deduction on successful completion  
✅ **Requirement 3.4**: Credit refund on operation failure  
✅ **Requirement 3.5**: Credit usage history with detailed breakdowns  

## Next Steps

1. **Frontend Integration**: Implement UI components for credit management
2. **Real-time Updates**: Add WebSocket notifications for credit changes
3. **Analytics Dashboard**: Build admin analytics for credit usage
4. **Subscription Integration**: Connect with subscription credit allocations
5. **Performance Optimization**: Add caching for frequently accessed data

## Files Created/Modified

### New Files
- `apps/backend/src/services/creditService.ts`
- `apps/backend/src/services/paymentService.ts`
- `apps/backend/src/routes/credits.ts`
- `apps/backend/src/routes/webhooks.ts`
- `apps/backend/src/services/__tests__/creditService.test.ts`
- `apps/backend/src/scripts/testCreditSystem.ts`
- `apps/backend/vitest.config.ts`
- `apps/backend/src/test/setup.ts`
- `apps/backend/prisma/migrations/20241201000000_add_credit_purchases/migration.sql`

### Modified Files
- `apps/backend/src/routes/index.ts` (added credit and webhook routes)
- `apps/backend/src/services/databaseService.ts` (added credit purchase methods)
- `apps/backend/prisma/schema.prisma` (added CreditPurchase model)
- `packages/types/src/api/generation.ts` (updated EstimateCreditsRequest)

The credit system is now fully implemented and ready for integration with the frontend and AI generation services.