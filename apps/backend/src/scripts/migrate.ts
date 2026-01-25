#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { logger } from '../utils/logger.js';
import { initializePrisma, disconnectPrisma } from '../config/prisma.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database migration script
 * Handles Prisma migrations and database setup
 */
async function runMigrations() {
  try {
    logger.info('Starting database migration process...');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    logger.info('DATABASE_URL configured:', {
      url: process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@') // Hide password in logs
    });

    // Generate Prisma client
    logger.info('Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    // Push database schema (for development)
    if (process.env.NODE_ENV === 'development') {
      logger.info('Pushing database schema (development mode)...');
      execSync('npx prisma db push --accept-data-loss', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } else {
      // Deploy migrations (for production)
      logger.info('Deploying database migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    }

    // Test database connection
    logger.info('Testing database connection...');
    const prisma = await initializePrisma();
    
    // Run a simple query to verify connection
    const userCount = await prisma.user.count();
    logger.info('Database connection successful', { userCount });

    // Disconnect
    await disconnectPrisma();

    logger.info('Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  }
}

/**
 * Reset database (development only)
 */
async function resetDatabase() {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }

    logger.warn('Resetting database (development only)...');
    
    execSync('npx prisma migrate reset --force', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    logger.info('Database reset completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database reset failed:', error);
    process.exit(1);
  }
}

/**
 * Create a new migration
 */
async function createMigration(name: string) {
  try {
    logger.info(`Creating new migration: ${name}`);
    
    execSync(`npx prisma migrate dev --name ${name}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    logger.info('Migration created successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration creation failed:', error);
    process.exit(1);
  }
}

/**
 * Seed the database
 */
async function seedDatabase() {
  try {
    logger.info('Seeding database...');
    
    execSync('npx tsx src/scripts/seed.ts', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    logger.info('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'migrate':
    runMigrations();
    break;
  case 'reset':
    resetDatabase();
    break;
  case 'create':
    if (!arg) {
      logger.error('Migration name is required. Usage: npm run db:create <migration-name>');
      process.exit(1);
    }
    createMigration(arg);
    break;
  case 'seed':
    seedDatabase();
    break;
  default:
    logger.info('Available commands:');
    logger.info('  migrate - Run database migrations');
    logger.info('  reset   - Reset database (development only)');
    logger.info('  create  - Create new migration');
    logger.info('  seed    - Seed database with initial data');
    process.exit(0);
}