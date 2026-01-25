# AI Video Studio - Deployment Setup Guide

## Prerequisites Installation

### 1. Install Node.js (Required)
Download and install Node.js 18+ from: https://nodejs.org/
- Choose the LTS version (18.x or higher)
- This will also install npm automatically

### 2. Verify Installation
After installing Node.js, open a new terminal and run:
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### 3. Install Deployment Tools

#### For Vercel (Frontend Deployment)
```bash
npm install -g vercel
```

#### For Railway (Backend Deployment)
```bash
npm install -g @railway/cli
```

### 4. Install Project Dependencies
```bash
npm install
```

## Quick Deployment Options

### Option A: Automated CI/CD (Recommended)
1. Push your code to GitHub
2. Connect repositories to Vercel and Railway
3. Set up environment variables
4. Automatic deployments on push to main branch

### Option B: Manual Deployment
1. Build the applications locally
2. Deploy frontend to Vercel
3. Deploy backend to Railway
4. Configure environment variables

### Option C: Docker Deployment
1. Install Docker Desktop
2. Use docker-compose for local deployment
3. Deploy containers to cloud providers

## Environment Variables Needed

### Frontend (.env.production)
```bash
VITE_API_URL=https://your-backend.railway.app
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience
VITE_ENVIRONMENT=production
```

### Backend (.env.production)
```bash
NODE_ENV=production
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
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

## Next Steps

1. Install Node.js from the link above
2. Run the verification commands
3. Install the deployment tools
4. Set up your cloud accounts (Vercel, Railway, Auth0, AWS, Stripe)
5. Configure environment variables
6. Run the deployment commands

## Cloud Services Setup Required

### 1. Vercel Account
- Sign up at https://vercel.com
- Connect your GitHub repository
- Get your Vercel token for CLI deployment

### 2. Railway Account
- Sign up at https://railway.app
- Create a new project
- Get your Railway token for CLI deployment

### 3. Database (Choose one)
- **Supabase** (Recommended): Free PostgreSQL with 500MB
- **PlanetScale**: Serverless MySQL with generous free tier
- **Railway PostgreSQL**: Integrated with your backend deployment

### 4. Redis Cache
- **Upstash**: Serverless Redis with free tier
- **Railway Redis**: Integrated with your backend deployment

### 5. Auth0 Setup
- Sign up at https://auth0.com
- Create a new application
- Configure callback URLs and settings

### 6. AWS Account
- Set up AWS account for AI services (Bedrock, S3, SageMaker)
- Create IAM user with appropriate permissions
- Get access keys for API integration

### 7. Payment Processing
- **Stripe**: For credit card processing
- **LemonSqueezy**: Alternative payment processor
- Set up webhooks for subscription management

## Estimated Setup Time
- **Basic setup**: 30-60 minutes
- **Full production setup**: 2-3 hours
- **With all integrations**: 4-6 hours

## Support
If you need help with any of these steps, refer to the individual service documentation or create an issue in the repository.