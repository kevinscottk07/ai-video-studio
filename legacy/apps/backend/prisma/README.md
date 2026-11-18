# Prisma ORM Setup for AI Video Studio

This directory contains the Prisma ORM configuration for the AI Video Studio backend, providing type-safe database access with optimized performance and connection management.

## Overview

The Prisma setup includes:
- **Schema Definition**: Complete database schema with all entities and relationships
- **Type-Safe Client**: Auto-generated TypeScript client for database operations
- **Connection Pooling**: Optimized connection management for high-performance operations
- **Migration System**: Database schema versioning and deployment
- **Seeding Scripts**: Initial data population for development and testing

## Database Schema

The schema includes the following main entities:

### Core Entities
- **Users**: User accounts with authentication and profile information
- **Subscriptions**: User subscription plans and billing information
- **Projects**: Video creation projects with settings and metadata
- **GenerationJobs**: AI video generation tasks with progress tracking
- **CreditTransactions**: Credit purchase and usage tracking

### Media & Content
- **MediaAssets**: Project files and media resources
- **CommunityPosts**: Shared videos in the community feed
- **Comments**: User comments on community posts
- **CommunityLikes**: Like interactions on posts
- **CommunityShares**: Share tracking for social media

### Reference Data
- **SubscriptionPlans**: Available subscription tiers
- **VideoStyles**: Available video generation styles
- **MusicGenres**: Music categories for video generation
- **SupportedLanguages**: Supported interface and content languages
- **CommunityTags**: Tags for categorizing community content

### System
- **SystemConfig**: Application configuration settings
- **AuditLogs**: System activity and change tracking

## Setup Instructions

### 1. Environment Configuration

Copy the environment template and configure your database connection:

```bash
cp .env.example .env.local
```

Update the `DATABASE_URL` in your `.env.local` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/ai_video_studio?schema=public"
```

### 2. Install Dependencies

Ensure all dependencies are installed:

```bash
npm install
```

### 3. Generate Prisma Client

Generate the type-safe Prisma client:

```bash
npm run db:generate
```

### 4. Database Setup

For development, push the schema to your database:

```bash
npm run db:push
```

For production, use migrations:

```bash
npm run db:migrate
```

### 5. Seed Initial Data

Populate the database with reference data:

```bash
npm run db:seed
```

### 6. Complete Setup

Run all setup steps at once:

```bash
npm run db:setup
```

## Available Scripts

### Database Management
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes (development)
- `npm run db:migrate` - Run database migrations
- `npm run db:migrate:create <name>` - Create new migration
- `npm run db:migrate:reset` - Reset database (development only)
- `npm run db:seed` - Seed database with initial data
- `npm run db:setup` - Complete database setup
- `npm run db:studio` - Open Prisma Studio (database GUI)

### Development
- `npm run dev` - Start development server with hot reload
- `npm run test` - Run unit tests
- `npm run test:coverage` - Run tests with coverage report

## Usage Examples

### Basic Operations

```typescript
import { prismaService } from '../services/prismaService.js';

// Create a user
const user = await prismaService.createUser({
  email: 'user@example.com',
  authProviderId: 'auth0|123456',
  displayName: 'John Doe',
  language: 'en',
  timezone: 'UTC',
});

// Create a project
const project = await prismaService.createProject({
  userId: user.id,
  title: 'My Video Project',
  description: 'A sample video project',
  settings: {
    resolution: 'hd',
    duration: 60,
    style: 'cinematic',
  },
});

// Create a generation job
const job = await prismaService.createGenerationJob({
  projectId: project.id,
  userId: user.id,
  operationType: 'video_generation',
  requestData: {
    prompt: 'Create a cinematic video about nature',
    duration: 60,
  },
  creditsRequired: 50,
  estimatedAWSCost: 2.50,
  platformProfit: 2.50,
});
```

### Advanced Queries with Optimization

```typescript
import { PaginationHelper, QueryOptimizer } from '../utils/queryOptimization.js';

// Cursor-based pagination for better performance
const { data, nextCursor, hasMore } = await PaginationHelper.cursorPaginate(
  prisma.project,
  {
    where: { userId: user.id },
    limit: 20,
    cursor: lastProjectId,
    include: { mediaAssets: true },
  }
);

// Batch multiple queries
const [user, projects, creditHistory] = await QueryOptimizer.batchQueries([
  () => prismaService.getUserById(userId),
  () => prismaService.getUserProjects(userId),
  () => prismaService.getUserCreditHistory(userId),
]);
```

## Performance Optimization

### Connection Pooling

The setup includes optimized connection pooling:

```typescript
// Connection pool configuration
const poolConfig = {
  max: 20,              // Maximum connections
  min: 2,               // Minimum connections
  idleTimeoutMillis: 30000,     // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
  maxUses: 7500,        // Max uses per connection
};
```

### Query Optimization

- **Cursor-based pagination** for large datasets
- **Connection pooling** for high-concurrency scenarios
- **Query monitoring** with performance metrics
- **Batch operations** for multiple related queries
- **Selective field loading** to minimize data transfer

### Monitoring

The system includes comprehensive monitoring:

- Query performance tracking
- Slow query detection and logging
- Connection pool statistics
- Database health checks
- Performance analytics

## Migration Strategy

### Development
Use `db:push` for rapid schema iteration:
```bash
npm run db:push
```

### Production
Use proper migrations for production deployments:
```bash
# Create migration
npm run db:migrate:create add_new_feature

# Deploy migrations
npm run db:migrate
```

## Testing

The setup includes comprehensive test coverage:

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test prismaService.test.ts
```

## Troubleshooting

### Common Issues

1. **Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Ensure database server is running
   - Check network connectivity

2. **Migration Errors**
   - Review migration files for conflicts
   - Check database permissions
   - Verify schema compatibility

3. **Performance Issues**
   - Monitor slow queries in logs
   - Check connection pool settings
   - Review query optimization

### Debug Mode

Enable debug logging for development:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

## Security Considerations

- **Row Level Security (RLS)** policies are defined in the initial migration
- **Audit logging** tracks all data modifications
- **Connection encryption** is enforced for production
- **Input validation** is handled at the service layer
- **Sensitive data** is properly masked in logs

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use connection pooling with appropriate limits
3. Enable query logging and monitoring
4. Set up automated backups
5. Configure proper security policies
6. Monitor performance metrics

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Prisma documentation: https://www.prisma.io/docs
- Check application logs for detailed error information