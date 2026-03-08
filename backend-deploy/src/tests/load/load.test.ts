/**
 * Load Tests for Backend API
 * Tests API performance under various load conditions
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { performance } from 'perf_hooks';
import { app } from '../../server';
import { prisma } from '../../services/prismaService';

// Load testing utilities
class LoadTester {
  private results: Array<{
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    timestamp: number;
  }> = [];

  async runConcurrentRequests(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    concurrency: number,
    totalRequests: number,
    payload?: any
  ) {
    const promises: Promise<any>[] = [];
    const startTime = performance.now();

    for (let i = 0; i < totalRequests; i++) {
      const promise = this.makeRequest(endpoint, method, payload);
      promises.push(promise);

      // Control concurrency
      if (promises.length >= concurrency) {
        await Promise.all(promises.splice(0, concurrency));
      }
    }

    // Wait for remaining requests
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    return {
      totalTime,
      averageResponseTime: this.getAverageResponseTime(),
      p95ResponseTime: this.getPercentileResponseTime(95),
      p99ResponseTime: this.getPercentileResponseTime(99),
      successRate: this.getSuccessRate(),
      requestsPerSecond: totalRequests / (totalTime / 1000),
      results: [...this.results]
    };
  }

  private async makeRequest(endpoint: string, method: string, payload?: any) {
    const startTime = performance.now();
    
    try {
      let response;
      switch (method) {
        case 'GET':
          response = await request(app).get(endpoint);
          break;
        case 'POST':
          response = await request(app).post(endpoint).send(payload);
          break;
        case 'PUT':
          response = await request(app).put(endpoint).send(payload);
          break;
        case 'DELETE':
          response = await request(app).delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.results.push({
        endpoint,
        method,
        responseTime,
        statusCode: response.status,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      this.results.push({
        endpoint,
        method,
        responseTime,
        statusCode: 500,
        timestamp: Date.now()
      });

      throw error;
    }
  }

  private getAverageResponseTime(): number {
    if (this.results.length === 0) return 0;
    const sum = this.results.reduce((acc, result) => acc + result.responseTime, 0);
    return sum / this.results.length;
  }

  private getPercentileResponseTime(percentile: number): number {
    if (this.results.length === 0) return 0;
    
    const sorted = this.results
      .map(r => r.responseTime)
      .sort((a, b) => a - b);
    
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private getSuccessRate(): number {
    if (this.results.length === 0) return 0;
    const successCount = this.results.filter(r => r.statusCode < 400).length;
    return (successCount / this.results.length) * 100;
  }

  clearResults() {
    this.results = [];
  }
}

describe('Load Tests', () => {
  let loadTester: LoadTester;
  let authToken: string;

  beforeAll(async () => {
    loadTester = new LoadTester();
    
    // Create test user and get auth token
    const testUser = await prisma.user.create({
      data: {
        email: 'loadtest@example.com',
        authProviderId: 'auth0|loadtest',
        displayName: 'Load Test User',
        language: 'en',
        timezone: 'UTC',
        creditBalance: 1000,
        totalCreditsEver: 1000,
        role: 'USER'
      }
    });

    // Mock auth token (in real tests, you'd get this from your auth system)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: { email: 'loadtest@example.com' }
    });
  });

  beforeEach(() => {
    loadTester.clearResults();
  });

  describe('Health Check Endpoint', () => {
    it('should handle high load on health check', async () => {
      const results = await loadTester.runConcurrentRequests(
        '/health',
        'GET',
        50, // 50 concurrent requests
        500 // 500 total requests
      );

      expect(results.successRate).toBeGreaterThan(99);
      expect(results.averageResponseTime).toBeLessThan(50); // 50ms average
      expect(results.p95ResponseTime).toBeLessThan(100); // 100ms p95
      expect(results.requestsPerSecond).toBeGreaterThan(100); // 100 RPS
    });
  });

  describe('Authentication Endpoints', () => {
    it('should handle concurrent login requests', async () => {
      const loginPayload = {
        email: 'loadtest@example.com',
        password: 'testpassword'
      };

      const results = await loadTester.runConcurrentRequests(
        '/api/auth/login',
        'POST',
        10, // 10 concurrent requests
        100, // 100 total requests
        loginPayload
      );

      expect(results.successRate).toBeGreaterThan(95);
      expect(results.averageResponseTime).toBeLessThan(200); // 200ms average
      expect(results.p95ResponseTime).toBeLessThan(500); // 500ms p95
    });
  });

  describe('Project Management Endpoints', () => {
    it('should handle concurrent project creation', async () => {
      const projectPayload = {
        title: 'Load Test Project',
        description: 'Project created during load testing',
        settings: {
          resolution: '1080p',
          duration: 60,
          language: 'en',
          style: 'cinematic',
          musicEnabled: true
        }
      };

      const results = await loadTester.runConcurrentRequests(
        '/api/projects',
        'POST',
        5, // 5 concurrent requests (database writes are more expensive)
        50, // 50 total requests
        projectPayload
      );

      expect(results.successRate).toBeGreaterThan(90);
      expect(results.averageResponseTime).toBeLessThan(500); // 500ms average
      expect(results.p95ResponseTime).toBeLessThan(1000); // 1s p95
    });

    it('should handle concurrent project listing', async () => {
      const results = await loadTester.runConcurrentRequests(
        '/api/projects',
        'GET',
        20, // 20 concurrent requests
        200 // 200 total requests
      );

      expect(results.successRate).toBeGreaterThan(98);
      expect(results.averageResponseTime).toBeLessThan(100); // 100ms average
      expect(results.p95ResponseTime).toBeLessThan(200); // 200ms p95
      expect(results.requestsPerSecond).toBeGreaterThan(50); // 50 RPS
    });
  });

  describe('Video Generation Endpoints', () => {
    it('should handle concurrent generation requests', async () => {
      const generationPayload = {
        projectId: 'test-project-id',
        prompt: 'Create a test video',
        settings: {
          resolution: '1080p',
          duration: 30,
          style: 'cinematic'
        }
      };

      const results = await loadTester.runConcurrentRequests(
        '/api/video/generate',
        'POST',
        3, // 3 concurrent requests (AI operations are expensive)
        15, // 15 total requests
        generationPayload
      );

      expect(results.successRate).toBeGreaterThan(85);
      expect(results.averageResponseTime).toBeLessThan(2000); // 2s average
      expect(results.p95ResponseTime).toBeLessThan(5000); // 5s p95
    });

    it('should handle concurrent status checks', async () => {
      const results = await loadTester.runConcurrentRequests(
        '/api/video/status/test-job-id',
        'GET',
        30, // 30 concurrent requests
        300 // 300 total requests
      );

      expect(results.successRate).toBeGreaterThan(95);
      expect(results.averageResponseTime).toBeLessThan(50); // 50ms average
      expect(results.p95ResponseTime).toBeLessThan(100); // 100ms p95
      expect(results.requestsPerSecond).toBeGreaterThan(100); // 100 RPS
    });
  });

  describe('Credit System Endpoints', () => {
    it('should handle concurrent credit balance checks', async () => {
      const results = await loadTester.runConcurrentRequests(
        '/api/credits/balance',
        'GET',
        25, // 25 concurrent requests
        250 // 250 total requests
      );

      expect(results.successRate).toBeGreaterThan(98);
      expect(results.averageResponseTime).toBeLessThan(75); // 75ms average
      expect(results.p95ResponseTime).toBeLessThan(150); // 150ms p95
      expect(results.requestsPerSecond).toBeGreaterThan(75); // 75 RPS
    });

    it('should handle concurrent credit transactions', async () => {
      const transactionPayload = {
        amount: 10,
        operation: 'video_generation',
        description: 'Load test transaction'
      };

      const results = await loadTester.runConcurrentRequests(
        '/api/credits/deduct',
        'POST',
        5, // 5 concurrent requests (database transactions)
        25, // 25 total requests
        transactionPayload
      );

      expect(results.successRate).toBeGreaterThan(90);
      expect(results.averageResponseTime).toBeLessThan(300); // 300ms average
      expect(results.p95ResponseTime).toBeLessThan(600); // 600ms p95
    });
  });

  describe('Real-time Features', () => {
    it('should handle WebSocket connections under load', async () => {
      // This would require a more complex setup with actual WebSocket connections
      // For now, we'll test the HTTP endpoints that support real-time features
      
      const results = await loadTester.runConcurrentRequests(
        '/api/realtime/status',
        'GET',
        40, // 40 concurrent requests
        400 // 400 total requests
      );

      expect(results.successRate).toBeGreaterThan(95);
      expect(results.averageResponseTime).toBeLessThan(100); // 100ms average
      expect(results.p95ResponseTime).toBeLessThan(200); // 200ms p95
    });
  });

  describe('Database Performance', () => {
    it('should maintain performance under database load', async () => {
      // Test multiple endpoints that hit the database
      const endpoints = [
        { path: '/api/projects', method: 'GET' as const },
        { path: '/api/credits/balance', method: 'GET' as const },
        { path: '/api/user/profile', method: 'GET' as const },
        { path: '/api/community/feed', method: 'GET' as const }
      ];

      const promises = endpoints.map(endpoint =>
        loadTester.runConcurrentRequests(
          endpoint.path,
          endpoint.method,
          10, // 10 concurrent per endpoint
          50  // 50 total per endpoint
        )
      );

      const results = await Promise.all(promises);

      // All endpoints should maintain good performance
      results.forEach((result, index) => {
        expect(result.successRate).toBeGreaterThan(90);
        expect(result.averageResponseTime).toBeLessThan(200);
        expect(result.p95ResponseTime).toBeLessThan(500);
      });
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory under load', async () => {
      const initialMemory = process.memoryUsage();

      // Run a sustained load test
      await loadTester.runConcurrentRequests(
        '/health',
        'GET',
        20, // 20 concurrent requests
        1000 // 1000 total requests
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle CPU-intensive operations efficiently', async () => {
      const cpuIntensivePayload = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: Math.random() * 1000
        }))
      };

      const results = await loadTester.runConcurrentRequests(
        '/api/test/cpu-intensive',
        'POST',
        5, // 5 concurrent requests
        25, // 25 total requests
        cpuIntensivePayload
      );

      expect(results.successRate).toBeGreaterThan(85);
      expect(results.averageResponseTime).toBeLessThan(1000); // 1s average
      expect(results.p95ResponseTime).toBeLessThan(2000); // 2s p95
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle errors gracefully under load', async () => {
      // Test endpoint that might fail
      const results = await loadTester.runConcurrentRequests(
        '/api/test/random-error',
        'GET',
        15, // 15 concurrent requests
        150 // 150 total requests
      );

      // Even with random errors, response times should be consistent
      expect(results.averageResponseTime).toBeLessThan(100);
      expect(results.p95ResponseTime).toBeLessThan(200);
      
      // Should handle at least 70% successfully (depending on error rate)
      expect(results.successRate).toBeGreaterThan(70);
    });
  });
});