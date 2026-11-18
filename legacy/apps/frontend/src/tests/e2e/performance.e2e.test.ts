/**
 * End-to-End Performance Tests
 * Tests complete user workflows and performance
 */

import { test, expect, Page } from '@playwright/test';

// Performance measurement utilities
class E2EPerformanceMonitor {
  private page: Page;
  private metrics: Array<{
    name: string;
    value: number;
    timestamp: number;
  }> = [];

  constructor(page: Page) {
    this.page = page;
  }

  async measurePageLoad(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url, { waitUntil: 'networkidle' });
    const endTime = Date.now();
    
    const loadTime = endTime - startTime;
    this.recordMetric('PAGE_LOAD', loadTime);
    
    return loadTime;
  }

  async measureInteraction(action: () => Promise<void>, name: string): Promise<number> {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    
    const interactionTime = endTime - startTime;
    this.recordMetric(`INTERACTION_${name}`, interactionTime);
    
    return interactionTime;
  }

  async getWebVitals() {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: Record<string, number> = {};
        
        // Get Core Web Vitals
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['paint'] });

        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.LCP = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            vitals.CLS = (entry as any).value;
          }
        }).observe({ entryTypes: ['layout-shift'] });

        // Wait a bit for metrics to be collected
        setTimeout(() => resolve(vitals), 2000);
      });
    });
  }

  async measureBundleSize(): Promise<{ totalSize: number; chunkSizes: Record<string, number> }> {
    const resourceSizes = await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const sizes: Record<string, number> = {};
      let totalSize = 0;

      resources.forEach(resource => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          const size = resource.transferSize || resource.encodedBodySize || 0;
          const filename = resource.name.split('/').pop() || 'unknown';
          sizes[filename] = size;
          totalSize += size;
        }
      });

      return { totalSize, chunkSizes: sizes };
    });

    return resourceSizes;
  }

  private recordMetric(name: string, value: number) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }
}

