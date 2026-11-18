# AI Video Studio - User Acceptance Testing (UAT) Setup

## Quick Start

### 1. Run the Setup Script

**Linux/macOS:**
```bash
chmod +x scripts/setup-uat-environment.sh
./scripts/setup-uat-environment.sh
```

**Windows:**
```powershell
.\scripts\setup-uat-environment.ps1
```

### 2. Start the Servers

**Linux/macOS:**
```bash
./start-uat-servers.sh
```

**Windows:**
```batch
start-uat-servers.bat
```

### 3. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Admin Dashboard**: http://localhost:5173/admin

## Demo Accounts

| Role | Email | Password | Credits | Features |
|------|-------|----------|---------|----------|
| Free User | demo.free@aivideostudio.com | DemoUser2024! | 25 | Basic video generation |
| Starter User | demo.starter@aivideostudio.com | DemoUser2024! | 150 | HD videos, 5min duration |
| Pro User | demo.pro@aivideostudio.com | DemoUser2024! | 750 | 4K videos, 2hr duration |
| Ultra User | demo.ultra@aivideostudio.com | DemoUser2024! | 2,500 | 8K videos, VR support |
| Admin | demo.admin@aivideostudio.com | AdminDemo2024! | 10,000 | Full platform access |
| Moderator | demo.moderator@aivideostudio.com | ModeratorDemo2024! | 1,000 | Content moderation |

## UAT Documentation

| Document | Description |
|----------|-------------|
| [UAT User Guide](UAT_USER_GUIDE.md) | Comprehensive testing guide for users |
| [UAT Test Plan](UAT_TEST_PLAN.md) | Detailed test procedures and schedules |
| [Staging Environment](staging-environment.md) | Production-like environment setup |
| [Feedback Template](UAT_FEEDBACK_TEMPLATE.md) | Structured feedback collection form |
| [Implementation Summary](UAT_IMPLEMENTATION_SUMMARY.md) | Complete UAT preparation overview |

## Test Scenarios

### 1. New User Journey (30 min)
- User registration and onboarding
- Profile setup and preferences
- First video creation
- Credit system understanding

### 2. Subscription Management (20 min)
- Plan comparison and selection
- Payment processing (test mode)
- Billing history and invoices
- Plan upgrades and downgrades

### 3. Video Creation Workflow (45 min)
- Simple text-to-video generation
- Advanced video with custom assets
- Progress tracking and notifications
- Project management and organization

### 4. Community Features (25 min)
- Content discovery and browsing
- Social interactions (likes, comments)
- Content sharing and engagement
- Community guidelines and moderation

### 5. Admin Dashboard (30 min)
- User management and analytics
- Content moderation workflow
- System configuration and monitoring
- Revenue and performance metrics

## Success Criteria

### Functional Requirements
- ✅ All core features work as specified
- ✅ User workflows complete successfully
- ✅ Data integrity maintained
- ✅ Error handling works appropriately
- ✅ Security measures function correctly

### Performance Requirements
- ✅ Page load times < 2 seconds
- ✅ API responses < 200ms
- ✅ Video generation within expected timeframes
- ✅ System handles concurrent users
- ✅ No memory leaks or performance degradation

### User Experience Requirements
- ✅ Intuitive navigation and interface
- ✅ Clear instructions and feedback
- ✅ Consistent design and branding
- ✅ Accessible to users with disabilities
- ✅ Mobile-responsive design

## Feedback Submission

### Methods
1. **In-App Feedback Widget**: Click the feedback button in the app
2. **Email**: Send detailed reports to uat-feedback@aivideostudio.com
3. **Feedback Form**: Complete the structured feedback template
4. **Direct Contact**: Reach out to uat-support@aivideostudio.com

### What to Report
- **Critical Bugs**: System crashes, data loss, security issues
- **Functional Issues**: Features not working as expected
- **Performance Problems**: Slow loading, timeouts, errors
- **UX Concerns**: Confusing interface, unclear instructions
- **Suggestions**: Improvements and missing features

## Support

### Contact Information
- **Technical Support**: uat-support@aivideostudio.com
- **General Questions**: uat-manager@aivideostudio.com
- **Emergency Issues**: emergency-uat@aivideostudio.com

### Response Times
- **Critical Issues**: Within 2 hours
- **High Priority**: Within 4 hours
- **General Questions**: Within 24 hours

### Common Issues

#### Login Problems
- Clear browser cache and cookies
- Try incognito/private browsing
- Verify email address spelling
- Check spam folder for verification emails

#### Video Generation Issues
- Ensure sufficient credit balance
- Check file format compatibility
- Verify internet connection
- Try simpler prompts for testing

#### Payment Testing
- Use test card: 4242 4242 4242 4242
- Use any future expiry date
- Use any 3-digit CVC code
- Use any valid ZIP code

## Environment Details

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: PostgreSQL (Supabase/PlanetScale)
- **Authentication**: Auth0
- **Payment**: LemonSqueezy (test mode)
- **AI Services**: AWS Bedrock
- **Storage**: AWS S3
- **Real-time**: Socket.io + Redis

### Demo Data Included
- 6 pre-configured user accounts
- 5 sample projects in various states
- 3 generation jobs with different statuses
- Community posts with engagement metrics
- Credit transaction history
- Subscription and billing data
- Media assets and file uploads

## Troubleshooting

### Setup Issues

**Database Connection Failed**
```bash
# Check DATABASE_URL environment variable
echo $DATABASE_URL

# Test database connectivity
cd apps/backend
npm run db:test
```

**Dependencies Installation Failed**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Build Errors**
```bash
# Check TypeScript errors
npm run type-check

# Clear build cache
npm run clean
npm run build
```

### Runtime Issues

**Servers Won't Start**
- Check if ports 3001 and 5173 are available
- Verify environment variables are set
- Check for any error messages in console

**Demo Data Missing**
```bash
# Re-run UAT data seeding
cd apps/backend
npm run db:seed:uat
```

**Authentication Not Working**
- Verify Auth0 configuration
- Check environment variables
- Clear browser cookies and try again

## Next Steps After UAT

1. **Compile Feedback**: Aggregate all tester feedback and bug reports
2. **Prioritize Issues**: Categorize and prioritize fixes based on severity
3. **Implement Fixes**: Address critical and high-priority issues
4. **Regression Testing**: Verify fixes don't break existing functionality
5. **Production Deployment**: Prepare for production release
6. **User Training**: Create final user documentation and training materials
7. **Launch Planning**: Coordinate marketing and launch activities

## UAT Timeline

**Total Duration**: 2 weeks
**Daily Testing**: 4-6 hours
**Participants**: 15-20 testers
**Test Coverage**: 95% of critical features

**Week 1**: Core functionality (auth, billing, credits, basic video generation)
**Week 2**: Advanced features (community, admin, performance, security)

---

**Ready to start testing?** Run the setup script and begin with the UAT User Guide!

For questions or issues, contact: uat-support@aivideostudio.com