# AI Video Studio - UAT Environment Setup Script (PowerShell)
# This script sets up the staging environment for User Acceptance Testing

param(
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$SeedOnly,
    [switch]$VerifyOnly,
    [switch]$Help
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $ProjectRoot "apps\backend"
$FrontendDir = Join-Path $ProjectRoot "apps\frontend"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Show-Help {
    Write-Host "AI Video Studio UAT Environment Setup Script"
    Write-Host ""
    Write-Host "Usage: .\setup-uat-environment.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Help           Show this help message"
    Write-Host "  -SkipTests      Skip running tests"
    Write-Host "  -SkipBuild      Skip building applications"
    Write-Host "  -SeedOnly       Only run database seeding"
    Write-Host "  -VerifyOnly     Only run verification checks"
    Write-Host ""
    Write-Host "Environment Variables:"
    Write-Host "  DATABASE_URL    Database connection string"
    Write-Host "  NODE_ENV        Environment (should be 'staging')"
    Write-Host ""
    exit 0
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -lt 18) {
            Write-Error "Node.js version 18+ is required. Current version: $nodeVersion"
            exit 1
        }
        Write-Success "Node.js version check passed: $nodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm version check passed: $npmVersion"
    }
    catch {
        Write-Error "npm is not installed. Please install npm and try again."
        exit 1
    }
    
    # Check Docker (optional)
    try {
        $dockerVersion = docker --version
        Write-Success "Docker available: $dockerVersion"
    }
    catch {
        Write-Warning "Docker is not installed. Some features may not work properly."
    }
    
    # Check environment files
    if (-not (Test-Path "$BackendDir\.env.local")) {
        Write-Warning "Backend .env.local not found. Please configure environment variables."
    }
    
    if (-not (Test-Path "$FrontendDir\.env.local")) {
        Write-Warning "Frontend .env.local not found. Please configure environment variables."
    }
    
    Write-Success "Prerequisites check completed"
}

function Install-Dependencies {
    Write-Info "Installing dependencies..."
    
    # Install root dependencies
    Set-Location $ProjectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install root dependencies"
        exit 1
    }
    
    # Install backend dependencies
    Set-Location $BackendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install backend dependencies"
        exit 1
    }
    
    # Install frontend dependencies
    Set-Location $FrontendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install frontend dependencies"
        exit 1
    }
    
    Write-Success "Dependencies installed successfully"
}

function Setup-Database {
    Write-Info "Setting up database..."
    
    Set-Location $BackendDir
    
    # Check if DATABASE_URL is set
    if (-not $env:DATABASE_URL) {
        Write-Warning "DATABASE_URL not set. Please configure your database connection."
        Write-Info "You can use Supabase, PlanetScale, or any PostgreSQL database."
        return
    }
    
    # Run database migrations
    Write-Info "Running database migrations..."
    npm run db:migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Database migration failed. Please check your database connection."
        return
    }
    
    # Generate Prisma client
    Write-Info "Generating Prisma client..."
    npm run db:generate
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Prisma client generation failed."
        return
    }
    
    Write-Success "Database setup completed"
}

function Seed-UATData {
    Write-Info "Seeding UAT demo data..."
    
    Set-Location $BackendDir
    
    # Run UAT data seeding
    npm run db:seed:uat
    if ($LASTEXITCODE -ne 0) {
        Write-Error "UAT data seeding failed. Please check the database connection and try again."
        return
    }
    
    Write-Success "UAT demo data seeded successfully"
}

function Build-Applications {
    Write-Info "Building applications..."
    
    # Build backend
    Set-Location $BackendDir
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend build failed"
        return
    }
    
    # Build frontend
    Set-Location $FrontendDir
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        return
    }
    
    Write-Success "Applications built successfully"
}

function Run-Tests {
    Write-Info "Running tests to verify setup..."
    
    # Run backend tests
    Set-Location $BackendDir
    npm run test
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Some backend tests failed. Please review the test results."
    }
    
    # Run frontend tests
    Set-Location $FrontendDir
    npm run test
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Some frontend tests failed. Please review the test results."
    }
    
    Write-Success "Test execution completed"
}

function Create-StartupScript {
    Write-Info "Creating development server startup script..."
    
    $startupScript = @"
@echo off
echo Starting AI Video Studio UAT Environment...

echo Starting backend server...
start "Backend Server" cmd /k "cd /d `"$BackendDir`" && npm run dev"

timeout /t 3 /nobreak > nul

echo Starting frontend server...
start "Frontend Server" cmd /k "cd /d `"$FrontendDir`" && npm run dev"

echo.
echo Backend server: http://localhost:3001
echo Frontend server: http://localhost:5173
echo.
echo Press any key to continue...
pause > nul
"@
    
    $startupScript | Out-File -FilePath "$ProjectRoot\start-uat-servers.bat" -Encoding ASCII
    
    Write-Success "Development server script created: start-uat-servers.bat"
}

