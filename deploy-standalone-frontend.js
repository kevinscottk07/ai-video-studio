#!/usr/bin/env node

/**
 * Standalone Frontend Deployment Script
 * Creates a clean deployment without workspace dependencies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Creating standalone frontend deployment...');

// Create deployment directory
const deployDir = path.join(__dirname, 'frontend-deploy');
const frontendDir = path.join(__dirname, 'apps', 'frontend');

// Clean up existing deployment directory
if (fs.existsSync(deployDir)) {
  console.log('🧹 Cleaning up existing deployment directory...');
  fs.rmSync(deployDir, { recursive: true, force: true });
}

// Create new deployment directory
fs.mkdirSync(deployDir, { recursive: true });

console.log('📁 Copying frontend files...');

// Copy all frontend files except node_modules and dist
const copyRecursive = (src, dest) => {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    const basename = path.basename(src);
    if (basename === 'node_modules' || basename === 'dist' || basename === '.git') {
      return; // Skip these directories
    }
    
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

copyRecursive(frontendDir, deployDir);

console.log('📦 Installing dependencies...');

// Install dependencies in the deployment directory
try {
  execSync('npm install', { 
    cwd: deployDir, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('🏗️ Building application...');
  
  // Build the application
  execSync('npm run build', { 
    cwd: deployDir, 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('🚀 Deploying to Vercel...');
  
  // Deploy to Vercel
  execSync('npx vercel --prod', { 
    cwd: deployDir, 
    stdio: 'inherit'
  });
  
  console.log('✅ Deployment completed successfully!');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}