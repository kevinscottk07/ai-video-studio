import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

const communityGuidelines = [
  {
    title: 'Respectful Communication',
    description: 'All users must communicate respectfully and professionally. Personal attacks, harassment, bullying, or discriminatory language will not be tolerated.',
    category: 'Communication',
    severity: 'high',
  },
  {
    title: 'No Inappropriate Content',
    description: 'Content containing nudity, sexual material, graphic violence, or disturbing imagery is strictly prohibited.',
    category: 'Content Standards',
    severity: 'critical',
  },
  {
    title: 'No Spam or Self-Promotion',
    description: 'Excessive self-promotion, spam, or repetitive content that does not add value to the community is not allowed.',
    category: 'Content Quality',
    severity: 'medium',
  },
  {
    title: 'Respect Intellectual Property',
    description: 'Do not upload or share content that infringes on copyrights, trademarks, or other intellectual property rights.',
    category: 'Legal Compliance',
    severity: 'critical',
  },
  {
    title: 'No Hate Speech',
    description: 'Content promoting hatred, discrimination, or violence against individuals or groups based on race, religion, gender, sexual orientation, or other characteristics is prohibited.',
    category: 'Safety',
    severity: 'critical',
  },
  {
    title: 'Accurate Information',
    description: 'Do not deliberately spread false information, misinformation, or conspiracy theories that could harm individuals or society.',
    category: 'Information Integrity',
    severity: 'high',
  },
  {
    title: 'Privacy Protection',
    description: 'Respect others\' privacy. Do not share personal information, private conversations, or content without consent.',
    category: 'Privacy',
    severity: 'high',
  },
  {
    title: 'Age-Appropriate Content',
    description: 'All content must be appropriate for users aged 13 and above. Content targeting younger audiences should be clearly marked.',
    category: 'Content Standards',
    severity: 'medium',
  },
  {
    title: 'No Illegal Activities',
    description: 'Content promoting, facilitating, or depicting illegal activities is strictly prohibited.',
    category: 'Legal Compliance',
    severity: 'critical',
  },
  {
    title: 'Community Engagement',
    description: 'Engage constructively with the community. Provide helpful feedback, support fellow creators, and contribute positively to discussions.',
    category: 'Community Building',
    severity: 'low',
  },
];

async function seedModerationData() {
  try {
    logger.info('Starting moderation data seeding...');

    // Clear existing guidelines
    await prisma.communityGuideline.deleteMany();
    logger.info('Cleared existing community guidelines');

    // Insert new guidelines
    const createdGuidelines = await prisma.communityGuideline.createMany({
      data: communityGuidelines,
    });

    logger.info(`Created ${createdGuidelines.count} community guidelines`);

    // Create some sample moderation flags for testing (optional)
    if (process.env.NODE_ENV === 'development') {
      logger.info('Development environment detected, creating sample moderation data...');
      
      // Note: In a real scenario, these would be created by the moderation system
      // This is just for testing the admin interface
      
      logger.info('Sample moderation data creation skipped - will be created by actual moderation system');
    }

    logger.info('Moderation data seeding completed successfully');
  } catch (error) {
    logger.error('Failed to seed moderation data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedModerationData()
    .then(() => {
      logger.info('Moderation data seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Moderation data seeding script failed:', error);
      process.exit(1);
    });
}

export { seedModerationData };