import { databaseService } from '../services/databaseService.js';
import { logger } from '../utils/logger.js';

/**
 * Seed subscription plans in the database
 */
async function seedSubscriptionPlans() {
  try {
    logger.info('Starting subscription plans seeding...');

    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0, // $0.00
        interval: 'month',
        creditsIncluded: 10,
        features: {
          maxDuration: 60, // 1 minute
          maxResolution: 'standard',
          vrSupport: false,
          prioritySupport: false,
          customBranding: false,
          apiAccess: false,
          whiteLabel: false,
        },
        isActive: true,
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 1900, // $19.00
        interval: 'month',
        creditsIncluded: 100,
        features: {
          maxDuration: 300, // 5 minutes
          maxResolution: 'hd',
          vrSupport: false,
          prioritySupport: true,
          customBranding: false,
          apiAccess: false,
          whiteLabel: false,
        },
        isActive: true,
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 4900, // $49.00
        interval: 'month',
        creditsIncluded: 300,
        features: {
          maxDuration: 7200, // 120 minutes
          maxResolution: 'ultra',
          vrSupport: false,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true,
          whiteLabel: false,
        },
        isActive: true,
      },
      {
        id: 'ultra',
        name: 'Ultra',
        price: 9900, // $99.00
        interval: 'month',
        creditsIncluded: 1000,
        features: {
          maxDuration: -1, // Unlimited
          maxResolution: 'ultra',
          vrSupport: true,
          prioritySupport: true,
          customBranding: true,
          apiAccess: true,
          whiteLabel: true,
        },
        isActive: true,
      },
    ];

    // Use raw database query since we don't have a createSubscriptionPlan method
    const db = databaseService['db']; // Access private db property

    for (const plan of plans) {
      try {
        // Check if plan already exists
        const { data: existingPlan } = await db
          .from('subscription_plans')
          .select('id')
          .eq('id', plan.id)
          .single();

        if (existingPlan) {
          // Update existing plan
          const { error } = await db
            .from('subscription_plans')
            .update({
              name: plan.name,
              price: plan.price,
              interval: plan.interval,
              credits_included: plan.creditsIncluded,
              features: plan.features,
              is_active: plan.isActive,
              updated_at: new Date().toISOString(),
            })
            .eq('id', plan.id);

          if (error) {
            logger.error(`Error updating subscription plan ${plan.id}:`, error);
          } else {
            logger.info(`Updated subscription plan: ${plan.name}`);
          }
        } else {
          // Create new plan
          const { error } = await db
            .from('subscription_plans')
            .insert({
              id: plan.id,
              name: plan.name,
              price: plan.price,
              interval: plan.interval,
              credits_included: plan.creditsIncluded,
              features: plan.features,
              is_active: plan.isActive,
            });

          if (error) {
            logger.error(`Error creating subscription plan ${plan.id}:`, error);
          } else {
            logger.info(`Created subscription plan: ${plan.name}`);
          }
        }
      } catch (error) {
        // Plan doesn't exist, create it
        const { error: createError } = await db
          .from('subscription_plans')
          .insert({
            id: plan.id,
            name: plan.name,
            price: plan.price,
            interval: plan.interval,
            credits_included: plan.creditsIncluded,
            features: plan.features,
            is_active: plan.isActive,
          });

        if (createError) {
          logger.error(`Error creating subscription plan ${plan.id}:`, createError);
        } else {
          logger.info(`Created subscription plan: ${plan.name}`);
        }
      }
    }

    logger.info('Subscription plans seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding subscription plans:', error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptionPlans()
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedSubscriptionPlans };