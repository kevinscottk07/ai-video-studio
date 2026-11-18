import { contentModerationService } from '../services/contentModerationService.js';
import { logger } from '../utils/logger.js';

async function testModerationSystem() {
  try {
    logger.info('Testing content moderation system...');

    // Test 1: Analyze appropriate content
    logger.info('Test 1: Analyzing appropriate content');
    const appropriateResult = await contentModerationService.analyzeContent(
      'post',
      'test-post-1',
      {
        text: 'This is a great video about cooking healthy meals. I hope you enjoy it!',
        metadata: { test: true },
      }
    );
    
    logger.info('Appropriate content analysis result:', {
      isAppropriate: appropriateResult.isAppropriate,
      confidence: appropriateResult.confidence,
      flags: appropriateResult.flags,
      suggestedAction: appropriateResult.suggestedAction,
    });

    // Test 2: Analyze potentially inappropriate content
    logger.info('Test 2: Analyzing potentially inappropriate content');
    const inappropriateResult = await contentModerationService.analyzeContent(
      'post',
      'test-post-2',
      {
        text: 'This content contains spam and promotional material. Buy now! Click here! Limited time offer!',
        metadata: { test: true },
      }
    );
    
    logger.info('Inappropriate content analysis result:', {
      isAppropriate: inappropriateResult.isAppropriate,
      confidence: inappropriateResult.confidence,
      flags: inappropriateResult.flags,
      suggestedAction: inappropriateResult.suggestedAction,
    });

    // Test 3: Get community guidelines
    logger.info('Test 3: Getting community guidelines');
    const guidelines = await contentModerationService.getCommunityGuidelines();
    logger.info(`Found ${guidelines.length} community guidelines`);

    logger.info('Content moderation system test completed successfully');
  } catch (error) {
    logger.error('Content moderation system test failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testModerationSystem()
    .then(() => {
      logger.info('Moderation system test script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Moderation system test script failed:', error);
      process.exit(1);
    });
}

export { testModerationSystem };