function Create-UATDocumentation {
    Write-Info "Creating UAT documentation..."
    
    # Create UAT directory if it doesn't exist
    $UATDir = Join-Path $ProjectRoot "uat-documentation"
    if (-not (Test-Path $UATDir)) {
        New-Item -ItemType Directory -Path $UATDir | Out-Null
    }
    
    # Copy UAT files to documentation directory
    $filesToCopy = @(
        "UAT_USER_GUIDE.md",
        "UAT_TEST_PLAN.md",
        "staging-environment.md",
        "UAT_FEEDBACK_TEMPLATE.md",
        "UAT_IMPLEMENTATION_SUMMARY.md"
    )
    
    foreach ($file in $filesToCopy) {
        $sourcePath = Join-Path $ProjectRoot $file
        if (Test-Path $sourcePath) {
            Copy-Item $sourcePath $UATDir
        }
    }
    
    # Create a README for UAT
    $readmeContent = @"
# UAT Documentation

This directory contains all documentation needed for User Acceptance Testing.

## Files

- ``UAT_USER_GUIDE.md`` - Comprehensive user guide for testers
- ``UAT_TEST_PLAN.md`` - Detailed test plan and procedures
- ``staging-environment.md`` - Staging environment setup guide
- ``UAT_FEEDBACK_TEMPLATE.md`` - Feedback collection form
- ``UAT_IMPLEMENTATION_SUMMARY.md`` - Complete implementation summary

## Quick Start

1. Review the UAT User Guide for testing instructions
2. Use the provided demo accounts for testing
3. Follow the test scenarios in the Test Plan
4. Report issues using the feedback channels

## Demo Accounts

- Free User: demo.free@aivideostudio.com / DemoUser2024!
- Starter User: demo.starter@aivideostudio.com / DemoUser2024!
- Pro User: demo.pro@aivideostudio.com / DemoUser2024!
- Ultra User: demo.ultra@aivideostudio.com / DemoUser2024!
- Admin: demo.admin@aivideostudio.com / AdminDemo2024!
- Moderator: demo.moderator@aivideostudio.com / ModeratorDemo2024!

## Support

For technical issues during UAT, contact: uat-support@aivideostudio.com
"@
    
    $readmeContent | Out-File -FilePath "$UATDir\README.md" -Encoding UTF8
    
    Write-Success "UAT documentation created in $UATDir"
}

function Test-Setup {
    Write-Info "Verifying UAT environment setup..."
    
    # Check if servers can start (basic check)
    Set-Location $BackendDir
    if (Test-Path "dist\server.js") {
        Write-Success "Backend build verification passed"
    } else {
        Write-Warning "Backend build verification failed. Please verify configuration."
    }
    
    Set-Location $FrontendDir
    if (Test-Path "dist\index.html") {
        Write-Success "Frontend build verification passed"
    } else {
        Write-Warning "Frontend build verification failed. Please verify configuration."
    }
    
    Write-Success "Environment verification completed"
}

function Show-Summary {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  UAT Environment Setup Complete!" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Start the development servers:" -ForegroundColor White
    Write-Host "   .\start-uat-servers.bat" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Access the application:" -ForegroundColor White
    Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Gray
    Write-Host "   Backend API: http://localhost:3001" -ForegroundColor Gray
    Write-Host "   Admin Dashboard: http://localhost:5173/admin" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Review UAT documentation:" -ForegroundColor White
    Write-Host "   - UAT User Guide: uat-documentation\UAT_USER_GUIDE.md" -ForegroundColor Gray
    Write-Host "   - Test Plan: uat-documentation\UAT_TEST_PLAN.md" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Use demo accounts for testing:" -ForegroundColor White
    Write-Host "   - Free: demo.free@aivideostudio.com" -ForegroundColor Gray
    Write-Host "   - Starter: demo.starter@aivideostudio.com" -ForegroundColor Gray
    Write-Host "   - Pro: demo.pro@aivideostudio.com" -ForegroundColor Gray
    Write-Host "   - Ultra: demo.ultra@aivideostudio.com" -ForegroundColor Gray
    Write-Host "   - Admin: demo.admin@aivideostudio.com" -ForegroundColor Gray
    Write-Host "   - Password for all: DemoUser2024! (AdminDemo2024! for admin)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Report issues to: uat-support@aivideostudio.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Happy Testing! 🚀" -ForegroundColor Green
    Write-Host ""
}

# Main execution
function Main {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  AI Video Studio UAT Environment Setup" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Handle parameters
    if ($Help) {
        Show-Help
    }
    
    if ($SeedOnly) {
        Seed-UATData
        exit 0
    }
    
    if ($VerifyOnly) {
        Test-Setup
        exit 0
    }
    
    # Load environment variables if available
    if (Test-Path "$ProjectRoot\.env") {
        Get-Content "$ProjectRoot\.env" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    }
    
    if (Test-Path "$BackendDir\.env.local") {
        Get-Content "$BackendDir\.env.local" | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
    }
    
    # Execute setup steps
    Test-Prerequisites
    Install-Dependencies
    Setup-Database
    Seed-UATData
    
    if (-not $SkipBuild) {
        Build-Applications
    }
    
    if (-not $SkipTests) {
        Run-Tests
    }
    
    Create-StartupScript
    Create-UATDocumentation
    Test-Setup
    Show-Summary
}

# Run main function
Main