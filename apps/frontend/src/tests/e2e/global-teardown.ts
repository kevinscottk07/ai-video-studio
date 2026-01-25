import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Cleanup test data
    console.log('🗑️  Cleaning up test data...');
    
    // You can add cleanup logic here, such as:
    // - Removing test users
    // - Cleaning test database
    // - Stopping mock services
    
    // Clean up authentication state
    const authStatePath = 'test-results/auth-state.json';
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
    }
    
    // Generate performance report if test results exist
    const resultsPath = 'test-results/e2e-results.json';
    if (fs.existsSync(resultsPath)) {
      console.log('📊 Generating performance report...');
      await generatePerformanceReport(resultsPath);
    }
    
    console.log('✅ E2E test environment cleanup complete');
  } catch (error) {
    console.error('❌ E2E test cleanup failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

async function generatePerformanceReport(resultsPath: string) {
  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    // Extract performance metrics from test results
    const performanceMetrics = {
      totalTests: results.suites?.reduce((acc: number, suite: any) => 
        acc + (suite.specs?.length || 0), 0) || 0,
      totalDuration: results.suites?.reduce((acc: number, suite: any) => 
        acc + (suite.duration || 0), 0) || 0,
      averageTestDuration: 0,
      slowestTests: [],
      fastestTests: []
    };

    if (performanceMetrics.totalTests > 0) {
      performanceMetrics.averageTestDuration = 
        performanceMetrics.totalDuration / performanceMetrics.totalTests;
    }

    // Find slowest and fastest tests
    const allTests: any[] = [];
    results.suites?.forEach((suite: any) => {
      suite.specs?.forEach((spec: any) => {
        spec.tests?.forEach((test: any) => {
          allTests.push({
            title: test.title,
            duration: test.results?.[0]?.duration || 0,
            status: test.results?.[0]?.status || 'unknown'
          });
        });
      });
    });

    allTests.sort((a, b) => b.duration - a.duration);
    performanceMetrics.slowestTests = allTests.slice(0, 5);
    performanceMetrics.fastestTests = allTests.slice(-5).reverse();

    // Save performance report
    const reportPath = path.join('test-results', 'e2e-performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(performanceMetrics, null, 2));
    
    console.log(`📈 Performance report saved to: ${reportPath}`);
    console.log(`⏱️  Average test duration: ${performanceMetrics.averageTestDuration.toFixed(2)}ms`);
    
  } catch (error) {
    console.error('Failed to generate performance report:', error);
  }
}

export default globalTeardown;