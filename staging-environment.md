# Staging Environment Setup Guide

## Overview

This guide provides instructions for setting up a production-like staging environment for User Acceptance Testing (UAT) of the AI Video Studio platform.

## Environment Requirements

### Infrastructure Components

- **Frontend**: Vercel staging deployment
- **Backend**: Railway/Render staging instance
- **Database**: Supabase/PlanetScale staging database
- **Redis**: Redis Cloud staging instance
- **AWS Services**: Separate AWS account or isolated staging resources
- **Authentication**: Auth0 staging tenant
- **Payment Processing**: LemonSqueezy/Paddle test mode

### Resource Specifications

#### Backend (Railway/Render)
- **Memory**: 2GB RAM minimum
- **CPU**: 2 vCPU cores
- **Storage**: 20GB SSD
- **Network**: High-speed internet connection
- **Scaling**: Auto-scaling enabled (2-4 instances)

#### Database (Supabase/PlanetScale)
- **Plan**: Pro tier for production-like performance
- **Storage**: 10GB minimum
- **Connections**: 100 concurrent connections
- **Backup**: Daily automated backups
- **Monitoring**: Real-time performance metrics

#### Redis Cache
- **Memory**: 1GB Redis instance
- **Persistence**: RDB + AOF enabled
- **Clustering**: Single instance (staging)
- **Monitoring**: Memory and connection tracking

## Environment Variables

### Frontend Staging (.env.staging)

```bash
# Application Environment
VITE_ENVIRONMENT=staging
VITE_API_URL=https://ai-video-studio-staging.railway.app
VITE_WS_URL=wss://ai-video-studio-staging.railway.app

# Authentication (Auth0 Staging Tenant)
VITE_AUTH0_DOMAIN=ai-video-studio-staging.auth0.com
VITE_AUTH0_CLIENT_ID=your-staging-auth0-client-id
VITE_AUTH0_AUDIENCE=https://api.ai-video-studio-staging.com
VITE_AUTH0_REDIRECT_URI=https://ai-video-studio-staging.vercel.app/callback

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ENABLE_DEBUG_MODE=true

# External Services
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_POSTHOG_KEY=your-posthog-staging-key
```

### Backend Staging (.env.staging)

```bash
# Application Environment
NODE_ENV=staging
PORT=3000
API_VERSION=v1
LOG_LEVEL=debug

# Database Configuration
DATABASE_URL=postgresql://user:password@staging-db.supabase.co:5432/ai_video_studio_staging
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_SSL=true

# Redis Configuration
REDIS_URL=redis://user:password@staging-redis.cloud.redislabs.com:12345
REDIS_TTL=3600
REDIS_MAX_CONNECTIONS=50

# Authentication (Auth0 Staging)
AUTH0_DOMAIN=ai-video-studio-staging.auth0.com
AUTH0_AUDIENCE=https://api.ai-video-studio-staging.com
AUTH0_CLIENT_ID=your-staging-auth0-client-id
AUTH0_CLIENT_SECRET=your-staging-auth0-client-secret

# JWT Configuration
JWT_SECRET=your-super-secret-staging-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AWS Configuration (Staging Account/Resources)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-staging-aws-access-key
AWS_SECRET_ACCESS_KEY=your-staging-aws-secret-key
AWS_S3_BUCKET=ai-video-studio-staging-assets
AWS_CLOUDFRONT_DOMAIN=staging-cdn.ai-video-studio.com

# AWS Bedrock Configuration
AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
AWS_BEDROCK_MAX_TOKENS=4096

# Payment Processing (Test Mode)
LEMONSQUEEZY_API_KEY=your-staging-lemonsqueezy-api-key
LEMONSQUEEZY_STORE_ID=your-staging-store-id
LEMONSQUEEZY_WEBHOOK_SECRET=your-staging-webhook-secret
LEMONSQUEEZY_TEST_MODE=true

# Email Service
RESEND_API_KEY=your-staging-resend-api-key
FROM_EMAIL=noreply@staging.ai-video-studio.com
SUPPORT_EMAIL=support@staging.ai-video-studio.com

# Monitoring and Analytics
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=staging
POSTHOG_API_KEY=your-posthog-staging-key
POSTHOG_HOST=https://app.posthog.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# File Upload Limits
MAX_FILE_SIZE_MB=500
MAX_FILES_PER_PROJECT=50
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,audio/mpeg,audio/wav

# Feature Flags
ENABLE_COMMUNITY_FEATURES=true
ENABLE_REALTIME_FEATURES=true
ENABLE_AI_CONTENT_MODERATION=true
ENABLE_ANALYTICS_TRACKING=true
ENABLE_DEBUG_LOGGING=true
```