test.describe('E2E Performance Tests', () => {
  let monitor: E2EPerformanceMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new E2EPerformanceMonitor(page);
  });

  test('Homepage should load within performance budget', async ({ page }) => {
    const loadTime = await monitor.measurePageLoad('/');
    
    // Homepage should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check Web Vitals
    const vitals = await monitor.getWebVitals();
    
    // First Contentful Paint should be under 1.8s
    if (vitals.FCP) {
      expect(vitals.FCP).toBeLessThan(1800);
    }

    // Largest Contentful Paint should be under 2.5s
    if (vitals.LCP) {
      expect(vitals.LCP).toBeLessThan(2500);
    }

    // Cumulative Layout Shift should be under 0.1
    if (vitals.CLS) {
      expect(vitals.CLS).toBeLessThan(0.1);
    }
  });

  test('Dashboard should load efficiently for authenticated users', async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      }));
    });

    const loadTime = await monitor.measurePageLoad('/dashboard');
    
    // Dashboard should load within 4 seconds (more complex page)
    expect(loadTime).toBeLessThan(4000);

    // Check that main content is visible
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('Project creation workflow should be performant', async ({ page }) => {
    // Setup authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token');
    });

    await page.goto('/projects');

    const workflowTime = await monitor.measureInteraction(async () => {
      // Click create project button
      await page.click('[data-testid="create-project-button"]');
      
      // Wait for modal to appear
      await expect(page.locator('[data-testid="create-project-modal"]')).toBeVisible();
      
      // Fill form
      await page.fill('[data-testid="project-title"]', 'Performance Test Project');
      await page.fill('[data-testid="project-description"]', 'A project created during performance testing');
      
      // Submit form
      await page.click('[data-testid="submit-project"]');
      
      // Wait for success feedback
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    }, 'PROJECT_CREATION');

    // Project creation workflow should complete within 5 seconds
    expect(workflowTime).toBeLessThan(5000);
  });

  test('Video generation should handle loading states efficiently', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token');
    });

    await page.goto('/projects/test-project/generate');

    const generationTime = await monitor.measureInteraction(async () => {
      // Fill generation form
      await page.fill('[data-testid="video-prompt"]', 'Create a test video');
      await page.selectOption('[data-testid="video-style"]', 'cinematic');
      
      // Start generation
      await page.click('[data-testid="generate-video-button"]');
      
      // Wait for loading state
      await expect(page.locator('[data-testid="generation-progress"]')).toBeVisible();
      
      // Wait for progress to start (mock would show immediate progress)
      await page.waitForTimeout(1000);
    }, 'VIDEO_GENERATION_START');

    // Generation start should be responsive (under 2 seconds)
    expect(generationTime).toBeLessThan(2000);
  });

  test('Community feed should handle infinite scroll efficiently', async ({ page }) => {
    await page.goto('/community');

    const scrollTime = await monitor.measureInteraction(async () => {
      // Scroll to bottom to trigger infinite scroll
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await page.waitForTimeout(1000);
      
      // Scroll again
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
    }, 'INFINITE_SCROLL');

    // Infinite scroll should be smooth (under 3 seconds for two loads)
    expect(scrollTime).toBeLessThan(3000);
  });

  test('Search functionality should be responsive', async ({ page }) => {
    await page.goto('/projects');

    const searchTime = await monitor.measureInteraction(async () => {
      // Type in search box
      await page.fill('[data-testid="search-input"]', 'test project');
      
      // Wait for search results
      await page.waitForTimeout(500); // Debounce time
      
      // Results should be visible
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
    }, 'SEARCH');

    // Search should respond within 1 second
    expect(searchTime).toBeLessThan(1000);
  });

  test('Bundle sizes should be within limits', async ({ page }) => {
    await page.goto('/');
    
    const bundleInfo = await monitor.measureBundleSize();
    
    // Total bundle size should be under 2MB
    expect(bundleInfo.totalSize).toBeLessThan(2 * 1024 * 1024);
    
    // Individual chunks should be reasonable
    Object.entries(bundleInfo.chunkSizes).forEach(([filename, size]) => {
      if (filename.includes('vendor')) {
        // Vendor chunks can be larger
        expect(size).toBeLessThan(800 * 1024); // 800KB
      } else {
        // App chunks should be smaller
        expect(size).toBeLessThan(500 * 1024); // 500KB
      }
    });
  });

  test('Real-time features should be performant', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token');
    });

    await page.goto('/dashboard');

    const realtimeTime = await monitor.measureInteraction(async () => {
      // Simulate real-time update
      await page.evaluate(() => {
        // Mock WebSocket message
        window.dispatchEvent(new CustomEvent('websocket-message', {
          detail: {
            type: 'project_update',
            data: { id: 'test-project', status: 'completed' }
          }
        }));
      });
      
      // Wait for UI to update
      await page.waitForTimeout(100);
      
      // Check that update is reflected
      await expect(page.locator('[data-testid="project-status-completed"]')).toBeVisible();
    }, 'REALTIME_UPDATE');

    // Real-time updates should be near-instantaneous (under 200ms)
    expect(realtimeTime).toBeLessThan(200);
  });

  test('Form validation should be responsive', async ({ page }) => {
    await page.goto('/projects/new');

    const validationTime = await monitor.measureInteraction(async () => {
      // Try to submit empty form
      await page.click('[data-testid="submit-button"]');
      
      // Wait for validation errors
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      
      // Fix one error
      await page.fill('[data-testid="project-title"]', 'Valid Title');
      
      // Validation should update
      await page.waitForTimeout(100);
    }, 'FORM_VALIDATION');

    // Form validation should be immediate (under 300ms)
    expect(validationTime).toBeLessThan(300);
  });

  test('Navigation should be smooth', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token');
    });

    await page.goto('/dashboard');

    const navigationTime = await monitor.measureInteraction(async () => {
      // Navigate to projects
      await page.click('[data-testid="nav-projects"]');
      await expect(page.locator('[data-testid="projects-page"]')).toBeVisible();
      
      // Navigate to community
      await page.click('[data-testid="nav-community"]');
      await expect(page.locator('[data-testid="community-page"]')).toBeVisible();
      
      // Navigate back to dashboard
      await page.click('[data-testid="nav-dashboard"]');
      await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();
    }, 'NAVIGATION');

    // Navigation between pages should be fast (under 2 seconds total)
    expect(navigationTime).toBeLessThan(2000);
  });

  test.afterEach(async () => {
    // Log performance metrics
    const metrics = monitor.getMetrics();
    console.log('Performance Metrics:', metrics);
    
    // Clear metrics for next test
    monitor.clearMetrics();
  });
});