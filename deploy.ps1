# AI Video Studio Deployment Script for Windows PowerShell
# Automated deployment to Vercel (Frontend) and Railway (Backend)

param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$SkipTests,
    [switch]$Help
)

# Colors for console output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Magenta = "Magenta"
    Cyan = "Cyan"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Invoke-CommandWithLogging {
    param(
        [string]$Command,
        [string]$Description,
        [switch]$ContinueOnError
    )
    
    Write-ColorOutput "`n🔄 $Description..." "Blue"
    
    try {
        Invoke-Expression $Command
        Write-ColorOutput "✅ $Description completed successfully" "Green"
        return $true
    }
    catch {
        Write-ColorOutput "❌ $Description failed: $($_.Exception.Message)" "Red"
        if (-not $ContinueOnError) {
            throw
        }
        return $false
    }
}

function Test-Prerequisites {
    Write-ColorOutput "`n🔍 Checking prerequisites..." "Cyan"
    
    try {
        $nodeVersion = node --version 2>$null
        Write-ColorOutput "✅ Node.js is installed: $nodeVersion" "Green"
    }
    catch {
        Write-ColorOutput "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/" "Red"
        exit 1
    }

    try {
        $npmVersion = npm --version 2>$null
        Write-ColorOutput "✅ npm is installed: $npmVersion" "Green"
    }
    catch {
        Write-ColorOutput "❌ npm is not installed" "Red"
        exit 1
    }
}

function Test-EnvironmentFiles {
    Write-ColorOutput "`n🔍 Checking environment configuration..." "Cyan"
    
    $frontendEnv = "apps\frontend\.env.production"
    $backendEnv = "apps\backend\.env.production"
    
    if (-not (Test-Path $frontendEnv)) {
        Write-ColorOutput "⚠️  Frontend .env.production not found. Creating template..." "Yellow"
        $frontendEnvTemplate = @"
VITE_API_URL=https://your-backend.railway.app
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience
VITE_ENVIRONMENT=production
"@
        $frontendEnvTemplate | Out-File -FilePath $frontendEnv -Encoding UTF8
        Write-ColorOutput "📝 Please update apps/frontend/.env.production with your actual values" "Yellow"
    }
    
    if (-not (Test-Path $backendEnv)) {
        Write-ColorOutput "⚠️  Backend .env.production not found. Creating template..." "Yellow"
        $backendEnvTemplate = @"
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
"@
        $backendEnvTemplate | Out-File -FilePath $backendEnv -Encoding UTF8
        Write-ColorOutput "📝 Please update apps/backend/.env.production with your actual values" "Yellow"
    }
}

function Install-Dependencies {
    Invoke-CommandWithLogging "npm install" "Installing dependencies"
}

function Invoke-Tests {
    if (-not $SkipTests) {
        Write-ColorOutput "`n🧪 Running tests..." "Cyan"
        Invoke-CommandWithLogging "npm run test" "Running test suite" -ContinueOnError
    }
}

function Build-Applications {
    Invoke-CommandWithLogging "npm run build" "Building applications"
}

function Deploy-Frontend {
    Write-ColorOutput "`n🚀 Deploying frontend to Vercel..." "Magenta"
    
    try {
        vercel --version 2>$null | Out-Null
    }
    catch {
        Write-ColorOutput "⚠️  Vercel CLI not found. Installing..." "Yellow"
        Invoke-CommandWithLogging "npm install -g vercel" "Installing Vercel CLI"
    }
    
    try {
        Set-Location "apps\frontend"
        Invoke-CommandWithLogging "vercel --prod" "Deploying to Vercel"
        Set-Location "..\..\"
    }
    catch {
        Write-ColorOutput "❌ Frontend deployment failed. Please run 'vercel login' first and try again." "Red"
        Set-Location "..\..\"
        throw
    }
}

function Deploy-Backend {
    Write-ColorOutput "`n🚀 Deploying backend to Railway..." "Magenta"
    
    try {
        railway --version 2>$null | Out-Null
    }
    catch {
        Write-ColorOutput "⚠️  Railway CLI not found. Installing..." "Yellow"
        Invoke-CommandWithLogging "npm install -g @railway/cli" "Installing Railway CLI"
    }
    
    try {
        Set-Location "apps\backend"
        Invoke-CommandWithLogging "railway up" "Deploying to Railway"
        Set-Location "..\..\"
    }
    catch {
        Write-ColorOutput "❌ Backend deployment failed. Please run 'railway login' first and try again." "Red"
        Set-Location "..\..\"
        throw
    }
}

function Invoke-HealthChecks {
    Write-ColorOutput "`n🏥 Running health checks..." "Cyan"
    Write-ColorOutput "⏳ Waiting for services to start up..." "Yellow"
    
    Start-Sleep -Seconds 5
    Write-ColorOutput "✅ Deployment completed! Check your service URLs for health status." "Green"
}

function Show-Help {
    Write-ColorOutput "AI Video Studio Deployment Script" "White"
    Write-ColorOutput "=================================" "White"
    Write-ColorOutput ""
    Write-ColorOutput "Usage: .\deploy.ps1 [options]" "Cyan"
    Write-ColorOutput ""
    Write-ColorOutput "Options:" "Yellow"
    Write-ColorOutput "  -FrontendOnly    Deploy only the frontend to Vercel" "White"
    Write-ColorOutput "  -BackendOnly     Deploy only the backend to Railway" "White"
    Write-ColorOutput "  -SkipTests       Skip running tests before deployment" "White"
    Write-ColorOutput "  -Help            Show this help message" "White"
    Write-ColorOutput ""
    Write-ColorOutput "Examples:" "Yellow"
    Write-ColorOutput "  .\deploy.ps1                    # Deploy both frontend and backend" "White"
    Write-ColorOutput "  .\deploy.ps1 -FrontendOnly      # Deploy only frontend" "White"
    Write-ColorOutput "  .\deploy.ps1 -BackendOnly       # Deploy only backend" "White"
    Write-ColorOutput "  .\deploy.ps1 -SkipTests         # Deploy without running tests" "White"
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

Write-ColorOutput "🚀 AI Video Studio Deployment Script" "White"
Write-ColorOutput "=====================================" "White"

try {
    Test-Prerequisites
    Test-EnvironmentFiles
    Install-Dependencies
    Invoke-Tests
    Build-Applications
    
    if ($FrontendOnly) {
        Deploy-Frontend
    }
    elseif ($BackendOnly) {
        Deploy-Backend
    }
    else {
        Deploy-Frontend
        Deploy-Backend
    }
    
    Invoke-HealthChecks
    
    Write-ColorOutput "`n🎉 Deployment completed successfully!" "Green"
    Write-ColorOutput "`n📋 Next steps:" "Cyan"
    Write-ColorOutput "1. Verify your applications are running at their deployed URLs" "White"
    Write-ColorOutput "2. Test the complete user journey from registration to video creation" "White"
    Write-ColorOutput "3. Monitor logs and performance metrics" "White"
    Write-ColorOutput "4. Set up monitoring alerts and backup procedures" "White"
}
catch {
    Write-ColorOutput "`n💥 Deployment failed!" "Red"
    Write-ColorOutput "Please check the error messages above and try again." "Red"
    Write-ColorOutput "`nFor help, see DEPLOYMENT_SETUP.md or run .\deploy.ps1 -Help" "Yellow"
    exit 1
}