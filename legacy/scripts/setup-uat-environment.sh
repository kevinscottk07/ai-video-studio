#!/bin/bash

# AI Video Studio - UAT Environment Setup Script
# This script sets up the staging environment for User Acceptance Testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"
FRONTEND_DIR="$PROJECT_ROOT/apps/frontend"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    # Check Docker (optional but recommended)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Some features may not work properly."
    fi
    
    # Check environment files
    if [ ! -f "$BACKEND_DIR/.env.local" ]; then
        log_warning "Backend .env.local not found. Please configure environment variables."
    fi
    
    if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
        log_warning "Frontend .env.local not found. Please configure environment variables."
    fi
    
    log_success "Prerequisites check completed"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    cd "$PROJECT_ROOT"
    npm install
    
    # Install backend dependencies
    cd "$BACKEND_DIR"
    npm install
    
    # Install frontend dependencies
    cd "$FRONTEND_DIR"
    npm install
    
    log_success "Dependencies installed successfully"
}

setup_database() {
    log_info "Setting up database..."
    
    cd "$BACKEND_DIR"
    
    # Check if DATABASE_URL is set
    if [ -z "$DATABASE_URL" ]; then
        log_warning "DATABASE_URL not set. Please configure your database connection."
        log_info "You can use Supabase, PlanetScale, or any PostgreSQL database."
        return 1
    fi
    
    # Run database migrations
    log_info "Running database migrations..."
    npm run db:migrate || {
        log_error "Database migration failed. Please check your database connection."
        return 1
    }
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    npm run db:generate || {
        log_error "Prisma client generation failed."
        return 1
    }
    
    log_success "Database setup completed"
}

seed_uat_data() {
    log_info "Seeding UAT demo data..."
    
    cd "$BACKEND_DIR"
    
    # Run UAT data seeding
    npm run seed:uat || {
        log_error "UAT data seeding failed. Please check the database connection and try again."
        return 1
    }
    
    log_success "UAT demo data seeded successfully"
}

build_applications() {
    log_info "Building applications..."
    
    # Build backend
    cd "$BACKEND_DIR"
    npm run build || {
        log_error "Backend build failed"
        return 1
    }
    
    # Build frontend
    cd "$FRONTEND_DIR"
    npm run build || {
        log_error "Frontend build failed"
        return 1
    }
    
    log_success "Applications built successfully"
}

run_tests() {
    log_info "Running tests to verify setup..."
    
    # Run backend tests
    cd "$BACKEND_DIR"
    npm run test:unit || {
        log_warning "Some backend tests failed. Please review the test results."
    }
    
    # Run frontend tests
    cd "$FRONTEND_DIR"
    npm run test:unit || {
        log_warning "Some frontend tests failed. Please review the test results."
    }
    
    log_success "Test execution completed"
}

