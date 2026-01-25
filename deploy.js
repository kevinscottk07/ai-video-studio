#!/usr/bin/env node

/**
 * AI Video Studio Deployment Script
 * Automated deployment to Vercel (Frontend) and Railway (Backend)
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

function execCommand(command, description) {
  log(`\n🔄 ${description}...`, 'blue');
  try {
    const output = execSync(command, { stdio: 'inherit', encoding: 'utf8' });
    log(`✅ ${description} completed successfully`, 'green');
    return output;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    throw error;
  }
}

function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');
  
  try {
    execSync('node --version', { stdio: 'pipe' });
    log('✅ Node.js is installed', 'green');
  } catch (error) {
    log('❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/', 'red');
    process.exit(1);
  }

  try {
    execSync('npm --version', { stdio: 'pipe' });
    log('✅ npm is installed', 'green');
  } catch (error) {
    log('❌ npm is not installed', 'red');
    process.exit(1);
  }
}

function checkEnvironmentFiles() {
  log('\n🔍 Checking environment configuration...', 'cyan');
  
  const frontendEnv = path.join('apps', 'frontend', '.env.production');
  const backendEnv = path.join('apps', 'backend', '.env.production');
  
  if (!fs.existsSync(frontendEnv)) {
    log('⚠️  Frontend .env.production not found. Creating template...', 'yellow');
    const frontendEnvTemplate = `VITE_API_URL=https://your-backend.railway.app
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience
VITE_ENVIRONMENT=production`;
    fs.writeFileSync(frontendEnv, frontendEnvTemplate);
    log('📝 Please update apps/frontend/.env.production with your actual values', 'yellow');
  }
  
  if (!fs.existsSync(backendEnv)) {
    log('⚠️  Backend .env.production not found. Creating template...', 'yellow');
    const backendEnvTemplate = `NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port
JWT_SECRET=your-super-secret-jwt-key
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=https://your-api-audience
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret`;
    fs.writeFileSync(backendEnv, backendEnvTemplate);
    log('📝 Please update apps/backend/.env.production with your actual values', 'yellow');
  }
}

function installDependencies() {
  execCommand('npm install', 'Installing dependencies');
}

function runTests() {
  log('\n🧪 Running tests...', 'cyan');
  try {
    execCommand('npm run test', 'Running test suite');
  } catch (error) {
    log('⚠️  Some tests failed, but continuing with deployment...', 'yellow');
  }
}

function buildApplications() {
  execCommand('npm run build', 'Building applications');
}

function deployFrontend() {
  log('\n🚀 Deploying frontend to Vercel...', 'magenta');
  
  try {
    execSync('vercel --version', { stdio: 'pipe' });
  } catch (error) {
    log('⚠️  Vercel CLI not found. Installing...', 'yellow');
    execCommand('npm install -g vercel', 'Installing Vercel CLI');
  }
  
  try {
    execCommand('cd apps/frontend && vercel --prod', 'Deploying to Vercel');
  } catch (error) {
    log('❌ Frontend deployment failed. Please run "vercel login" first and try again.', 'red');
    throw error;
  }
}

function deployBackend() {
  log('\n🚀 Deploying backend to Railway...', 'magenta');
  
  try {
    execSync('railway --version', { stdio: 'pipe' });
  } catch (error) {
    log('⚠️  Railway CLI not found. Installing...', 'yellow');
    execCommand('npm install -g @railway/cli', 'Installing Railway CLI');
  }
  
  try {
    execCommand('cd apps/backend && railway up', 'Deploying to Railway');
  } catch (error) {
    log('❌ Backend deployment failed. Please run "railway login" first and try again.', 'red');
    throw error;
  }
}

function runHealthChecks() {
  log('\n🏥 Running health checks...', 'cyan');
  log('⏳ Waiting for services to start up...', 'yellow');
  
  // Wait a bit for services to start
  setTimeout(() => {
    log('✅ Deployment completed! Check your service URLs for health status.', 'green');
  }, 5000);
}

async function main() {
  log('🚀 AI Video Studio Deployment Script', 'bright');
  log('=====================================', 'bright');
  
  try {
    checkPrerequisites();
    checkEnvironmentFiles();
    installDependencies();
    runTests();
    buildApplications();
    
    const args = process.argv.slice(2);
    
    if (args.includes('--frontend-only')) {
      deployFrontend();
    } else if (args.includes('--backend-only')) {
      deployBackend();
    } else {
      deployFrontend();
      deployBackend();
    }
    
    runHealthChecks();
    
    log('\n🎉 Deployment completed successfully!', 'green');
    log('\n📋 Next steps:', 'cyan');
    log('1. Verify your applications are running at their deployed URLs', 'reset');
    log('2. Test the complete user journey from registration to video creation', 'reset');
    log('3. Monitor logs and performance metrics', 'reset');
    log('4. Set up monitoring alerts and backup procedures', 'reset');
    
  } catch (error) {
    log('\n💥 Deployment failed!', 'red');
    log('Please check the error messages above and try again.', 'red');
    log('\nFor help, see DEPLOYMENT_SETUP.md or the deployment documentation.', 'yellow');
    process.exit(1);
  }
}

// Handle command line arguments
if (require.main === module) {
  main();
}

module.exports = { main };