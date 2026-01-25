#!/usr/bin/env node

/**
 * Simple AI Video Studio Deployment Script
 * Bypasses workspace dependencies and deploys directly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description, cwd = process.cwd()) {
  log(`\n🔄 ${description}...`, 'blue');
  try {
    const output = execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      cwd: cwd
    });
    log(`✅ ${description} completed successfully`, 'green');
    return output;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    throw error;
  }
}

function createEnvironmentFiles() {
  log('\n🔍 Creating environment configuration...', 'cyan');
  
  const frontendEnvPath = path.join('apps', 'frontend', '.env.production');
  const backendEnvPath = path.join('apps', 'backend', '.env.production');
  
  if (!fs.existsSync(frontendEnvPath)) {
    const frontendEnv = `VITE_API_URL=https://your-backend.railway.app
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience
VITE_ENVIRONMENT=production`;
    
    fs.writeFileSync(frontendEnvPath, frontendEnv);
    log('📝 Created apps/frontend/.env.production template', 'yellow');
  }
  
  if (!fs.existsSync(backendEnvPath)) {
    const backendEnv = `NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=https://your-api-audience
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret`;
    
    fs.writeFileSync(backendEnvPath, backendEnv);
    log('📝 Created apps/backend/.env.production template', 'yellow');
  }
}

function fixPackageJsonFiles() {
  log('\n🔧 Fixing package.json workspace dependencies...', 'cyan');
  
  // Fix frontend package.json
  const frontendPackagePath = path.join('apps', 'frontend', 'package.json');
  if (fs.existsSync(frontendPackagePath)) {
    const frontendPackage = JSON.parse(fs.readFileSync(frontendPackagePath, 'utf8'));
    
    // Remove workspace dependencies
    if (frontendPackage.dependencies) {
      delete frontendPackage.dependencies['@ai-video-studio/types'];
      delete frontendPackage.dependencies['@ai-video-studio/utils'];
      delete frontendPackage.dependencies['@ai-video-studio/config'];
    }
    
    fs.writeFileSync(frontendPackagePath, JSON.stringify(frontendPackage, null, 2));
    log('✅ Fixed frontend package.json', 'green');
  }
  
  // Fix backend package.json
  const backendPackagePath = path.join('apps', 'backend', 'package.json');
  if (fs.existsSync(backendPackagePath)) {
    const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
    
    // Remove workspace dependencies
    if (backendPackage.dependencies) {
      delete backendPackage.dependencies['@ai-video-studio/types'];
      delete backendPackage.dependencies['@ai-video-studio/utils'];
      delete backendPackage.dependencies['@ai-video-studio/config'];
    }
    
    fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2));
    log('✅ Fixed backend package.json', 'green');
  }
}

function installFrontendDependencies() {
  const frontendPath = path.join('apps', 'frontend');
  execCommand('npm install', 'Installing frontend dependencies', frontendPath);
}

function installBackendDependencies() {
  const backendPath = path.join('apps', 'backend');
  execCommand('npm install', 'Installing backend dependencies', backendPath);
}

function buildFrontend() {
  const frontendPath = path.join('apps', 'frontend');
  execCommand('npm run build', 'Building frontend', frontendPath);
}

function buildBackend() {
  const backendPath = path.join('apps', 'backend');
  execCommand('npm run build', 'Building backend', backendPath);
}

function installDeploymentTools() {
  log('\n🛠️ Installing deployment tools...', 'cyan');
  
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    log('✅ Vercel CLI already installed', 'green');
  } catch (error) {
    execCommand('npm install -g vercel', 'Installing Vercel CLI');
  }
  
  try {
    execSync('railway --version', { stdio: 'pipe' });
    log('✅ Railway CLI already installed', 'green');
  } catch (error) {
    execCommand('npm install -g @railway/cli', 'Installing Railway CLI');
  }
}

function deployFrontend() {
  log('\n🚀 Deploying frontend to Vercel...', 'magenta');
  log('⚠️  You will need to run "vercel login" first if not already logged in', 'yellow');
  
  const frontendPath = path.join('apps', 'frontend');
  try {
    execCommand('vercel --prod', 'Deploying to Vercel', frontendPath);
  } catch (error) {
    log('❌ Frontend deployment failed. Please run "vercel login" first.', 'red');
    log('Then run: cd apps/frontend && vercel --prod', 'yellow');
  }
}

function deployBackend() {
  log('\n🚀 Deploying backend to Railway...', 'magenta');
  log('⚠️  You will need to run "railway login" first if not already logged in', 'yellow');
  
  const backendPath = path.join('apps', 'backend');
  try {
    execCommand('railway up', 'Deploying to Railway', backendPath);
  } catch (error) {
    log('❌ Backend deployment failed. Please run "railway login" first.', 'red');
    log('Then run: cd apps/backend && railway up', 'yellow');
  }
}

async function main() {
  log('🚀 Simple AI Video Studio Deployment', 'bright');
  log('====================================', 'bright');
  
  try {
    createEnvironmentFiles();
    fixPackageJsonFiles();
    installFrontendDependencies();
    installBackendDependencies();
    buildFrontend();
    buildBackend();
    installDeploymentTools();
    
    log('\n📋 Manual deployment steps:', 'cyan');
    log('1. Login to Vercel: vercel login', 'reset');
    log('2. Login to Railway: railway login', 'reset');
    log('3. Deploy frontend: cd apps/frontend && vercel --prod', 'reset');
    log('4. Deploy backend: cd apps/backend && railway up', 'reset');
    
    log('\n🎉 Build completed successfully!', 'green');
    log('Please follow the manual deployment steps above.', 'yellow');
    
  } catch (error) {
    log('\n💥 Build failed!', 'red');
    log('Please check the error messages above.', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };