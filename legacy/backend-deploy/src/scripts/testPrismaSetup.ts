#!/usr/bin/env tsx

import { initializePrisma, disconnectPrisma, checkDatabaseHealth } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script to verify Prisma setup is working correctly
 */
async function testPrismaSetup() {
  try {
    logger.info('Testing Prisma ORM setup...');

    // Test 1: Initialize Prisma
    logger.info('1. Initializing Prisma client...');
    const prisma = await initializePrisma();
    logger.info('✓ Prisma client initialized successfully');

    // Test 2: Check database health
    logger.info('2. Checking database health...');
    const isHealthy = await checkDatabaseHealth();
    if (isHealthy) {
      logger.info('✓ Database connection is healthy');
    } else {
      throw new Error('Database health check failed');
    }

    // Test 3: Test basic query (count users)
    logger.info('3. Testing basic database query...');
    const userCount = await prisma.user.count();
    logger.info(`✓ Database query successful - Found ${userCount} users`);

    // Test 4: Test reference data queries
    logger.info('4. Testing reference data queries...');
    const [planCount, styleCount, languageCount] = await Promise.all([
      prisma.subscriptionPlan.count(),
      prisma.videoStyle.count(),
      prisma.supportedLanguage.count(),
    ]);
    
    logger.info(`✓ Reference data queries successful:`);
    logger.info(`  - Subscription plans: ${planCount}`);
    logger.info(`  - Video styles: ${styleCount}`);
    logger.info(`  - Supported languages: ${languageCount}`);

    // Test 5: Test schema introspection
    logger.info('5. Testing schema introspection...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    ` as any[];
    
    logger.info(`✓ Schema introspection successful - Found ${tables.length} tables:`);
    tables.forEach((table: any) => {
      logger.info(`  - ${table.table_name}`);
    });

    // Test 6: Test transaction capability
    logger.info('6. Testing transaction capability...');
    await prisma.$transaction(async (tx) => {
      const result = await tx.$queryRaw`SELECT 1 as test`;
      logger.info('✓ Transaction test successful');
    });

    logger.info('🎉 All Prisma setup tests passed successfully!');
    logger.info('');
    logger.info('Setup Summary:');
    logger.info('- Prisma client: ✓ Working');
    logger.info('- Database connection: ✓ Healthy');
    logger.info('- Schema: ✓ Deployed');
    logger.info('- Queries: ✓ Functional');
    logger.info('- Transactions: ✓ Working');
    logger.info('');
    logger.info('Your Prisma ORM setup is ready for development!');

  } catch (error) {
    logger.error('❌ Prisma setup test failed:', error);
    throw error;
  } finally {
    await disconnectPrisma();
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPrismaSetup()
    .then(() => {
      logger.info('Prisma setup test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Prisma setup test failed:', error);
      process.exit(1);
    });
}

export { testPrismaSetup };