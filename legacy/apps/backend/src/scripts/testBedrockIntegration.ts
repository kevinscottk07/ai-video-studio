#!/usr/bin/env tsx

/**
 * Test script for AWS Bedrock integration
 * This script validates the AI service functionality without requiring a full server setup
 */

import 'dotenv/config';
import { aiService } from '../services/aiService.js';
import { logger } from '../utils/logger.js';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
  data?: any;
}

class BedrockIntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting AWS Bedrock Integration Tests\n');

    await this.testHealthCheck();
    await this.testCostEstimation();
    await this.testScriptGeneration();
    await this.testMultiLanguageSupport();
    await this.testErrorHandling();

    this.printResults();
  }

  private async testHealthCheck(): Promise<void> {
    const testName = 'Health Check';
    const startTime = Date.now();

    try {
      console.log('🔍 Testing AI service health check...');
      
      const health = await aiService.healthCheck();
      const duration = Date.now() - startTime;

      if (health.status === 'ok') {
        this.results.push({
          test: testName,
          status: 'PASS',
          message: 'AI service is healthy and responsive',
          duration,
          data: health.details,
        });
        console.log('✅ Health check passed');
      } else {
        this.results.push({
          test: testName,
          status: 'FAIL',
          message: `Health check failed: ${JSON.stringify(health.details)}`,
          duration,
        });
        console.log('❌ Health check failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Health check error: ${error instanceof Error ? error.message : error}`,
        duration,
      });
      console.log('❌ Health check error:', error);
    }
  }

  private async testCostEstimation(): Promise<void> {
    const testName = 'Cost Estimation';
    const startTime = Date.now();

    try {
      console.log('💰 Testing cost estimation...');

      const request = {
        prompt: 'Create a professional video script about artificial intelligence and its impact on modern business',
        language: 'en',
        style: 'professional' as const,
        duration: 60,
      };

      const estimate = await aiService.estimateScriptGenerationCost(request);
      const duration = Date.now() - startTime;

      // Validate estimate structure
      const isValid = 
        estimate.awsCost > 0 &&
        estimate.creditsRequired > 0 &&
        estimate.breakdown.inputTokens > 0 &&
        estimate.breakdown.outputTokens > 0 &&
        estimate.breakdown.estimatedInputCost >= 0 &&
        estimate.breakdown.estimatedOutputCost >= 0;

      if (isValid) {
        this.results.push({
          test: testName,
          status: 'PASS',
          message: `Cost estimation successful: ${estimate.creditsRequired} credits, $${estimate.awsCost.toFixed(4)} AWS cost`,
          duration,
          data: estimate,
        });
        console.log('✅ Cost estimation passed');
        console.log(`   Credits required: ${estimate.creditsRequired}`);
        console.log(`   AWS cost: $${estimate.awsCost.toFixed(4)}`);
      } else {
        this.results.push({
          test: testName,
          status: 'FAIL',
          message: 'Invalid cost estimation structure',
          duration,
          data: estimate,
        });
        console.log('❌ Cost estimation failed - invalid structure');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Cost estimation error: ${error instanceof Error ? error.message : error}`,
        duration,
      });
      console.log('❌ Cost estimation error:', error);
    }
  }

  private async testScriptGeneration(): Promise<void> {
    const testName = 'Script Generation';
    const startTime = Date.now();

    try {
      console.log('📝 Testing script generation...');

      const request = {
        prompt: 'Create a short video script about the benefits of renewable energy for a general audience',
        language: 'en',
        style: 'educational' as const,
        duration: 45,
        targetAudience: 'general public',
      };

      const result = await aiService.generateScript(request);
      const duration = Date.now() - startTime;

      // Validate result structure
      const isValid = 
        typeof result.script === 'string' &&
        result.script.length > 0 &&
        result.metadata.wordCount > 0 &&
        result.metadata.language === 'en' &&
        result.metadata.style === 'educational' &&
        result.usage.totalTokens > 0 &&
        result.cost.awsCost > 0 &&
        result.cost.creditsRequired > 0;

      if (isValid) {
        this.results.push({
          test: testName,
          status: 'PASS',
          message: `Script generated successfully: ${result.metadata.wordCount} words, ${result.usage.totalTokens} tokens`,
          duration,
          data: {
            scriptLength: result.script.length,
            wordCount: result.metadata.wordCount,
            tokens: result.usage.totalTokens,
            cost: result.cost.awsCost,
            credits: result.cost.creditsRequired,
          },
        });
        console.log('✅ Script generation passed');
        console.log(`   Script length: ${result.script.length} characters`);
        console.log(`   Word count: ${result.metadata.wordCount}`);
        console.log(`   Tokens used: ${result.usage.totalTokens}`);
        console.log(`   Cost: ${result.cost.creditsRequired} credits`);
      } else {
        this.results.push({
          test: testName,
          status: 'FAIL',
          message: 'Invalid script generation result structure',
          duration,
          data: result,
        });
        console.log('❌ Script generation failed - invalid structure');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Check if it's a configuration error (expected in test environment)
      if (error instanceof Error && (
        error.message.includes('credentials') ||
        error.message.includes('Authentication failed') ||
        error.message.includes('region')
      )) {
        this.results.push({
          test: testName,
          status: 'SKIP',
          message: 'Skipped due to missing AWS configuration (expected in test environment)',
          duration,
        });
        console.log('⏭️  Script generation skipped - AWS configuration required');
      } else {
        this.results.push({
          test: testName,
          status: 'FAIL',
          message: `Script generation error: ${error.message}`,
          duration,
        });
        console.log('❌ Script generation error:', error);
      }
    }
  }

  private async testMultiLanguageSupport(): Promise<void> {
    const testName = 'Multi-language Support';
    const startTime = Date.now();

    try {
      console.log('🌍 Testing multi-language support...');

      const languages = ['en', 'es', 'fr'];
      const basePrompt = 'Create a short video script about technology';
      let passedLanguages = 0;

      for (const language of languages) {
        try {
          const estimate = await aiService.estimateScriptGenerationCost({
            prompt: basePrompt,
            language,
            duration: 30,
          });

          if (estimate.awsCost > 0 && estimate.creditsRequired > 0) {
            passedLanguages++;
            console.log(`   ✅ ${language}: estimation successful`);
          } else {
            console.log(`   ❌ ${language}: invalid estimation`);
          }
        } catch (error) {
          console.log(`   ❌ ${language}: error - ${error instanceof Error ? error.message : error}`);
        }
      }

      const duration = Date.now() - startTime;

      if (passedLanguages === languages.length) {
        this.results.push({
          test: testName,
          status: 'PASS',
          message: `All ${languages.length} languages supported successfully`,
          duration,
          data: { supportedLanguages: languages, passedCount: passedLanguages },
        });
        console.log('✅ Multi-language support passed');
      } else if (passedLanguages > 0) {
        this.results.push({
          test: testName,
          status: 'FAIL',
          message: `Only ${passedLanguages}/${languages.length} languages passed`,
          duration,
          data: { supportedLanguages: languages, passedCount: passedLanguages },
        });
        console.log(`⚠️  Multi-language support partial: ${passedLanguages}/${languages.length}`);
      } else {
        this.results.push({
          test: testName,
          status: 'FAIL',
          message: 'No languages passed the test',
          duration,
        });
        console.log('❌ Multi-language support failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Multi-language test error: ${error instanceof Error ? error.message : error}`,
        duration,
      });
      console.log('❌ Multi-language test error:', error);
    }
  }

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling';
    const startTime = Date.now();

    try {
      console.log('🛡️  Testing error handling...');

      // Test with invalid input
      const invalidRequest = {
        prompt: '', // Empty prompt should trigger validation
        language: 'invalid',
        duration: -1,
      };

      try {
        await aiService.estimateScriptGenerationCost(invalidRequest as any);
        
        // If we get here, error handling failed
        this.results.push({
          test: testName,
          status: 'FAIL',
          message: 'Error handling failed - invalid input was accepted',
          duration: Date.now() - startTime,
        });
        console.log('❌ Error handling failed - invalid input accepted');
      } catch (error) {
        // This is expected - error handling is working
        const duration = Date.now() - startTime;
        this.results.push({
          test: testName,
          status: 'PASS',
          message: 'Error handling working correctly - invalid input rejected',
          duration,
          data: { errorMessage: error instanceof Error ? error.message : error },
        });
        console.log('✅ Error handling passed - invalid input properly rejected');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: `Error handling test failed: ${error instanceof Error ? error.message : error}`,
        duration,
      });
      console.log('❌ Error handling test failed:', error);
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary');
    console.log('========================\n');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`Success Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%\n`);

    // Detailed results
    this.results.forEach((result, index) => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⏭️' ' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      
      console.log(`${index + 1}. ${statusIcon} ${result.test}${duration}`);
      console.log(`   ${result.message}`);
      
      if (result.data && Object.keys(result.data).length > 0) {
        console.log(`   Data: ${JSON.stringify(result.data, null, 2).replace(/\n/g, '\n   ')}`);
      }
      console.log('');
    });

    // Overall status
    if (failed === 0) {
      console.log('🎉 All tests passed! AWS Bedrock integration is working correctly.');
    } else if (passed > 0) {
      console.log('⚠️  Some tests failed. Check the configuration and try again.');
    } else {
      console.log('💥 All tests failed. Please check your AWS configuration and credentials.');
    }

    console.log('\n📝 Next Steps:');
    console.log('1. Ensure AWS credentials are properly configured');
    console.log('2. Verify Bedrock model access in your AWS account');
    console.log('3. Check environment variables in .env file');
    console.log('4. Review the detailed error messages above');
  }
}

// Run the tests
async function main() {
  const tester = new BedrockIntegrationTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { BedrockIntegrationTester };