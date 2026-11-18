#!/usr/bin/env node

/**
 * Custom Build Script for Vercel Deployment
 * This ensures we only run Vite build without TypeScript compilation
 */

import { execSync } from 'child_process';

console.log('🚀 Starting custom build process...');
console.log('📦 Running Vite build only (no TypeScript compilation)');

try {
  // Run only Vite build
  execSync('npx vite build', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}