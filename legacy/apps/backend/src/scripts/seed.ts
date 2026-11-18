#!/usr/bin/env tsx

import { initializePrisma, disconnectPrisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database seeding script
 * Populates the database with initial reference data
 */
async function seedDatabase() {
  const prisma = await initializePrisma();

  try {
    logger.info('Starting database seeding...');

    // Seed subscription plans
    logger.info('Seeding subscription plans...');
    await prisma.subscriptionPlan.upsert({
      where: { id: 'free' },
      update: {},
      create: {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        creditsIncluded: 0,
        features: {
          maxDuration: 60,
          maxResolution: 'standard',
          vrSupport: false,
          prioritySupport: false,
          customBranding: false
        },
        isActive: true,
      },
    });

    await prisma.subscriptionPlan.upsert({
      where: { id: 'starter' },
      update: {},
      create: {
        id: 'starter',
        name: 'Starter',
        price: 2900, // $29.00
        interval: 'month',
        creditsIncluded: 100,
        features: {
          maxDuration: 300,
          maxResolution: 'standard',
          vrSupport: false,
          prioritySupport: false,
          customBranding: false
        },
        isActive: true,
      },
    });

    await prisma.subscriptionPlan.upsert({
      where: { id: 'pro' },
      update: {},
      create: {
        id: 'pro',
        name: 'Pro',
        price: 9900, // $99.00
        interval: 'month',
        creditsIncluded: 500,
        features: {
          maxDuration: 7200,
          maxResolution: 'hd',
          vrSupport: false,
          prioritySupport: true,
          customBranding: true
        },
        isActive: true,
      },
    });

    await prisma.subscriptionPlan.upsert({
      where: { id: 'ultra' },
      update: {},
      create: {
        id: 'ultra',
        name: 'Ultra',
        price: 29900, // $299.00
        interval: 'month',
        creditsIncluded: 2000,
        features: {
          maxDuration: 7200,
          maxResolution: 'ultra',
          vrSupport: true,
          prioritySupport: true,
          customBranding: true
        },
        isActive: true,
      },
    });

    // Seed video styles
    logger.info('Seeding video styles...');
    const videoStyles = [
      {
        id: 'social_media',
        name: 'Social Media',
        description: 'Optimized for social media platforms with engaging visuals',
        baseCredits: 25,
        multiplier: 1.0,
      },
      {
        id: 'advertisement',
        name: 'Advertisement',
        description: 'Professional advertising content with compelling messaging',
        baseCredits: 50,
        multiplier: 1.5,
      },
      {
        id: 'educational',
        name: 'Educational',
        description: 'Clear and informative content for learning purposes',
        baseCredits: 35,
        multiplier: 1.2,
      },
      {
        id: 'cinematic',
        name: 'Cinematic',
        description: 'High-quality cinematic production with dramatic effects',
        baseCredits: 75,
        multiplier: 2.0,
      },
      {
        id: 'vr',
        name: 'VR Experience',
        description: 'Immersive virtual reality content',
        baseCredits: 150,
        multiplier: 3.0,
      },
    ];

    for (const style of videoStyles) {
      await prisma.videoStyle.upsert({
        where: { id: style.id },
        update: {},
        create: style,
      });
    }

    // Seed music genres
    logger.info('Seeding music genres...');
    const musicGenres = [
      {
        id: 'ambient',
        name: 'Ambient',
        description: 'Atmospheric and mood-setting background music',
      },
      {
        id: 'corporate',
        name: 'Corporate',
        description: 'Professional and business-appropriate music',
      },
      {
        id: 'electronic',
        name: 'Electronic',
        description: 'Modern electronic and synthesized music',
      },
      {
        id: 'acoustic',
        name: 'Acoustic',
        description: 'Natural acoustic instruments and organic sounds',
      },
      {
        id: 'cinematic',
        name: 'Cinematic',
        description: 'Dramatic and orchestral music for storytelling',
      },
      {
        id: 'upbeat',
        name: 'Upbeat',
        description: 'Energetic and motivational music',
      },
      {
        id: 'relaxing',
        name: 'Relaxing',
        description: 'Calm and soothing background music',
      },
    ];

    for (const genre of musicGenres) {
      await prisma.musicGenre.upsert({
        where: { id: genre.id },
        update: {},
        create: genre,
      });
    }

    // Seed supported languages
    logger.info('Seeding supported languages...');
    const languages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
    ];

    for (const language of languages) {
      await prisma.supportedLanguage.upsert({
        where: { code: language.code },
        update: {},
        create: {
          ...language,
          enabled: true,
        },
      });
    }

    // Seed community tags
    logger.info('Seeding community tags...');
    const communityTags = [
      { name: 'tutorial', description: 'Educational and how-to content', color: '#3B82F6' },
      { name: 'business', description: 'Business and corporate content', color: '#059669' },
      { name: 'creative', description: 'Creative and artistic content', color: '#DC2626' },
      { name: 'tech', description: 'Technology and innovation content', color: '#7C3AED' },
      { name: 'lifestyle', description: 'Lifestyle and personal content', color: '#EA580C' },
      { name: 'entertainment', description: 'Fun and entertaining content', color: '#DB2777' },
      { name: 'news', description: 'News and current events', color: '#0F172A' },
      { name: 'sports', description: 'Sports and fitness content', color: '#16A34A' },
    ];

    for (const tag of communityTags) {
      await prisma.communityTag.upsert({
        where: { name: tag.name },
        update: {},
        create: {
          ...tag,
          usageCount: 0,
          isActive: true,
        },
      });
    }

    // Seed system configuration
    logger.info('Seeding system configuration...');
    const systemConfigs = [
      { key: 'credit_price_cents', value: '5', description: 'Price per credit in cents' },
      { key: 'max_file_size_mb', value: '500', description: 'Maximum file size for uploads in MB' },
      { key: 'max_concurrent_jobs', value: '5', description: 'Maximum concurrent generation jobs per user' },
      { key: 'maintenance_mode', value: 'false', description: 'Whether the system is in maintenance mode' },
      { key: 'enable_community', value: 'true', description: 'Whether community features are enabled' },
      { key: 'enable_realtime', value: 'true', description: 'Whether real-time features are enabled' },
      { key: 'default_language', value: 'en', description: 'Default language for new users' },
      { key: 'max_project_assets', value: '50', description: 'Maximum assets per project' },
    ];

    for (const config of systemConfigs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {},
        create: config,
      });
    }

    logger.info('Database seeding completed successfully!');

    // Log summary
    const counts = {
      subscriptionPlans: await prisma.subscriptionPlan.count(),
      videoStyles: await prisma.videoStyle.count(),
      musicGenres: await prisma.musicGenre.count(),
      supportedLanguages: await prisma.supportedLanguage.count(),
      communityTags: await prisma.communityTag.count(),
      systemConfigs: await prisma.systemConfig.count(),
    };

    logger.info('Seeding summary:', counts);

  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  } finally {
    await disconnectPrisma();
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding process failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };