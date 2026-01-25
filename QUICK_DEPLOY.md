# 🚀 Quick Deploy Guide - AI Video Studio

## 5-Minute Setup (After Prerequisites)

### Step 1: Install Node.js
1. Download from https://nodejs.org/ (LTS version)
2. Install with default settings
3. Restart your terminal/command prompt

### Step 2: Verify Installation
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Run Deployment Script
```bash
# Windows PowerShell
.\deploy.ps1

# Or using Node.js (cross-platform)
node deploy.js
```

## What the Script Does

1. ✅ Checks prerequisites (Node.js, npm)
2. ✅ Creates environment file templates
3. ✅ Installs all dependencies
4. ✅ Runs tests (optional)
5. ✅ Builds frontend and backend
6. ✅ Installs deployment tools (Vercel CLI, Railway CLI)
7. ✅ Deploys frontend to Vercel
8. ✅ Deploys backend to Railway
9. ✅ Runs health checks

## Required Accounts (Free Tiers Available)

### Essential Services
1. **Vercel** (Frontend hosting) - https://vercel.com
2. **Railway** (Backend hosting) - https://railway.app
3. **Supabase** (Database) - https://supabase.com
4. **Auth0** (Authentication) - https://auth0.com

### Optional Services (Can be added later)
5. **AWS** (AI services) - https://aws.amazon.com
6. **Stripe** (Payments) - https://stripe.com
7. **Upstash** (Redis cache) - https://upstash.com

## Environment Variables Setup

The deployment script will create template files. Update these with your actual values:

### Frontend (`apps/frontend/.env.production`)
```bash
VITE_API_URL=https://your-backend.railway.app
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience
VITE_ENVIRONMENT=production
```

### Backend (`apps/backend/.env.production`)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://user:password@host:port
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=https://your-api-audience
```

## Deployment Options

### Option 1: Full Deployment (Recommended)
```bash
.\deploy.ps1
```

### Option 2: Frontend Only
```bash
.\deploy.ps1 -FrontendOnly
```

### Option 3: Backend Only
```bash
.\deploy.ps1 -BackendOnly
```

### Option 4: Skip Tests (Faster)
```bash
.\deploy.ps1 -SkipTests
```

## After Deployment

1. **Frontend URL**: Check Vercel dashboard for your app URL
2. **Backend URL**: Check Railway dashboard for your API URL
3. **Update Frontend**: Update `VITE_API_URL` with your Railway backend URL
4. **Test**: Visit your frontend URL and test basic functionality

## Troubleshooting

### "Command not found" errors
- Make sure Node.js is installed and restart your terminal
- On Windows, you might need to run PowerShell as Administrator

### "Login required" errors
- Run `vercel login` for Vercel deployment
- Run `railway login` for Railway deployment

### Build failures
- Check that all environment variables are set
- Try `npm run clean` then `npm install` again

### Database connection issues
- Verify your DATABASE_URL is correct
- Make sure your database allows connections from Railway's IP ranges

## Getting Help

1. Check the full deployment guide: `DEPLOYMENT_CHECKLIST.md`
2. Review setup instructions: `DEPLOYMENT_SETUP.md`
3. Check service documentation:
   - [Vercel Docs](https://vercel.com/docs)
   - [Railway Docs](https://docs.railway.app)
   - [Supabase Docs](https://supabase.com/docs)

## Success Indicators

✅ **Frontend deployed**: You can access your app at the Vercel URL
✅ **Backend deployed**: API health check returns 200 OK
✅ **Database connected**: No connection errors in Railway logs
✅ **Authentication working**: Users can register and login
✅ **Basic functionality**: Dashboard loads and shows user data

## Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure monitoring and alerts
3. Set up automated backups
4. Add payment processing (Stripe)
5. Configure AI services (AWS)
6. Set up email notifications
7. Add performance monitoring

---

**Estimated Time**: 15-30 minutes for basic deployment (after Node.js installation)