## Deployment Instructions

### 1. Database Setup

#### Supabase Staging Setup
```bash
# Create new Supabase project for staging
npx supabase projects create ai-video-studio-staging

# Link to staging project
npx supabase link --project-ref your-staging-project-ref

# Run migrations
npx supabase db push

# Seed with UAT data
npm run seed:uat
```

#### Alternative: PlanetScale Staging Setup
```bash
# Create staging branch
pscale branch create ai-video-studio staging

# Deploy schema
pscale deploy-request create ai-video-studio staging

# Seed with UAT data
npm run seed:uat
```

### 2. Backend Deployment (Railway)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create staging project
railway new ai-video-studio-staging

# Set environment variables
railway variables set NODE_ENV=staging
railway variables set DATABASE_URL="your-staging-database-url"
# ... (set all staging environment variables)

# Deploy backend
railway up
```

### 3. Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Create staging deployment
vercel --prod --env staging

# Set environment variables in Vercel dashboard
# or use Vercel CLI:
vercel env add VITE_API_URL staging
vercel env add VITE_AUTH0_DOMAIN staging
# ... (set all staging environment variables)
```

### 4. Auth0 Staging Configuration

1. **Create Staging Tenant**
   - Create new Auth0 tenant: `ai-video-studio-staging`
   - Configure allowed callback URLs: `https://ai-video-studio-staging.vercel.app/callback`
   - Configure allowed logout URLs: `https://ai-video-studio-staging.vercel.app`

2. **Configure Applications**
   - Create SPA application for frontend
   - Create Machine-to-Machine application for backend
   - Set up proper scopes and permissions

3. **Configure Social Connections**
   - Google OAuth (staging credentials)
   - GitHub OAuth (staging credentials)
   - Configure proper redirect URLs

### 5. AWS Staging Resources

#### S3 Bucket Configuration
```bash
# Create staging S3 bucket
aws s3 mb s3://ai-video-studio-staging-assets --region us-east-1

# Configure CORS policy
aws s3api put-bucket-cors --bucket ai-video-studio-staging-assets --cors-configuration file://s3-cors-config.json

# Set up lifecycle policies for cost optimization
aws s3api put-bucket-lifecycle-configuration --bucket ai-video-studio-staging-assets --lifecycle-configuration file://s3-lifecycle-config.json
```

#### CloudFront Distribution
```bash
# Create CloudFront distribution for staging assets
aws cloudfront create-distribution --distribution-config file://cloudfront-staging-config.json
```

#### Bedrock Access
```bash
# Ensure Bedrock access is enabled in staging AWS account
aws bedrock list-foundation-models --region us-east-1
```

## Data Seeding

### Run UAT Data Seeding

```bash
# Navigate to backend directory
cd apps/backend

# Install dependencies
npm install

# Run UAT data seeding
npm run seed:uat

# Verify data was created
npm run db:studio
```

### Seed Data Includes

- **6 Demo Users**: Free, Starter, Pro, Ultra, Admin, Moderator
- **3 Active Subscriptions**: Starter, Pro, Ultra plans
- **5 Demo Projects**: Various stages (draft, generating, completed)
- **3 Generation Jobs**: Different statuses and operation types
- **3 Community Posts**: With engagement metrics
- **5 Comments**: Realistic community interactions
- **5 Credit Transactions**: Purchase and usage history
- **3 Media Assets**: Sample uploaded files
- **Reference Data**: Plans, styles, genres, languages, tags

## Testing Scenarios

### User Journey Testing

1. **New User Registration**
   - Sign up with email/Google
   - Complete onboarding flow
   - Explore free tier limitations

2. **Subscription Management**
   - Upgrade from free to paid plan
   - View billing history
   - Manage subscription settings

3. **Video Creation Workflow**
   - Create new project
   - Upload assets
   - Generate video with AI
   - Monitor generation progress
   - Download completed video

4. **Community Interaction**
   - Share project to community
   - Browse community feed
   - Like and comment on posts
   - Report inappropriate content

5. **Credit Management**
   - Purchase additional credits
   - Monitor credit usage
   - View transaction history
   - Understand cost estimation

### Admin Testing Scenarios

1. **User Management**
   - View user analytics
   - Manage user accounts
   - Handle support requests