start_development_servers() {
    log_info "Starting development servers..."
    
    # Create a script to start both servers
    cat > "$PROJECT_ROOT/start-uat-servers.sh" << 'EOF'
#!/bin/bash

# Start both frontend and backend servers for UAT
echo "Starting AI Video Studio UAT Environment..."

# Function to cleanup on exit
cleanup() {
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
cd apps/backend
npm run dev &
BACKEND_PID=$!

# Start frontend server
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Backend server starting on http://localhost:3001"
echo "Frontend server starting on http://localhost:5173"
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
EOF
    
    chmod +x "$PROJECT_ROOT/start-uat-servers.sh"
    
    log_success "Development server script created: start-uat-servers.sh"
}

create_uat_documentation() {
    log_info "Creating UAT documentation..."
    
    # Create UAT directory if it doesn't exist
    UAT_DIR="$PROJECT_ROOT/uat-documentation"
    mkdir -p "$UAT_DIR"
    
    # Copy UAT files to documentation directory
    if [ -f "$PROJECT_ROOT/UAT_USER_GUIDE.md" ]; then
        cp "$PROJECT_ROOT/UAT_USER_GUIDE.md" "$UAT_DIR/"
    fi
    
    if [ -f "$PROJECT_ROOT/UAT_TEST_PLAN.md" ]; then
        cp "$PROJECT_ROOT/UAT_TEST_PLAN.md" "$UAT_DIR/"
    fi
    
    if [ -f "$PROJECT_ROOT/staging-environment.md" ]; then
        cp "$PROJECT_ROOT/staging-environment.md" "$UAT_DIR/"
    fi
    
    # Create a README for UAT
    cat > "$UAT_DIR/README.md" << 'EOF'
# UAT Documentation

This directory contains all documentation needed for User Acceptance Testing.

## Files

- `UAT_USER_GUIDE.md` - Comprehensive user guide for testers
- `UAT_TEST_PLAN.md` - Detailed test plan and procedures
- `staging-environment.md` - Staging environment setup guide

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
EOF
    
    log_success "UAT documentation created in $UAT_DIR"
}

verify_setup() {
    log_info "Verifying UAT environment setup..."
    
    # Check if servers can start
    cd "$BACKEND_DIR"
    if ! npm run health-check &> /dev/null; then
        log_warning "Backend health check failed. Please verify configuration."
    fi
    
    # Check database connection
    if ! npm run db:status &> /dev/null; then
        log_warning "Database connection check failed. Please verify DATABASE_URL."
    fi
    
    # Check if demo data exists
    if ! npm run db:check-demo-data &> /dev/null; then
        log_warning "Demo data verification failed. UAT data may not be properly seeded."
    fi
    
    log_success "Environment verification completed"
}

print_summary() {
    echo ""
    echo "=========================================="
    echo "  UAT Environment Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Next Steps:"
    echo "1. Start the development servers:"
    echo "   ./start-uat-servers.sh"
    echo ""
    echo "2. Access the application:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:3001"
    echo "   Admin Dashboard: http://localhost:5173/admin"
    echo ""
    echo "3. Review UAT documentation:"
    echo "   - UAT User Guide: uat-documentation/UAT_USER_GUIDE.md"
    echo "   - Test Plan: uat-documentation/UAT_TEST_PLAN.md"
    echo ""
    echo "4. Use demo accounts for testing:"
    echo "   - Free: demo.free@aivideostudio.com"
    echo "   - Starter: demo.starter@aivideostudio.com"
    echo "   - Pro: demo.pro@aivideostudio.com"
    echo "   - Ultra: demo.ultra@aivideostudio.com"
    echo "   - Admin: demo.admin@aivideostudio.com"
    echo "   - Password for all: DemoUser2024! (AdminDemo2024! for admin)"
    echo ""
    echo "5. Report issues to: uat-support@aivideostudio.com"
    echo ""
    echo "Happy Testing! 🚀"
    echo ""
}

# Main execution
main() {
    echo "=========================================="
    echo "  AI Video Studio UAT Environment Setup"
    echo "=========================================="
    echo ""
    
    # Load environment variables if available
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    fi
    
    if [ -f "$BACKEND_DIR/.env.local" ]; then
        source "$BACKEND_DIR/.env.local"
    fi
    
    # Execute setup steps
    check_prerequisites
    install_dependencies
    setup_database
    seed_uat_data
    build_applications
    run_tests
    start_development_servers
    create_uat_documentation
    verify_setup
    print_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "AI Video Studio UAT Environment Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --skip-tests        Skip running tests"
        echo "  --skip-build        Skip building applications"
        echo "  --seed-only         Only run database seeding"
        echo "  --verify-only       Only run verification checks"
        echo ""
        echo "Environment Variables:"
        echo "  DATABASE_URL        Database connection string"
        echo "  NODE_ENV           Environment (should be 'staging')"
        echo ""
        exit 0
        ;;
    --skip-tests)
        SKIP_TESTS=true
        ;;
    --skip-build)
        SKIP_BUILD=true
        ;;
    --seed-only)
        seed_uat_data
        exit 0
        ;;
    --verify-only)
        verify_setup
        exit 0
        ;;
esac

# Run main function
main "$@"