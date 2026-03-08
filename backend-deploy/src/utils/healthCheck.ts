import { getDatabase } from '../config/database.js';
import { logger } from './logger.js';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    database: {
      status: 'pass' | 'fail';
      responseTime: number;
      error?: string;
    };
    tables: {
      status: 'pass' | 'fail';
      tablesChecked: number;
      errors: string[];
    };
    indexes: {
      status: 'pass' | 'fail';
      indexesChecked: number;
      errors: string[];
    };
  };
  timestamp: string;
}

/**
 * Comprehensive database health check utility
 */
export class DatabaseHealthCheck {
  private db = getDatabase();

  /**
   * Run a complete health check on the database
   */
  async runHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      status: 'healthy',
      checks: {
        database: { status: 'pass', responseTime: 0 },
        tables: { status: 'pass', tablesChecked: 0, errors: [] },
        indexes: { status: 'pass', indexesChecked: 0, errors: [] },
      },
      timestamp: new Date().toISOString(),
    };

    try {
      // Check database connectivity
      await this.checkDatabaseConnectivity(result);

      // Check table integrity
      await this.checkTableIntegrity(result);

      // Check index health
      await this.checkIndexHealth(result);

      // Determine overall status
      const hasFailures = Object.values(result.checks).some(check => check.status === 'fail');
      result.status = hasFailures ? 'unhealthy' : 'healthy';

    } catch (error) {
      logger.error('Health check failed:', error);
      result.status = 'unhealthy';
      result.checks.database.status = 'fail';
      result.checks.database.error = error instanceof Error ? error.message : String(error);
    }

    result.checks.database.responseTime = Date.now() - startTime;
    return result;
  }

  /**
   * Check basic database connectivity
   */
  private async checkDatabaseConnectivity(result: HealthCheckResult): Promise<void> {
    try {
      const { data, error } = await this.db
        .from('users')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      result.checks.database.status = 'pass';
    } catch (error) {
      result.checks.database.status = 'fail';
      result.checks.database.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Check the integrity of core tables
   */
  private async checkTableIntegrity(result: HealthCheckResult): Promise<void> {
    const coreTables = [
      'users',
      'subscriptions',
      'subscription_plans',
      'projects',
      'credit_transactions',
      'generation_jobs',
      'media_assets',
      'community_posts',
      'comments',
      'audit_logs',
      'system_config'
    ];

    let checkedCount = 0;
    const errors: string[] = [];

    for (const table of coreTables) {
      try {
        const { error } = await this.db
          .from(table)
          .select('*')
          .limit(1);

        if (error && error.code !== 'PGRST116') {
          errors.push(`Table ${table}: ${error.message}`);
        } else {
          checkedCount++;
        }
      } catch (error) {
        errors.push(`Table ${table}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    result.checks.tables.tablesChecked = checkedCount;
    result.checks.tables.errors = errors;
    result.checks.tables.status = errors.length === 0 ? 'pass' : 'fail';
  }

  /**
   * Check the health of database indexes
   */
  private async checkIndexHealth(result: HealthCheckResult): Promise<void> {
    const criticalIndexes = [
      { table: 'users', column: 'email' },
      { table: 'users', column: 'auth_provider_id' },
      { table: 'projects', column: 'user_id' },
      { table: 'credit_transactions', column: 'user_id' },
      { table: 'generation_jobs', column: 'user_id' },
      { table: 'subscriptions', column: 'user_id' },
    ];

    let checkedCount = 0;
    const errors: string[] = [];

    for (const index of criticalIndexes) {
      try {
        // Test index usage by running a query that should use the index
        const { error } = await this.db
          .from(index.table)
          .select('*')
          .eq(index.column, 'test-value')
          .limit(1);

        if (error && error.code !== 'PGRST116') {
          errors.push(`Index ${index.table}.${index.column}: ${error.message}`);
        } else {
          checkedCount++;
        }
      } catch (error) {
        errors.push(`Index ${index.table}.${index.column}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    result.checks.indexes.indexesChecked = checkedCount;
    result.checks.indexes.errors = errors;
    result.checks.indexes.status = errors.length === 0 ? 'pass' : 'fail';
  }

  /**
   * Quick health check for monitoring endpoints
   */
  async quickHealthCheck(): Promise<{ status: 'ok' | 'error'; responseTime: number }> {
    const startTime = Date.now();

    try {
      const { error } = await this.db
        .from('users')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        status: 'ok',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Quick health check failed:', error);
      return {
        status: 'error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    userCount: number;
    projectCount: number;
    activeSubscriptions: number;
    totalCreditsTransacted: number;
    activeGenerationJobs: number;
  }> {
    try {
      const [
        { count: userCount },
        { count: projectCount },
        { count: activeSubscriptions },
        { data: creditStats },
        { count: activeJobs }
      ] = await Promise.all([
        this.db.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        this.db.from('projects').select('*', { count: 'exact', head: true }),
        this.db.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        this.db.from('credit_transactions').select('amount.sum()'),
        this.db.from('generation_jobs').select('*', { count: 'exact', head: true }).in('status', ['queued', 'processing'])
      ]);

      return {
        userCount: userCount || 0,
        projectCount: projectCount || 0,
        activeSubscriptions: activeSubscriptions || 0,
        totalCreditsTransacted: creditStats?.[0]?.sum || 0,
        activeGenerationJobs: activeJobs || 0,
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return {
        userCount: 0,
        projectCount: 0,
        activeSubscriptions: 0,
        totalCreditsTransacted: 0,
        activeGenerationJobs: 0,
      };
    }
  }
}

// Export singleton instance
export const databaseHealthCheck = new DatabaseHealthCheck();