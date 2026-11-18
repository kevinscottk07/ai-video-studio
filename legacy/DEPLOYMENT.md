# Deployment Guide

This guide covers deploying the AI Video Studio to production environments.

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Vercel CLI (for frontend deployment)
- Railway CLI (for backend deployment)
- GitHub account (for CI/CD)

## Environment Variables

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

## Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   npm run deploy:frontend
   ```

#### Backend (Railway)
1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Create a new project:
   ```bash
   railway new
   ```

4. Deploy:
   ```bash
   npm run deploy:backend
   ```

### Option 2: Docker Deployment

#### Build and run with Docker Compose
```bash
# Build all services
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

#### Production Docker deployment
```bash
# Build production images
docker build -f apps/frontend/Dockerfile -t ai-video-studio-frontend .
docker build -f apps/backend/Dockerfile -t ai-video-studio-backend .

# Run with production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Manual Deployment

#### Frontend
```bash
# Build the frontend
npm run build:frontend

# Upload dist folder to your static hosting service
# (Netlify, Vercel, AWS S3 + CloudFront, etc.)
```

#### Backend
```bash
# Build the backend
npm run build:backend

# Upload to your server and run
npm run start:prod
```

## CI/CD Setup

### GitHub Actions

1. Add the following secrets to your GitHub repository:
   - `VERCEL_TOKEN`: Your Vercel token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID
   - `RAILWAY_TOKEN`: Your Railway token
   - `RAILWAY_PROJECT_ID`: Your Railway project ID
   - Environment variables for both frontend and backend

2. Push to main branch to trigger deployment

### Manual CI/CD

If not using GitHub Actions, you can set up manual deployment:

```bash
# Run tests
npm test

# Build applications
npm run build

# Deploy frontend
npm run deploy:frontend

# Deploy backend
npm run deploy:backend
```

## Database Setup

### Production Database Migration
```bash
# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### Database Backup
```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

## Monitoring and Health Checks

### Health Check Endpoints
- Frontend: `https://your-app.vercel.app/health`
- Backend: `https://your-backend.railway.app/health`

### Performance Monitoring
The application includes built-in performance monitoring:
- Core Web Vitals tracking
- API response time monitoring
- Error tracking and reporting
- Real-time metrics dashboard

### Logging
- Frontend: Browser console and performance metrics
- Backend: Structured logging with Winston
- Errors: Automatic error reporting and alerting

## Security Considerations

### HTTPS
- Ensure all production deployments use HTTPS
- Configure proper SSL certificates
- Set up HSTS headers

### Environment Variables
- Never commit sensitive environment variables
- Use secure secret management (Railway secrets, Vercel env vars)
- Rotate secrets regularly

### CORS Configuration
```javascript
// Backend CORS configuration
const corsOptions = {
  origin: [
    'https://your-app.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
};
```

### Rate Limiting
- Configure rate limiting for API endpoints
- Set up DDoS protection
- Monitor for suspicious activity

## Performance Optimization

### Frontend
- Code splitting is already configured
- Static assets are cached with proper headers
- Images are optimized and lazy-loaded
- Bundle analysis available with `npm run analyze`

### Backend
- Database connection pooling
- Redis caching for frequently accessed data
- API response caching
- Background job processing

### CDN Configuration
- Use CloudFront or similar CDN for static assets
- Configure proper cache headers
- Enable gzip compression

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   npm run clean
   npm install
   npm run build
   ```

2. **Database Connection Issues**
   ```bash
   # Check database URL and connectivity
   npm run health-check
   ```

3. **Environment Variable Issues**
   ```bash
   # Verify all required environment variables are set
   node -e "console.log(process.env)"
   ```

### Logs and Debugging
- Frontend: Check browser console and network tab
- Backend: Check application logs and error tracking
- Database: Monitor query performance and connection pool

### Performance Issues
- Use Lighthouse CI reports for frontend performance
- Monitor API response times and database queries
- Check memory usage and CPU utilization

## Scaling

### Horizontal Scaling
- Frontend: Automatically scaled by Vercel/CDN
- Backend: Configure auto-scaling on Railway/your platform
- Database: Consider read replicas for high traffic

### Vertical Scaling
- Monitor resource usage and upgrade plans as needed
- Optimize database queries and indexes
- Implement caching strategies

## Backup and Recovery

### Automated Backups
- Database: Daily automated backups
- File storage: S3 versioning and cross-region replication
- Configuration: Version control for all configuration files

### Disaster Recovery
- Document recovery procedures
- Test backup restoration regularly
- Maintain staging environment for testing

## Support and Maintenance

### Regular Maintenance
- Update dependencies monthly
- Monitor security advisories
- Review and rotate secrets quarterly
- Performance audits and optimization

### Monitoring Alerts
- Set up alerts for:
  - Application errors
  - Performance degradation
  - High resource usage
  - Failed deployments

For additional support, check the project documentation or create an issue in the repository.