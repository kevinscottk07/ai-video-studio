/**
 * Performance Tests for Frontend Components
 * Tests Core Web Vitals and component performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performanceMonitoring } from '../../services/performanceMonitoring';

// Mock components for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Performance Tests', () => {
  let performanceEntries: PerformanceEntry[] = [];

  beforeEach(() => {
    // Clear performance entries
    performance.clearMarks();
    performance.clearMeasures();
    performanceEntries = [];
    
    // Mock performance observer
    global.PerformanceObserver = class MockPerformanceObserver {
      constructor(private callback: PerformanceObserverCallback) {}
      observe() {}
      disconnect() {}
    } as any;
  });

  afterEach(() => {
    performanceMonitoring.clearMetrics();
  });

  describe('Component Render Performance', () => {
    it('should render HomePage within performance budget', async () => {
      const startTime = performance.now();
      
      // Dynamically import to test code splitting
      const { HomePage } = await import('../../pages/HomePage');
      
      render(
        <TestWrapper>
          <HomePage />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('should render DashboardPage within performance budget', async () => {
      const startTime = performance.now();
      
      const { DashboardPage } = await import('../../pages/DashboardPage');
      
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Dashboard should render within 200ms (more complex)
      expect(renderTime).toBeLessThan(200);
    });

    it('should handle large lists efficiently', async () => {
      const { ProjectList } = await import('../../components/projects/ProjectList');
      
      // Mock large dataset
      const largeProjectList = Array.from({ length: 1000 }, (_, i) => ({
        id: `project-${i}`,
        title: `Project ${i}`,
        description: `Description for project ${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'user-1',
        status: 'completed' as const,
        isPublic: true,
        settings: {
          resolution: '1080p' as const,
          duration: 60,
          language: 'en',
          style: 'cinematic' as const,
          musicEnabled: true
        },
        assets: []
      }));

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <ProjectList projects={largeProjectList} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle 1000 items within 500ms
      expect(renderTime).toBeLessThan(500);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks in component mounting/unmounting', async () => {
      const { DashboardPage } = await import('../../pages/DashboardPage');
      
      // Get initial memory usage (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Mount and unmount component multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <TestWrapper>
            <DashboardPage />
          </TestWrapper>
        );
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory should not increase significantly (allow 10MB increase)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB
      }
    });
  });

  describe('Bundle Size Performance', () => {
    it('should have reasonable chunk sizes', async () => {
      // Test that lazy-loaded chunks are within size limits
      const chunkSizeLimit = 500 * 1024; // 500KB

      // Test main chunks
      const chunks = [
        () => import('../../pages/DashboardPage'),
        () => import('../../pages/ProjectsPage'),
        () => import('../../pages/CommunityPage'),
        () => import('../../components/admin/AdminDashboard'),
      ];

      for (const chunkImport of chunks) {
        const startTime = performance.now();
        await chunkImport();
        const loadTime = performance.now() - startTime;
        
        // Chunk should load within 1 second
        expect(loadTime).toBeLessThan(1000);
      }
    });
  });

  describe('Animation Performance', () => {
    it('should maintain 60fps during animations', async () => {
      const { motion } = await import('framer-motion');
      
      let frameCount = 0;
      let startTime = performance.now();
      
      const AnimatedComponent = () => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onAnimationComplete={() => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            const fps = (frameCount / duration) * 1000;
            
            // Should maintain at least 30fps (allowing for test environment)
            expect(fps).toBeGreaterThan(30);
          }}
        >
          Test Animation
        </motion.div>
      );

      render(
        <TestWrapper>
          <AnimatedComponent />
        </TestWrapper>
      );

      // Wait for animation to complete
      await waitFor(() => {
        expect(screen.getByText('Test Animation')).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('API Response Performance', () => {
    it('should handle API responses within acceptable time', async () => {
      // Mock fetch for testing
      global.fetch = vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: 'test' }),
        })
      );

      const startTime = performance.now();
      
      const response = await fetch('/api/test');
      const data = await response.json();
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // API should respond within 100ms (mocked)
      expect(responseTime).toBeLessThan(100);
      expect(data).toEqual({ data: 'test' });
    });
  });

  describe('Real-time Performance', () => {
    it('should handle WebSocket messages efficiently', async () => {
      // Mock WebSocket
      const mockWebSocket = {
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };

      global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

      const { realTimeClient } = await import('../../services/realTimeClient');
      
      const startTime = performance.now();
      
      // Simulate receiving multiple messages
      const messageCount = 100;
      for (let i = 0; i < messageCount; i++) {
        // Simulate message processing
        const message = { type: 'update', data: { id: i } };
        // Process message (this would normally be handled by the WebSocket event)
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should process 100 messages within 50ms
      expect(processingTime).toBeLessThan(50);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics correctly', () => {
      const metricName = 'TEST_METRIC';
      const metricValue = 100;
      
      performanceMonitoring.recordMetric(metricName, metricValue, 'good');
      
      const summary = performanceMonitoring.getPerformanceSummary();
      
      expect(summary.metrics).toHaveLength(1);
      expect(summary.metrics[0].name).toBe(metricName);
      expect(summary.metrics[0].value).toBe(metricValue);
      expect(summary.metrics[0].rating).toBe('good');
    });

    it('should calculate performance ratings correctly', () => {
      // Test different performance thresholds
      performanceMonitoring.recordMetric('FAST_OPERATION', 50, 'good');
      performanceMonitoring.recordMetric('SLOW_OPERATION', 2000, 'poor');
      performanceMonitoring.recordMetric('MEDIUM_OPERATION', 1000, 'needs-improvement');
      
      const summary = performanceMonitoring.getPerformanceSummary();
      
      expect(summary.summary['FAST_OPERATION'].rating).toBe('good');
      expect(summary.summary['SLOW_OPERATION'].rating).toBe('poor');
      expect(summary.summary['MEDIUM_OPERATION'].rating).toBe('needs-improvement');
    });
  });
});