2. **Content Moderation**
   - Review flagged content
   - Take moderation actions
   - Manage community guidelines

3. **System Configuration**
   - Adjust credit pricing
   - Configure feature flags
   - Monitor system health

## Performance Testing

### Load Testing Configuration

```bash
# Install k6 for load testing
npm install -g k6

# Run load tests
k6 run scripts/load-test-staging.js

# Monitor performance metrics
npm run monitor:staging
```

### Performance Targets

- **API Response Time**: < 200ms for 95% of requests
- **Page Load Time**: < 2 seconds for initial load
- **Video Generation**: < 5 minutes for standard videos
- **Concurrent Users**: Support 100+ simultaneous users
- **Database Queries**: < 100ms for 95% of queries

## Monitoring and Observability

### Application Monitoring

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature usage
- **Custom Metrics**: Business KPIs and system health

### Infrastructure Monitoring

- **Railway/Render**: Built-in application metrics
- **Supabase**: Database performance and query analytics
- **AWS CloudWatch**: AWS service monitoring
- **Uptime Monitoring**: External service availability checks

## Security Configuration

### SSL/TLS Configuration
- All endpoints use HTTPS
- Proper SSL certificate configuration
- HSTS headers enabled

### CORS Configuration
```javascript
const corsOptions = {
  origin: [
    'https://ai-video-studio-staging.vercel.app',
    'https://staging.ai-video-studio.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Rate Limiting
- API rate limiting: 100 requests per 15 minutes
- File upload limits: 500MB per file
- Concurrent job limits: 5 per user

## Backup and Recovery

### Database Backups
- Automated daily backups
- Point-in-time recovery capability
- Cross-region backup replication

### Asset Backups
- S3 versioning enabled
- Cross-region replication
- Lifecycle policies for cost optimization

## Cost Optimization

### Resource Scaling
- Auto-scaling based on demand
- Scheduled scaling for predictable loads
- Resource monitoring and alerts

### AWS Cost Management
- Budget alerts for AWS spending
- Resource tagging for cost allocation
- Regular cost optimization reviews

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Test database connectivity
   npm run db:test-connection
   
   # Check connection pool status
   npm run db:pool-status
   ```

2. **Authentication Issues**
   ```bash
   # Verify Auth0 configuration
   npm run auth:test-config
   
   # Test JWT token validation
   npm run auth:test-jwt
   ```

3. **AWS Service Issues**
   ```bash
   # Test AWS credentials
   aws sts get-caller-identity
   
   # Test S3 access
   aws s3 ls s3://ai-video-studio-staging-assets
   
   # Test Bedrock access
   aws bedrock list-foundation-models
   ```

### Health Check Endpoints

- **Frontend**: `https://ai-video-studio-staging.vercel.app/health`
- **Backend**: `https://ai-video-studio-staging.railway.app/health`
- **Database**: `https://ai-video-studio-staging.railway.app/health/db`
- **Redis**: `https://ai-video-studio-staging.railway.app/health/redis`

## UAT Checklist

### Pre-UAT Setup
- [ ] Staging environment deployed and accessible
- [ ] All environment variables configured
- [ ] Database migrated and seeded with demo data
- [ ] Auth0 staging tenant configured
- [ ] AWS resources provisioned and accessible
- [ ] Payment processing in test mode
- [ ] Monitoring and logging configured

### UAT Execution
- [ ] User registration and authentication flows
- [ ] Subscription management and billing
- [ ] Video creation and generation workflows
- [ ] Community features and interactions
- [ ] Admin dashboard and management tools
- [ ] Performance under load
- [ ] Error handling and recovery
- [ ] Security and data privacy compliance

### Post-UAT
- [ ] Document all issues and feedback
- [ ] Prioritize fixes and improvements
- [ ] Update production deployment plan
- [ ] Prepare user training materials
- [ ] Schedule production deployment

## Support and Documentation

### UAT Support Contacts
- **Technical Issues**: tech-support@ai-video-studio.com
- **User Experience**: ux-feedback@ai-video-studio.com
- **Business Questions**: business@ai-video-studio.com

### Documentation Links
- **API Documentation**: https://docs-staging.ai-video-studio.com
- **User Guide**: https://help-staging.ai-video-studio.com
- **Admin Guide**: https://admin-docs-staging.ai-video-studio.com

This staging environment provides a production-like testing environment that enables comprehensive user acceptance testing while maintaining isolation from production systems.