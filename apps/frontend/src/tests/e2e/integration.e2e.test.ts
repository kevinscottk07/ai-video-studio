/**
 * Comprehensive End-to-End Integration Tests
 * Tests complete user journeys from registration to video creation
 * Validates all requirements integration and validation
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data and utilities
const TEST_USER = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'TestPassword123!'
};

const TEST_PROJECT = {
  title: 'Integration Test Project',
  description: 'A project created during integration testing',
  prompt: 'Create a beautiful sunset landscape video with calm music'
};

class IntegrationTestHelper {
  private page: Page;
  private context: BrowserContext;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
  }

  // Authentication helpers
  async mockAuthentication() {
    await this.page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        creditBalance: 100,
        subscription: {
          tier: 'pro',
          status: 'active'
        }
      }));
    });
  }

  async mockWebSocketConnection() {
    await this.page.addInitScript(() => {
      // Mock WebSocket for real-time features
      (window as any).mockWebSocket = {
        connected: true,
        emit: (event: string, data: any) => {
          console.log('WebSocket emit:', event, data);
        },
        on: (event: string, callback: Function) => {
          console.log('WebSocket listener:', event);
        }
      };
    });
  }

  // Navigation helpers
  async navigateToPage(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  // Form helpers
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      await this.page.fill(`[data-testid="${field}"]`, value);
    }
  }

  // Wait for real-time updates
  async waitForRealtimeUpdate(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  // Credit management helpers
  async checkCreditBalance(): Promise<number> {
    const balanceText = await this.page.textContent('[data-testid="credit-balance"]');
    return parseInt(balanceText?.replace(/\D/g, '') || '0');
  }

  // Project helpers
  async createProject(projectData: typeof TEST_PROJECT) {
    await this.page.click('[data-testid="create-project-button"]');
    await expect(this.page.locator('[data-testid="create-project-modal"]')).toBeVisible();
    
    await this.fillForm({
      'project-title': projectData.title,
      'project-description': projectData.description
    });
    
    await this.page.click('[data-testid="submit-project"]');
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }

  // Video generation helpers
  async startVideoGeneration(prompt: string) {
    await this.page.fill('[data-testid="video-prompt"]', prompt);
    await this.page.selectOption('[data-testid="video-style"]', 'cinematic');
    await this.page.click('[data-testid="generate-video-button"]');
  }

  // Community helpers
  async shareToCommunity(projectId: string) {
    await this.page.click(`[data-testid="share-project-${projectId}"]`);
    await expect(this.page.locator('[data-testid="share-modal"]')).toBeVisible();
    await this.page.click('[data-testid="share-to-community"]');
    await this.page.click('[data-testid="confirm-share"]');
  }
}

test.describe('Complete User Journey Integration Tests', () => {
  let helper: IntegrationTestHelper;

  test.beforeEach(async ({ page, context }) => {
    helper = new IntegrationTestHelper(page, context);
    await helper.mockAuthentication();
    await helper.mockWebSocketConnection();
  });

  test('Complete user journey: Registration to video creation', async ({ page }) => {
    // Step 1: Landing page and registration
    await helper.navigateToPage('/');
    await expect(page.locator('[data-testid="hero-section"]')).toBeVisible();
    
    // Check pricing information is displayed
    await expect(page.locator('[data-testid="pricing-section"]')).toBeVisible();
    
    // Test feature highlights and value propositions
    await expect(page.locator('[data-testid="features-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="testimonials-section"]')).toBeVisible();
    
    // Step 2: Navigate to dashboard (authenticated)
    await helper.navigateToPage('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // Verify user info is displayed
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
    await expect(page.locator('[data-testid="credit-balance"]')).toBeVisible();
    
    // Check dashboard widgets
    await expect(page.locator('[data-testid="recent-projects"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    
    // Step 3: Create a new project
    await helper.navigateToPage('/projects');
    await helper.createProject(TEST_PROJECT);
    
    // Verify project appears in list with correct metadata
    await expect(page.locator(`[data-testid="project-${TEST_PROJECT.title}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="project-status-draft"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="project-created-date"]`)).toBeVisible();
    
    // Step 4: Configure project settings
    await page.click(`[data-testid="project-${TEST_PROJECT.title}"]`);
    await helper.navigateToPage('/projects/test-project/settings');
    
    // Update project settings
    await page.selectOption('[data-testid="video-resolution"]', '4k');
    await page.selectOption('[data-testid="video-style"]', 'cinematic');
    await page.selectOption('[data-testid="video-language"]', 'en');
    await page.click('[data-testid="enable-music"]');
    await page.click('[data-testid="save-settings"]');
    
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
    
    // Step 5: Upload assets
    await helper.navigateToPage('/projects/test-project/assets');
    
    // Mock file upload
    await page.setInputFiles('[data-testid="asset-upload"]', {
      name: 'test-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });
    
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="asset-uploaded"]')).toBeVisible();
    
    // Step 6: Generate video content
    await helper.navigateToPage('/projects/test-project/generate');
    
    // Check AI assistant suggestions
    await expect(page.locator('[data-testid="ai-assistant-panel"]')).toBeVisible();
    await page.click('[data-testid="get-suggestions"]');
    await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
    
    // Check credit cost estimation
    await helper.startVideoGeneration(TEST_PROJECT.prompt);
    await expect(page.locator('[data-testid="credit-estimate"]')).toBeVisible();
    
    // Verify cost breakdown
    await expect(page.locator('[data-testid="base-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolution-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="duration-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
    
    // Confirm generation
    await page.click('[data-testid="confirm-generation"]');
    await expect(page.locator('[data-testid="generation-started"]')).toBeVisible();
    await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
    
    // Step 7: Monitor real-time progress with detailed updates
    await helper.waitForRealtimeUpdate('[data-testid="progress-bar"]');
    
    // Simulate detailed progress updates
    const progressSteps = [
      { stage: 'analyzing_prompt', progress: 10, message: 'Analyzing your prompt...' },
      { stage: 'generating_script', progress: 25, message: 'Generating video script...' },
      { stage: 'creating_scenes', progress: 50, message: 'Creating video scenes...' },
      { stage: 'adding_effects', progress: 75, message: 'Adding visual effects...' },
      { stage: 'finalizing', progress: 90, message: 'Finalizing video...' },
      { stage: 'complete', progress: 100, message: 'Video generation complete!' },
    ];
    
    for (const step of progressSteps) {
      await page.evaluate((stepData) => {
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: {
            type: 'generation_progress',
            data: {
              projectId: 'test-project',
              ...stepData,
            }
          }
        }));
      }, step);
      
      await expect(page.locator('[data-testid="progress-stage"]')).toContainText(step.stage);
      await expect(page.locator('[data-testid="progress-message"]')).toContainText(step.message);
      await helper.waitForRealtimeUpdate(`[data-testid="progress-${step.progress}"]`);
    }
    
    // Step 8: Review generated video
    await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-player"]')).toBeVisible();
    await expect(page.locator('[data-testid="video-controls"]')).toBeVisible();
    
    // Test video player functionality
    await page.click('[data-testid="play-button"]');
    await page.click('[data-testid="fullscreen-button"]');
    await page.click('[data-testid="download-button"]');
    
    // Step 9: Edit and refine (optional)
    await page.click('[data-testid="edit-video"]');
    await expect(page.locator('[data-testid="video-editor"]')).toBeVisible();
    
    // Make simple edit
    await page.fill('[data-testid="title-overlay"]', 'My Amazing Video');
    await page.click('[data-testid="apply-edit"]');
    await expect(page.locator('[data-testid="edit-applied"]')).toBeVisible();
    
    // Step 10: Share to community
    await page.click('[data-testid="share-to-community"]');
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
    
    // Configure sharing settings
    await page.fill('[data-testid="share-title"]', 'My First AI Video');
    await page.fill('[data-testid="share-description"]', 'Created with AI Video Studio!');
    await page.click('[data-testid="add-tag"]');
    await page.fill('[data-testid="tag-input"]', 'ai-generated');
    await page.click('[data-testid="confirm-share"]');
    
    await expect(page.locator('[data-testid="shared-successfully"]')).toBeVisible();
    
    // Step 11: Verify in community feed
    await helper.navigateToPage('/community');
    await expect(page.locator('[data-testid="community-feed"]')).toBeVisible();
    await expect(page.locator(`[data-testid="community-post-My First AI Video"]`)).toBeVisible();
    
    // Test community interactions
    await page.click('[data-testid="like-post-My First AI Video"]');
    await expect(page.locator('[data-testid="like-count"]')).toContainText('1');
    
    await page.click('[data-testid="comment-post-My First AI Video"]');
    await page.fill('[data-testid="comment-input"]', 'Amazing work!');
    await page.click('[data-testid="submit-comment"]');
    await expect(page.locator('[data-testid="comment-posted"]')).toBeVisible();
    
    // Step 12: Check credit usage and billing
    await helper.navigateToPage('/credits');
    await expect(page.locator('[data-testid="credit-usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-transactions"]')).toBeVisible();
    
    // Verify generation cost was deducted
    const finalBalance = await helper.checkCreditBalance();
    expect(finalBalance).toBeLessThan(100); // Started with 100 credits
    
    // Step 13: View project analytics
    await helper.navigateToPage('/projects/test-project/analytics');
    await expect(page.locator('[data-testid="project-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="generation-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="community-engagement"]')).toBeVisible();
  });

  test('Advanced video generation with tier-specific features', async ({ page }) => {
    // Test different subscription tiers and their capabilities
    const tierTests = [
      {
        tier: 'free',
        maxDuration: 60,
        maxResolution: '720p',
        features: ['basic-templates'],
        restrictions: ['no-4k', 'no-vr', 'watermark']
      },
      {
        tier: 'pro',
        maxDuration: 7200, // 2 hours
        maxResolution: '4k',
        features: ['advanced-templates', 'ai-assistant', 'custom-music'],
        restrictions: ['no-vr']
      },
      {
        tier: 'ultra',
        maxDuration: 7200,
        maxResolution: '8k',
        features: ['all-templates', 'ai-assistant', 'custom-music', 'vr-support'],
        restrictions: []
      }
    ];

    for (const tierTest of tierTests) {
      // Mock user with specific tier
      await page.addInitScript((tier) => {
        localStorage.setItem('user', JSON.stringify({
          id: `${tier}-user`,
          email: `${tier}@example.com`,
          name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} User`,
          subscription: { tier, status: 'active' },
          creditBalance: 500
        }));
      }, tierTest.tier);

      await helper.navigateToPage('/projects/test/generate');

      // Test resolution restrictions
      const resolutionSelect = page.locator('[data-testid="video-resolution"]');
      await expect(resolutionSelect).toBeVisible();
      
      if (tierTest.tier === 'free') {
        await expect(resolutionSelect.locator('option[value="4k"]')).toBeDisabled();
        await expect(resolutionSelect.locator('option[value="8k"]')).toBeDisabled();
      } else if (tierTest.tier === 'pro') {
        await expect(resolutionSelect.locator('option[value="4k"]')).toBeEnabled();
        await expect(resolutionSelect.locator('option[value="8k"]')).toBeDisabled();
      } else {
        await expect(resolutionSelect.locator('option[value="8k"]')).toBeEnabled();
      }

      // Test duration restrictions
      await page.fill('[data-testid="video-duration"]', '3600'); // 1 hour
      if (tierTest.tier === 'free') {
        await expect(page.locator('[data-testid="duration-warning"]')).toBeVisible();
        await expect(page.locator('[data-testid="duration-warning"]')).toContainText('Free tier limited to 60 seconds');
      }

      // Test feature availability
      for (const feature of tierTest.features) {
        await expect(page.locator(`[data-testid="feature-${feature}"]`)).toBeVisible();
      }

      // Test VR support for Ultra tier
      if (tierTest.tier === 'ultra') {
        await expect(page.locator('[data-testid="vr-format-option"]')).toBeVisible();
        await page.click('[data-testid="vr-format-option"]');
        await expect(page.locator('[data-testid="vr-preview"]')).toBeVisible();
      } else {
        await expect(page.locator('[data-testid="vr-format-option"]')).not.toBeVisible();
      }
    }
  });

  test('Comprehensive payment and billing integration', async ({ page }) => {
    await helper.navigateToPage('/billing');
    
    // Test current subscription display
    await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
    await expect(page.locator('[data-testid="billing-cycle"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible();
    
    // Test usage analytics
    await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="credit-usage-breakdown"]')).toBeVisible();
    
    // Test plan comparison
    await page.click('[data-testid="compare-plans"]');
    await expect(page.locator('[data-testid="plan-comparison-modal"]')).toBeVisible();
    
    const plans = ['free', 'starter', 'pro', 'ultra'];
    for (const plan of plans) {
      await expect(page.locator(`[data-testid="plan-${plan}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="plan-${plan}-features"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="plan-${plan}-price"]`)).toBeVisible();
    }
    
    // Test upgrade flow
    await page.click('[data-testid="upgrade-to-ultra"]');
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
    
    // Review upgrade details
    await expect(page.locator('[data-testid="upgrade-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="proration-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-billing-amount"]')).toBeVisible();
    
    // Test payment method selection
    await page.click('[data-testid="payment-method-card"]');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-name"]', 'Test User');
    
    // Mock successful payment
    await page.click('[data-testid="confirm-upgrade"]');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('payment-success', {
        detail: {
          subscriptionId: 'sub_test_123',
          planId: 'ultra',
          amount: 99.00,
          currency: 'USD'
        }
      }));
    });
    
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-plan-active"]')).toContainText('Ultra');
    
    // Test billing history
    await page.click('[data-testid="billing-history-tab"]');
    await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();
    
    // Test invoice download
    await page.click('[data-testid="download-invoice-latest"]');
    await expect(page.locator('[data-testid="download-started"]')).toBeVisible();
    
    // Test subscription cancellation
    await page.click('[data-testid="manage-subscription"]');
    await page.click('[data-testid="cancel-subscription"]');
    await expect(page.locator('[data-testid="cancellation-modal"]')).toBeVisible();
    
    // Cancellation survey
    await page.selectOption('[data-testid="cancellation-reason"]', 'too-expensive');
    await page.fill('[data-testid="cancellation-feedback"]', 'Great product but too costly for my needs');
    
    // Offer retention discount
    await page.click('[data-testid="proceed-cancellation"]');
    await expect(page.locator('[data-testid="retention-offer"]')).toBeVisible();
    await expect(page.locator('[data-testid="discount-offer"]')).toContainText('50% off');
    
    // Decline offer and confirm cancellation
    await page.click('[data-testid="decline-offer"]');
    await page.click('[data-testid="confirm-cancellation"]');
    
    await expect(page.locator('[data-testid="cancellation-confirmed"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-until"]')).toBeVisible();
  });

  test('Advanced community features and moderation', async ({ page }) => {
    await helper.navigateToPage('/community');
    
    // Test community feed filtering and sorting
    await expect(page.locator('[data-testid="community-filters"]')).toBeVisible();
    
    // Filter by category
    await page.selectOption('[data-testid="category-filter"]', 'cinematic');
    await helper.waitForRealtimeUpdate('[data-testid="filtered-posts"]');
    
    // Sort by popularity
    await page.selectOption('[data-testid="sort-filter"]', 'most-liked');
    await helper.waitForRealtimeUpdate('[data-testid="sorted-posts"]');
    
    // Test search functionality
    await page.fill('[data-testid="community-search"]', 'sunset landscape');
    await page.click('[data-testid="search-button"]');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    
    // Test trending tags
    await expect(page.locator('[data-testid="trending-tags"]')).toBeVisible();
    await page.click('[data-testid="tag-ai-generated"]');
    await expect(page.locator('[data-testid="tag-filtered-posts"]')).toBeVisible();
    
    // Test post interactions
    const testPost = page.locator('[data-testid="community-post-1"]');
    await expect(testPost).toBeVisible();
    
    // Like post
    await testPost.locator('[data-testid="like-button"]').click();
    await expect(testPost.locator('[data-testid="like-count"]')).toContainText('1');
    
    // Share post
    await testPost.locator('[data-testid="share-button"]').click();
    await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
    
    await page.click('[data-testid="copy-link"]');
    await expect(page.locator('[data-testid="link-copied"]')).toBeVisible();
    
    await page.click('[data-testid="share-twitter"]');
    // Would open Twitter in new tab in real scenario
    
    // Test commenting
    await testPost.locator('[data-testid="comment-button"]').click();
    await expect(page.locator('[data-testid="comment-section"]')).toBeVisible();
    
    await page.fill('[data-testid="comment-input"]', 'Amazing work! How did you create this?');
    await page.click('[data-testid="submit-comment"]');
    
    await expect(page.locator('[data-testid="comment-posted"]')).toBeVisible();
    await expect(page.locator('[data-testid="comment-text"]')).toContainText('Amazing work!');
    
    // Test comment replies
    await page.click('[data-testid="reply-to-comment-1"]');
    await page.fill('[data-testid="reply-input"]', 'Thanks! I used the cinematic style with AI assistance.');
    await page.click('[data-testid="submit-reply"]');
    
    await expect(page.locator('[data-testid="reply-posted"]')).toBeVisible();
    
    // Test content reporting
    await testPost.locator('[data-testid="more-options"]').click();
    await page.click('[data-testid="report-content"]');
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="report-reason"]', 'inappropriate-content');
    await page.fill('[data-testid="report-details"]', 'This content violates community guidelines');
    await page.click('[data-testid="submit-report"]');
    
    await expect(page.locator('[data-testid="report-submitted"]')).toBeVisible();
    
    // Test following creators
    await testPost.locator('[data-testid="creator-profile"]').click();
    await expect(page.locator('[data-testid="creator-modal"]')).toBeVisible();
    
    await page.click('[data-testid="follow-creator"]');
    await expect(page.locator('[data-testid="following-creator"]')).toBeVisible();
    
    // Test creator's other works
    await expect(page.locator('[data-testid="creator-portfolio"]')).toBeVisible();
    await expect(page.locator('[data-testid="creator-stats"]')).toBeVisible();
  });

  test('Multilingual content generation and interface', async ({ page }) => {
    // Test language switching
    await helper.navigateToPage('/dashboard');
    
    const languages = [
      { code: 'fr', name: 'Français', testText: 'Tableau de bord' },
      { code: 'es', name: 'Español', testText: 'Panel de control' },
      { code: 'de', name: 'Deutsch', testText: 'Dashboard' },
      { code: 'ja', name: '日本語', testText: 'ダッシュボード' },
      { code: 'zh', name: '中文', testText: '仪表板' }
    ];
    
    for (const lang of languages) {
      // Switch language
      await page.click('[data-testid="language-selector"]');
      await page.click(`[data-testid="language-${lang.code}"]`);
      
      // Verify interface language changed
      await expect(page.locator('[data-testid="dashboard-title"]')).toContainText(lang.testText);
      
      // Test language-specific content generation
      await helper.navigateToPage('/projects/test/generate');
      
      // Verify language is set for AI generation
      await expect(page.locator('[data-testid="generation-language"]')).toContainText(lang.name);
      
      // Test prompt translation
      await page.fill('[data-testid="video-prompt"]', 'Create a beautiful sunset video');
      await page.click('[data-testid="translate-prompt"]');
      
      await expect(page.locator('[data-testid="translated-prompt"]')).toBeVisible();
      await expect(page.locator('[data-testid="translation-confidence"]')).toBeVisible();
      
      // Test language-specific templates
      await page.click('[data-testid="browse-templates"]');
      await expect(page.locator('[data-testid="localized-templates"]')).toBeVisible();
      
      // Verify templates are in selected language
      const templateTitles = await page.locator('[data-testid^="template-title-"]').allTextContents();
      // In real implementation, would verify templates are localized
      
      // Test voice-over language options
      await page.click('[data-testid="voice-settings"]');
      await expect(page.locator(`[data-testid="voice-language-${lang.code}"]`)).toBeVisible();
      
      // Test subtitle generation
      await page.click('[data-testid="subtitle-options"]');
      await expect(page.locator(`[data-testid="subtitle-language-${lang.code}"]`)).toBeVisible();
    }
    
    // Test RTL language support (Arabic)
    await page.click('[data-testid="language-selector"]');
    await page.click('[data-testid="language-ar"]');
    
    // Verify RTL layout
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('[data-testid="main-content"]')).toHaveClass(/rtl/);
  });

  test('Advanced real-time collaboration features', async ({ page, context }) => {
    // Create multiple browser contexts for collaboration testing
    const collaboratorPage = await context.newPage();
    const viewerPage = await context.newPage();
    
    // Set up different user types
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'owner-user',
        name: 'Project Owner',
        role: 'owner'
      }));
    });
    
    await collaboratorPage.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'collaborator-user',
        name: 'Collaborator',
        role: 'editor'
      }));
    });
    
    await viewerPage.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'viewer-user',
        name: 'Viewer',
        role: 'viewer'
      }));
    });
    
    // All users join the same project
    const projectUrl = '/projects/collaborative-project/edit';
    await page.goto(projectUrl);
    await collaboratorPage.goto(projectUrl);
    await viewerPage.goto(projectUrl);
    
    // Test real-time presence indicators
    await expect(page.locator('[data-testid="collaborators-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-avatar-collaborator-user"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-avatar-viewer-user"]')).toBeVisible();
    
    // Test real-time cursor tracking
    await collaboratorPage.locator('[data-testid="project-title"]').hover();
    await expect(page.locator('[data-testid="cursor-collaborator-user"]')).toBeVisible();
    
    // Test collaborative editing
    await page.fill('[data-testid="project-title"]', 'Collaborative Project v1');
    await helper.waitForRealtimeUpdate('[data-testid="project-title"]');
    
    // Verify other users see the change
    await expect(collaboratorPage.locator('[data-testid="project-title"]')).toHaveValue('Collaborative Project v1');
    await expect(viewerPage.locator('[data-testid="project-title"]')).toHaveValue('Collaborative Project v1');
    
    // Test permission-based editing
    await collaboratorPage.fill('[data-testid="project-description"]', 'Updated by collaborator');
    await expect(page.locator('[data-testid="project-description"]')).toHaveValue('Updated by collaborator');
    
    // Viewer should not be able to edit
    await expect(viewerPage.locator('[data-testid="project-title"]')).toBeDisabled();
    await expect(viewerPage.locator('[data-testid="edit-disabled-message"]')).toBeVisible();
    
    // Test real-time comments and discussions
    await page.click('[data-testid="add-comment"]');
    await page.fill('[data-testid="comment-input"]', 'What do you think about this direction?');
    await page.click('[data-testid="submit-comment"]');
    
    // Other users should see the comment
    await expect(collaboratorPage.locator('[data-testid="comment-thread"]')).toBeVisible();
    await expect(viewerPage.locator('[data-testid="comment-thread"]')).toBeVisible();
    
    // Test comment replies
    await collaboratorPage.click('[data-testid="reply-to-comment"]');
    await collaboratorPage.fill('[data-testid="reply-input"]', 'I love this concept! Let\'s add more visual effects.');
    await collaboratorPage.click('[data-testid="submit-reply"]');
    
    await expect(page.locator('[data-testid="comment-reply"]')).toBeVisible();
    
    // Test conflict resolution
    await page.fill('[data-testid="video-prompt"]', 'Owner\'s version of the prompt');
    await collaboratorPage.fill('[data-testid="video-prompt"]', 'Collaborator\'s version of the prompt');
    
    // Should show conflict resolution UI
    await expect(page.locator('[data-testid="conflict-resolution"]')).toBeVisible();
    await expect(page.locator('[data-testid="version-owner"]')).toContainText('Owner\'s version');
    await expect(page.locator('[data-testid="version-collaborator"]')).toContainText('Collaborator\'s version');
    
    // Resolve conflict
    await page.click('[data-testid="accept-collaborator-version"]');
    await expect(page.locator('[data-testid="conflict-resolved"]')).toBeVisible();
    
    // Test activity feed
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-title-changed"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-comment-added"]')).toBeVisible();
    await expect(page.locator('[data-testid="activity-conflict-resolved"]')).toBeVisible();
    
    // Test version history
    await page.click('[data-testid="version-history"]');
    await expect(page.locator('[data-testid="version-list"]')).toBeVisible();
    
    const versions = await page.locator('[data-testid^="version-"]').count();
    expect(versions).toBeGreaterThan(1);
    
    // Test version restoration
    await page.click('[data-testid="version-1"]');
    await page.click('[data-testid="restore-version"]');
    await expect(page.locator('[data-testid="version-restored"]')).toBeVisible();
    
    // Clean up
    await collaboratorPage.close();
    await viewerPage.close();
  });
    await helper.navigateToPage('/dashboard');
    
    // Check initial credit balance
    const initialBalance = await helper.checkCreditBalance();
    expect(initialBalance).toBeGreaterThan(0);
    
    // Navigate to credits page
    await helper.navigateToPage('/credits');
    await expect(page.locator('[data-testid="credit-dashboard"]')).toBeVisible();
    
    // View usage history
    await expect(page.locator('[data-testid="usage-history"]')).toBeVisible();
    
    // Purchase more credits
    await page.click('[data-testid="purchase-credits-button"]');
    await expect(page.locator('[data-testid="purchase-modal"]')).toBeVisible();
    
    // Select credit package
    await page.click('[data-testid="credit-package-50"]');
    await page.click('[data-testid="proceed-to-payment"]');
    
    // Mock payment success
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('payment-success', {
        detail: { credits: 50, transactionId: 'test-transaction' }
      }));
    });
    
    // Verify credit balance updated
    await helper.waitForRealtimeUpdate('[data-testid="credit-balance"]');
    const newBalance = await helper.checkCreditBalance();
    expect(newBalance).toBe(initialBalance + 50);
  });

  test('Subscription management integration', async ({ page }) => {
    await helper.navigateToPage('/billing');
    
    // Check current subscription status
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Pro');
    await expect(page.locator('[data-testid="subscription-active"]')).toBeVisible();
    
    // View billing history
    await expect(page.locator('[data-testid="billing-history"]')).toBeVisible();
    
    // Upgrade subscription
    await page.click('[data-testid="upgrade-subscription"]');
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
    
    // Select Ultra tier
    await page.click('[data-testid="select-ultra-tier"]');
    await page.click('[data-testid="confirm-upgrade"]');
    
    // Mock upgrade success
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('subscription-updated', {
        detail: { tier: 'ultra', status: 'active' }
      }));
    });
    
    // Verify tier updated
    await helper.waitForRealtimeUpdate('[data-testid="subscription-status"]');
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Ultra');
  });

  test('Multilingual interface integration', async ({ page }) => {
    await helper.navigateToPage('/dashboard');
    
    // Switch to French
    await page.click('[data-testid="language-selector"]');
    await page.click('[data-testid="language-fr"]');
    
    // Verify interface language changed
    await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Tableau de bord');
    
    // Create project in French
    await helper.navigateToPage('/projects');
    await page.click('[data-testid="create-project-button"]');
    
    // Verify modal is in French
    await expect(page.locator('[data-testid="create-project-modal"] h2')).toContainText('Nouveau projet');
    
    // Generate content in French
    await helper.fillForm({
      'project-title': 'Projet de test',
      'project-description': 'Un projet créé en français'
    });
    
    await page.click('[data-testid="submit-project"]');
    await page.click('[data-testid="project-Projet de test"]');
    
    // Generate video with French prompt
    await helper.navigateToPage('/projects/test-project/generate');
    await helper.startVideoGeneration('Créer une vidéo de paysage magnifique avec de la musique calme');
    
    // Verify French content generation
    await expect(page.locator('[data-testid="generation-language"]')).toContainText('Français');
  });

  test('Real-time collaboration features', async ({ page, context }) => {
    // Open second browser context to simulate another user
    const secondPage = await context.newPage();
    const secondHelper = new IntegrationTestHelper(secondPage, context);
    await secondHelper.mockAuthentication();
    
    // Both users navigate to same project
    await helper.navigateToPage('/projects/shared-project');
    await secondHelper.navigateToPage('/projects/shared-project');
    
    // User 1 makes changes
    await page.fill('[data-testid="project-title"]', 'Collaborative Project');
    
    // User 2 should see real-time updates
    await secondHelper.waitForRealtimeUpdate('[data-testid="project-title"]');
    await expect(secondPage.locator('[data-testid="project-title"]')).toHaveValue('Collaborative Project');
    
    // User 2 adds comment
    await secondPage.fill('[data-testid="comment-input"]', 'Great project idea!');
    await secondPage.click('[data-testid="submit-comment"]');
    
    // User 1 should see comment in real-time
    await helper.waitForRealtimeUpdate('[data-testid="comments-list"]');
    await expect(page.locator('[data-testid="latest-comment"]')).toContainText('Great project idea!');
    
    await secondPage.close();
  });

  test('Admin dashboard integration', async ({ page }) => {
    // Mock admin user
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-user',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }));
    });
    
    await helper.navigateToPage('/admin');
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible();
    
    // Check analytics
    await expect(page.locator('[data-testid="user-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-analytics"]')).toBeVisible();
    
    // Manage users
    await page.click('[data-testid="user-management-tab"]');
    await expect(page.locator('[data-testid="user-list"]')).toBeVisible();
    
    // Update pricing
    await page.click('[data-testid="pricing-tab"]');
    await page.fill('[data-testid="video-generation-cost"]', '10');
    await page.click('[data-testid="update-pricing"]');
    
    await expect(page.locator('[data-testid="pricing-updated"]')).toBeVisible();
    
    // Content moderation
    await page.click('[data-testid="moderation-tab"]');
    await expect(page.locator('[data-testid="flagged-content"]')).toBeVisible();
    
    // Review flagged content
    await page.click('[data-testid="review-content-1"]');
    await page.click('[data-testid="approve-content"]');
    
    await expect(page.locator('[data-testid="content-approved"]')).toBeVisible();
  });

  test('Error handling and recovery integration', async ({ page }) => {
    await helper.navigateToPage('/projects');
    
    // Test network error handling
    await page.route('**/api/projects', route => route.abort());
    
    await page.reload();
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network and retry
    await page.unroute('**/api/projects');
    await page.click('[data-testid="retry-button"]');
    
    await expect(page.locator('[data-testid="projects-list"]')).toBeVisible();
    
    // Test generation failure and credit refund
    await helper.navigateToPage('/projects/test-project/generate');
    const initialBalance = await helper.checkCreditBalance();
    
    await helper.startVideoGeneration('Test prompt');
    await page.click('[data-testid="confirm-generation"]');
    
    // Mock generation failure
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: {
          type: 'generation_failed',
          data: { projectId: 'test-project', error: 'Processing failed' }
        }
      }));
    });
    
    await expect(page.locator('[data-testid="generation-failed"]')).toBeVisible();
    
    // Verify credits were refunded
    const finalBalance = await helper.checkCreditBalance();
    expect(finalBalance).toBe(initialBalance);
  });

  test('Performance under load simulation', async ({ page }) => {
    await helper.navigateToPage('/community');
    
    // Simulate heavy load with multiple rapid interactions
    const startTime = Date.now();
    
    // Rapid scrolling and interactions
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(100);
      
      // Like posts rapidly
      const likeButtons = await page.locator('[data-testid^="like-post-"]').all();
      if (likeButtons.length > 0) {
        await likeButtons[0].click();
      }
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Should handle rapid interactions smoothly (under 5 seconds)
    expect(totalTime).toBeLessThan(5000);
    
    // UI should remain responsive
    await expect(page.locator('[data-testid="community-feed"]')).toBeVisible();
  });

  test('Data privacy and GDPR compliance integration', async ({ page }) => {
    await helper.navigateToPage('/privacy');
    
    // Check privacy policy is displayed
    await expect(page.locator('[data-testid="privacy-policy"]')).toBeVisible();
    
    // Test consent management
    await page.click('[data-testid="manage-consent"]');
    await expect(page.locator('[data-testid="consent-modal"]')).toBeVisible();
    
    // Update consent preferences
    await page.click('[data-testid="analytics-consent"]');
    await page.click('[data-testid="save-consent"]');
    
    await expect(page.locator('[data-testid="consent-updated"]')).toBeVisible();
    
    // Test data export request
    await helper.navigateToPage('/account/data');
    await page.click('[data-testid="export-data"]');
    
    await expect(page.locator('[data-testid="export-requested"]')).toBeVisible();
    
    // Test data deletion request
    await page.click('[data-testid="delete-account"]');
    await expect(page.locator('[data-testid="deletion-modal"]')).toBeVisible();
    
    await page.fill('[data-testid="deletion-confirmation"]', 'DELETE');
    await page.click('[data-testid="confirm-deletion"]');
    
    await expect(page.locator('[data-testid="deletion-scheduled"]')).toBeVisible();
  });
});

