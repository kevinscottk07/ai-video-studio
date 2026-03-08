import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Setup test data or authentication if needed
    console.log('📝 Setting up test data...');
    
    // You can add setup logic here, such as:
    // - Creating test users
    // - Setting up test database
    // - Configuring mock services
    
    // Example: Setup mock authentication
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:5173');
    
    // Store authentication state if needed
    await page.context().storageState({ path: 'test-results/auth-state.json' });
    
    console.log('✅ E2E test environment setup complete');
  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;