#!/usr/bin/env node

/**
 * Fresh Deployment Script for AI Video Studio Frontend
 * 
 * This script triggers a fresh deployment by making a small change
 * and committing it to trigger Vercel's auto-deployment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting fresh deployment process...');

try {
  // Update deployment timestamp in package.json
  const packagePath = path.join(__dirname, 'apps/frontend/package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Add or update deployment timestamp
  packageJson.deploymentTimestamp = new Date().toISOString();
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('✅ Updated deployment timestamp');
  
  // Check if we're in a git repository
  try {
    execSync('git status', { stdio: 'pipe' });
    
    // Add changes
    execSync('git add apps/frontend/package.json apps/frontend/vercel.json', { stdio: 'inherit' });
    
    // Commit changes
    const commitMessage = `Deploy: Fresh deployment at ${new Date().toISOString()}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'inherit' });
    
    console.log('✅ Committed changes to git');
    
    // Push to trigger deployment
    execSync('git push', { stdio: 'inherit' });
    
    console.log('✅ Pushed to repository - Vercel deployment should start automatically');
    console.log('');
    console.log('🎉 Fresh deployment triggered!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Check your Vercel dashboard for the deployment status');
    console.log('2. Monitor the build logs for any issues');
    console.log('3. Test the deployed application once it\'s live');
    
  } catch (gitError) {
    console.log('⚠️  Git operations failed. You may need to commit and push manually:');
    console.log('   git add apps/frontend/package.json apps/frontend/vercel.json');
    console.log('   git commit -m "Deploy: Fresh deployment"');
    console.log('   git push');
  }
  
} catch (error) {
  console.error('❌ Deployment preparation failed:', error.message);
  process.exit(1);
}