test.describe('Cross-Component Integration Tests', () => {
  let helper: IntegrationTestHelper;

  test.beforeEach(async ({ page, context }) => {
    helper = new IntegrationTestHelper(page, context);
    await helper.mockAuthentication();
    await helper.mockWebSocketConnection();
  });

  test('Credit system integration across all features', async ({ page }) => {
    const initialBalance = 100;
    
    // Start with known balance
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        creditBalance: 100
      }));
    });
    
    await helper.navigateToPage('/dashboard');
    
    // Test 1: Video generation cost estimation
    await helper.navigateToPage('/projects/test/generate');
    await helper.startVideoGeneration('Test video');
    
    const estimatedCost = await page.textContent('[data-testid="credit-estimate"]');
    const cost = parseInt(estimatedCost?.replace(/\D/g, '') || '0');
    
    // Test 2: Confirm generation and check deduction
    await page.click('[data-testid="confirm-generation"]');
    
    // Mock successful generation
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: {
          type: 'generation_complete',
          data: { creditsUsed: 25 }
        }
      }));
    });
    
    // Verify balance updated
    const newBalance = await helper.checkCreditBalance();
    expect(newBalance).toBe(initialBalance - cost);
    
    // Test 3: Insufficient credits handling
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        creditBalance: 5
      }));
    });
    
    await page.reload();
    await helper.startVideoGeneration('Another test video');
    
    await expect(page.locator('[data-testid="insufficient-credits"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchase-credits-prompt"]')).toBeVisible();
  });

  test('Real-time updates across all components', async ({ page }) => {
    await helper.navigateToPage('/dashboard');
    
    // Test real-time notifications
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: {
          type: 'notification',
          data: {
            title: 'Video Generation Complete',
            message: 'Your video "Test Project" is ready!',
            type: 'success'
          }
        }
      }));
    });
    
    await expect(page.locator('[data-testid="notification-toast"]')).toBeVisible();
    
    // Test project status updates
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: {
          type: 'project_update',
          data: {
            projectId: 'test-project',
            status: 'generating',
            progress: 45
          }
        }
      }));
    });
    
    await expect(page.locator('[data-testid="project-status-generating"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('value', '45');
    
    // Test community feed updates
    await helper.navigateToPage('/community');
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: {
          type: 'new_community_post',
          data: {
            id: 'new-post',
            title: 'Amazing New Video',
            author: 'Creative User',
            likes: 0
          }
        }
      }));
    });
    
    await expect(page.locator('[data-testid="community-post-new-post"]')).toBeVisible();
  });

  test('Authentication state management across navigation', async ({ page }) => {
    // Test authenticated navigation
    await helper.navigateToPage('/dashboard');
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    
    // Navigate to different protected routes
    const protectedRoutes = ['/projects', '/community', '/credits', '/billing'];
    
    for (const route of protectedRoutes) {
      await helper.navigateToPage(route);
      await expect(page.locator('[data-testid="authenticated-content"]')).toBeVisible();
    }
    
    // Test logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Test accessing protected route while logged out
    await helper.navigateToPage('/dashboard');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('Form validation consistency across components', async ({ page }) => {
    // Test project creation form
    await helper.navigateToPage('/projects');
    await page.click('[data-testid="create-project-button"]');
    
    // Submit empty form
    await page.click('[data-testid="submit-project"]');
    await expect(page.locator('[data-testid="title-error"]')).toBeVisible();
    
    // Test video generation form
    await helper.navigateToPage('/projects/test/generate');
    await page.click('[data-testid="generate-video-button"]');
    await expect(page.locator('[data-testid="prompt-error"]')).toBeVisible();
    
    // Test comment form
    await helper.navigateToPage('/community');
    await page.click('[data-testid="add-comment-1"]');
    await page.click('[data-testid="submit-comment"]');
    await expect(page.locator('[data-testid="comment-error"]')).toBeVisible();
    
    // Test consistent error styling
    const errorElements = await page.locator('[data-testid$="-error"]').all();
    for (const element of errorElements) {
      await expect(element).toHaveClass(/text-red-500/);
    }
  });

  test('Theme consistency across all components', async ({ page }) => {
    await helper.navigateToPage('/dashboard');
    
    // Test light theme
    await expect(page.locator('html')).not.toHaveClass('dark');
    
    // Switch to dark theme
    await page.click('[data-testid="theme-toggle"]');
    await expect(page.locator('html')).toHaveClass('dark');
    
    // Navigate to different pages and verify theme persistence
    const pages = ['/projects', '/community', '/credits'];
    
    for (const pagePath of pages) {
      await helper.navigateToPage(pagePath);
      await expect(page.locator('html')).toHaveClass('dark');
    }
    
    // Test theme-specific styling
    await expect(page.locator('[data-testid="main-content"]')).toHaveClass(/dark:bg-gray-900/);
  });
});