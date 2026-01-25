#!/usr/bin/env tsx

import { initializePrisma, disconnectPrisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import { seedDatabase } from './seed.js';
import { seedModerationData } from './seedModerationData.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * UAT Demo Data Seeding Script
 * Creates comprehensive demo data for user acceptance testing
 */
async function seedUATData() {
  const prisma = await initializePrisma();

  try {
    logger.info('Starting UAT demo data seeding...');

    // First run the base seeding
    logger.info('Running base database seeding...');
    await seedDatabase();

    // Seed moderation data
    logger.info('Running moderation data seeding...');
    await seedModerationData();

    // Create demo users for different scenarios
    logger.info('Creating demo users...');
    const demoUsers = [
      {
        id: 'demo-user-free',
        email: 'demo.free@aivideostudio.com',
        authProviderId: 'auth0|demo-free-user',
        displayName: 'Free User Demo',
        profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        language: 'en',
        timezone: 'America/New_York',
        creditBalance: 25,
        totalCreditsEver: 25,
        role: 'user' as const,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'demo-user-starter',
        email: 'demo.starter@aivideostudio.com',
        authProviderId: 'auth0|demo-starter-user',
        displayName: 'Starter User Demo',
        profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        language: 'en',
        timezone: 'America/Los_Angeles',
        creditBalance: 150,
        totalCreditsEver: 300,
        role: 'user' as const,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'demo-user-pro',
        email: 'demo.pro@aivideostudio.com',
        authProviderId: 'auth0|demo-pro-user',
        displayName: 'Pro User Demo',
        profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        language: 'en',
        timezone: 'Europe/London',
        creditBalance: 750,
        totalCreditsEver: 1500,
        role: 'user' as const,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'demo-user-ultra',
        email: 'demo.ultra@aivideostudio.com',
        authProviderId: 'auth0|demo-ultra-user',
        displayName: 'Ultra User Demo',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        language: 'en',
        timezone: 'Asia/Tokyo',
        creditBalance: 2500,
        totalCreditsEver: 5000,
        role: 'user' as const,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'demo-admin',
        email: 'demo.admin@aivideostudio.com',
        authProviderId: 'auth0|demo-admin-user',
        displayName: 'Admin Demo User',
        profileImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
        language: 'en',
        timezone: 'UTC',
        creditBalance: 10000,
        totalCreditsEver: 10000,
        role: 'admin' as const,
        isActive: true,
        lastLoginAt: new Date(),
      },
      {
        id: 'demo-moderator',
        email: 'demo.moderator@aivideostudio.com',
        authProviderId: 'auth0|demo-moderator-user',
        displayName: 'Moderator Demo User',
        profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
        language: 'en',
        timezone: 'America/Chicago',
        creditBalance: 1000,
        totalCreditsEver: 2000,
        role: 'moderator' as const,
        isActive: true,
        lastLoginAt: new Date(),
      },
    ];

    for (const user of demoUsers) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: user,
      });
    }

    logger.info(`Created ${demoUsers.length} demo users`);

    // Create subscriptions for demo users
    logger.info('Creating demo subscriptions...');
    const subscriptions = [
      {
        userId: 'demo-user-starter',
        planId: 'starter' as const,
        paymentProcessorId: 'demo_sub_starter_001',
        status: 'active' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        creditsIncluded: 100,
        creditsUsedThisPeriod: 25,
      },
      {
        userId: 'demo-user-pro',
        planId: 'pro' as const,
        paymentProcessorId: 'demo_sub_pro_001',
        status: 'active' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        creditsIncluded: 500,
        creditsUsedThisPeriod: 150,
      },
      {
        userId: 'demo-user-ultra',
        planId: 'ultra' as const,
        paymentProcessorId: 'demo_sub_ultra_001',
        status: 'active' as const,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        creditsIncluded: 2000,
        creditsUsedThisPeriod: 500,
      },
    ];

    for (const subscription of subscriptions) {
      await prisma.subscription.upsert({
        where: { 
          userId_planId: { 
            userId: subscription.userId, 
            planId: subscription.planId 
          } 
        },
        update: {},
        create: subscription,
      });
    }

    logger.info(`Created ${subscriptions.length} demo subscriptions`);

    // Create demo projects
    logger.info('Creating demo projects...');
    const projects = [
      {
        id: 'demo-project-1',
        userId: 'demo-user-starter',
        title: 'Product Launch Video',
        description: 'Exciting product launch video for our new mobile app',
        settings: {
          resolution: 'hd',
          duration: 60,
          language: 'en',
          style: 'advertisement',
          musicEnabled: true,
          musicGenre: 'upbeat',
        },
        status: 'completed' as const,
        isPublic: true,
        communityMetrics: {
          likes: 24,
          comments: 8,
          shares: 5,
          views: 156,
        },
      },
      {
        id: 'demo-project-2',
        userId: 'demo-user-pro',
        title: 'Educational Tutorial Series',
        description: 'Comprehensive tutorial on AI video creation techniques',
        settings: {
          resolution: 'hd',
          duration: 180,
          language: 'en',
          style: 'educational',
          musicEnabled: true,
          musicGenre: 'ambient',
        },
        status: 'completed' as const,
        isPublic: true,
        communityMetrics: {
          likes: 67,
          comments: 23,
          shares: 12,
          views: 342,
        },
      },
      {
        id: 'demo-project-3',
        userId: 'demo-user-ultra',
        title: 'Cinematic Brand Story',
        description: 'High-end cinematic video showcasing our brand values',
        settings: {
          resolution: 'ultra',
          duration: 120,
          language: 'en',
          style: 'cinematic',
          musicEnabled: true,
          musicGenre: 'cinematic',
        },
        status: 'completed' as const,
        isPublic: true,
        communityMetrics: {
          likes: 89,
          comments: 31,
          shares: 18,
          views: 523,
        },
      },
      {
        id: 'demo-project-4',
        userId: 'demo-user-free',
        title: 'Social Media Promo',
        description: 'Quick social media promotional video',
        settings: {
          resolution: 'standard',
          duration: 30,
          language: 'en',
          style: 'social_media',
          musicEnabled: true,
          musicGenre: 'electronic',
        },
        status: 'generating' as const,
        isPublic: false,
        communityMetrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
        },
      },
      {
        id: 'demo-project-5',
        userId: 'demo-user-pro',
        title: 'VR Experience Demo',
        description: 'Immersive VR experience for virtual showroom',
        settings: {
          resolution: 'ultra',
          duration: 300,
          language: 'en',
          style: 'vr',
          musicEnabled: true,
          musicGenre: 'ambient',
        },
        status: 'draft' as const,
        isPublic: false,
        communityMetrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
        },
      },
    ];

    for (const project of projects) {
      await prisma.project.upsert({
        where: { id: project.id },
        update: {},
        create: project,
      });
    }

    logger.info(`Created ${projects.length} demo projects`);

    // Create demo generation jobs
    logger.info('Creating demo generation jobs...');
    const generationJobs = [
      {
        id: 'demo-job-1',
        projectId: 'demo-project-1',
        userId: 'demo-user-starter',
        operationType: 'video_generation' as const,
        requestData: {
          prompt: 'Create an exciting product launch video with modern graphics and upbeat music',
          style: 'advertisement',
          duration: 60,
          resolution: 'hd',
        },
        status: 'completed' as const,
        progress: 100,
        creditsRequired: 75,
        creditsDeducted: 75,
        estimatedAwsCost: 2.50,
        actualAwsCost: 2.35,
        platformProfit: 1.25,
        resultUrl: 'https://demo-videos.s3.amazonaws.com/demo-product-launch.mp4',
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        id: 'demo-job-2',
        projectId: 'demo-project-2',
        userId: 'demo-user-pro',
        operationType: 'video_generation' as const,
        requestData: {
          prompt: 'Educational tutorial on AI video creation with clear explanations and examples',
          style: 'educational',
          duration: 180,
          resolution: 'hd',
        },
        status: 'completed' as const,
        progress: 100,
        creditsRequired: 125,
        creditsDeducted: 125,
        estimatedAwsCost: 4.20,
        actualAwsCost: 4.15,
        platformProfit: 2.10,
        resultUrl: 'https://demo-videos.s3.amazonaws.com/demo-tutorial.mp4',
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        id: 'demo-job-3',
        projectId: 'demo-project-4',
        userId: 'demo-user-free',
        operationType: 'video_generation' as const,
        requestData: {
          prompt: 'Social media promotional video with dynamic transitions',
          style: 'social_media',
          duration: 30,
          resolution: 'standard',
        },
        status: 'processing' as const,
        progress: 65,
        creditsRequired: 35,
        creditsDeducted: 35,
        estimatedAwsCost: 1.20,
        actualAwsCost: null,
        platformProfit: null,
        resultUrl: null,
      },
    ];

    for (const job of generationJobs) {
      await prisma.generationJob.upsert({
        where: { id: job.id },
        update: {},
        create: job,
      });
    }

    logger.info(`Created ${generationJobs.length} demo generation jobs`);

    // Create demo community posts
    logger.info('Creating demo community posts...');
    const communityPosts = [
      {
        id: 'demo-post-1',
        projectId: 'demo-project-1',
        userId: 'demo-user-starter',
        title: 'My First Product Launch Video!',
        description: 'Just created this amazing product launch video using AI. The results are incredible!',
        videoUrl: 'https://demo-videos.s3.amazonaws.com/demo-product-launch.mp4',
        thumbnailUrl: 'https://demo-videos.s3.amazonaws.com/thumbnails/demo-product-launch.jpg',
        tags: ['product-launch', 'advertisement', 'business'],
        isPublic: true,
        allowComments: true,
        allowDownloads: false,
        metrics: {
          likes: 24,
          comments: 8,
          shares: 5,
          views: 156,
        },
      },
      {
        id: 'demo-post-2',
        projectId: 'demo-project-2',
        userId: 'demo-user-pro',
        title: 'AI Video Creation Tutorial',
        description: 'Comprehensive guide on creating professional videos with AI. Perfect for beginners!',
        videoUrl: 'https://demo-videos.s3.amazonaws.com/demo-tutorial.mp4',
        thumbnailUrl: 'https://demo-videos.s3.amazonaws.com/thumbnails/demo-tutorial.jpg',
        tags: ['tutorial', 'education', 'ai-video'],
        isPublic: true,
        allowComments: true,
        allowDownloads: true,
        metrics: {
          likes: 67,
          comments: 23,
          shares: 12,
          views: 342,
        },
      },
      {
        id: 'demo-post-3',
        projectId: 'demo-project-3',
        userId: 'demo-user-ultra',
        title: 'Cinematic Brand Story',
        description: 'High-end cinematic production showcasing the power of AI video generation.',
        videoUrl: 'https://demo-videos.s3.amazonaws.com/demo-cinematic.mp4',
        thumbnailUrl: 'https://demo-videos.s3.amazonaws.com/thumbnails/demo-cinematic.jpg',
        tags: ['cinematic', 'brand', 'professional'],
        isPublic: true,
        allowComments: true,
        allowDownloads: false,
        metrics: {
          likes: 89,
          comments: 31,
          shares: 18,
          views: 523,
        },
      },
    ];

    for (const post of communityPosts) {
      await prisma.communityPost.upsert({
        where: { id: post.id },
        update: {},
        create: post,
      });
    }

    logger.info(`Created ${communityPosts.length} demo community posts`);

    // Create demo comments
    logger.info('Creating demo comments...');
    const comments = [
      {
        postId: 'demo-post-1',
        userId: 'demo-user-pro',
        content: 'Great work! The transitions are really smooth. What style did you use?',
        likes: 3,
      },
      {
        postId: 'demo-post-1',
        userId: 'demo-user-ultra',
        content: 'Love the energy in this video! Perfect for a product launch.',
        likes: 5,
      },
      {
        postId: 'demo-post-2',
        userId: 'demo-user-starter',
        content: 'This tutorial helped me so much! Thank you for sharing.',
        likes: 8,
      },
      {
        postId: 'demo-post-2',
        userId: 'demo-user-free',
        content: 'Amazing quality! Can\'t wait to try these techniques.',
        likes: 4,
      },
      {
        postId: 'demo-post-3',
        userId: 'demo-user-starter',
        content: 'Absolutely stunning! The cinematic quality is incredible.',
        likes: 12,
      },
    ];

    for (const comment of comments) {
      await prisma.comment.create({
        data: comment,
      });
    }

    logger.info(`Created ${comments.length} demo comments`);

    // Create demo credit transactions
    logger.info('Creating demo credit transactions...');
    const creditTransactions = [
      {
        userId: 'demo-user-starter',
        type: 'purchase' as const,
        amount: 100,
        description: 'Credit purchase - Starter plan monthly allocation',
        awsCostCovered: 0,
        platformProfit: 5.00,
      },
      {
        userId: 'demo-user-starter',
        type: 'deduction' as const,
        amount: -75,
        description: 'Video generation - Product Launch Video',
        operationId: 'demo-job-1',
        awsCostCovered: 2.35,
        platformProfit: 1.25,
      },
      {
        userId: 'demo-user-pro',
        type: 'purchase' as const,
        amount: 500,
        description: 'Credit purchase - Pro plan monthly allocation',
        awsCostCovered: 0,
        platformProfit: 25.00,
      },
      {
        userId: 'demo-user-pro',
        type: 'deduction' as const,
        amount: -125,
        description: 'Video generation - Educational Tutorial',
        operationId: 'demo-job-2',
        awsCostCovered: 4.15,
        platformProfit: 2.10,
      },
      {
        userId: 'demo-user-free',
        type: 'purchase' as const,
        amount: 50,
        description: 'One-time credit purchase',
        awsCostCovered: 0,
        platformProfit: 2.50,
      },
    ];

    for (const transaction of creditTransactions) {
      await prisma.creditTransaction.create({
        data: transaction,
      });
    }

    logger.info(`Created ${creditTransactions.length} demo credit transactions`);

    // Create demo media assets
    logger.info('Creating demo media assets...');
    const mediaAssets = [
      {
        projectId: 'demo-project-1',
        filename: 'logo.png',
        originalName: 'company-logo.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(245760), // 240KB
        url: 'https://demo-assets.s3.amazonaws.com/logo.png',
        thumbnailUrl: 'https://demo-assets.s3.amazonaws.com/thumbnails/logo.png',
        metadata: {
          width: 1920,
          height: 1080,
          format: 'PNG',
        },
      },
      {
        projectId: 'demo-project-2',
        filename: 'background-music.mp3',
        originalName: 'ambient-background.mp3',
        mimeType: 'audio/mpeg',
        sizeBytes: BigInt(5242880), // 5MB
        url: 'https://demo-assets.s3.amazonaws.com/background-music.mp3',
        metadata: {
          duration: 180,
          bitrate: 320,
          format: 'MP3',
        },
      },
      {
        projectId: 'demo-project-3',
        filename: 'hero-image.jpg',
        originalName: 'brand-hero-image.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(1048576), // 1MB
        url: 'https://demo-assets.s3.amazonaws.com/hero-image.jpg',
        thumbnailUrl: 'https://demo-assets.s3.amazonaws.com/thumbnails/hero-image.jpg',
        metadata: {
          width: 3840,
          height: 2160,
          format: 'JPEG',
        },
      },
    ];

    for (const asset of mediaAssets) {
      await prisma.mediaAsset.create({
        data: asset,
      });
    }

    logger.info(`Created ${mediaAssets.length} demo media assets`);

    logger.info('UAT demo data seeding completed successfully!');

    // Log summary
    const counts = {
      users: await prisma.user.count(),
      subscriptions: await prisma.subscription.count(),
      projects: await prisma.project.count(),
      generationJobs: await prisma.generationJob.count(),
      communityPosts: await prisma.communityPost.count(),
      comments: await prisma.comment.count(),
      creditTransactions: await prisma.creditTransaction.count(),
      mediaAssets: await prisma.mediaAsset.count(),
    };

    logger.info('UAT seeding summary:', counts);

  } catch (error) {
    logger.error('UAT demo data seeding failed:', error);
    throw error;
  } finally {
    await disconnectPrisma();
  }
}

// Run seeding if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUATData()
    .then(() => {
      logger.info('UAT seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('UAT seeding process failed:', error);
      process.exit(1);
    });
}

export { seedUATData };