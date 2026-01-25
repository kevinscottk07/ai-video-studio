import { getPrisma } from '../config/prisma.js';
import { logger } from './logger.js';

/**
 * Query optimization utilities for improved database performance
 */

export interface QueryMetrics {
  query: string;
  duration: number;
  rowCount?: number;
  cached?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Query performance monitor
 */
export class QueryMonitor {
  private static slowQueryThreshold = 1000; // 1 second
  private static queryMetrics: QueryMetrics[] = [];
  private static maxMetricsHistory = 1000;

  static recordQuery(metrics: QueryMetrics): void {
    this.queryMetrics.push({
      ...metrics,
      timestamp: Date.now(),
    } as any);

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }

    // Log slow queries
    if (metrics.duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        query: metrics.query,
        duration: `${metrics.duration}ms`,
        rowCount: metrics.rowCount,
      });
    }
  }

  static getSlowQueries(limit = 10): QueryMetrics[] {
    return this.queryMetrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  static getAverageQueryTime(): number {
    if (this.queryMetrics.length === 0) return 0;
    const total = this.queryMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.queryMetrics.length;
  }

  static getQueryStats() {
    return {
      totalQueries: this.queryMetrics.length,
      averageTime: this.getAverageQueryTime(),
      slowQueries: this.getSlowQueries().length,
      slowQueryThreshold: this.slowQueryThreshold,
    };
  }
}

/**
 * Optimized pagination helper
 */
export class PaginationHelper {
  /**
   * Cursor-based pagination for better performance on large datasets
   */
  static async cursorPaginate<T>(
    model: any,
    options: {
      cursor?: string;
      limit?: number;
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
    }
  ): Promise<{
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const limit = Math.min(options.limit || 20, 100); // Cap at 100 items
    const take = limit + 1; // Take one extra to check if there are more

    const findManyOptions: any = {
      take,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: options.include,
      select: options.select,
    };

    if (options.cursor) {
      findManyOptions.cursor = { id: options.cursor };
      findManyOptions.skip = 1; // Skip the cursor item
    }

    const results = await model.findMany(findManyOptions);
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Offset-based pagination with count optimization
   */
  static async offsetPaginate<T>(
    model: any,
    options: {
      page?: number;
      limit?: number;
      where?: any;
      orderBy?: any;
      include?: any;
      select?: any;
      includeCount?: boolean;
    }
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total?: number;
      totalPages?: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const findManyOptions: any = {
      skip,
      take: limit,
      where: options.where,
      orderBy: options.orderBy || { createdAt: 'desc' },
      include: options.include,
      select: options.select,
    };

    // Execute queries in parallel for better performance
    const [data, total] = await Promise.all([
      model.findMany(findManyOptions),
      options.includeCount !== false ? model.count({ where: options.where }) : Promise.resolve(undefined),
    ]);

    const totalPages = total ? Math.ceil(total / limit) : undefined;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: total ? page < totalPages! : data.length === limit,
        hasPrev: page > 1,
      },
    };
  }
}

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Batch multiple queries for better performance
   */
  static async batchQueries<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
    const start = Date.now();
    const results = await Promise.all(queries.map(query => query()));
    const duration = Date.now() - start;

    QueryMonitor.recordQuery({
      query: `Batch of ${queries.length} queries`,
      duration,
      rowCount: results.length,
    });

    return results;
  }

  /**
   * Execute queries with connection pooling optimization
   */
  static async withOptimizedConnection<T>(
    callback: () => Promise<T>
  ): Promise<T> {
    const prisma = getPrisma();
    
    // Use a transaction for better connection reuse
    return await prisma.$transaction(async (tx) => {
      return await callback();
    });
  }

  /**
   * Optimize SELECT queries by limiting fields
   */
  static selectOptimized(fields: string[]) {
    return fields.reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {} as Record<string, boolean>);
  }

  /**
   * Build optimized WHERE clauses
   */
  static buildWhereClause(filters: Record<string, any>) {
    const where: any = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        where[key] = { in: value };
      } else if (typeof value === 'string' && value.includes('%')) {
        where[key] = { contains: value.replace(/%/g, ''), mode: 'insensitive' };
      } else if (typeof value === 'object' && value.from && value.to) {
        where[key] = { gte: value.from, lte: value.to };
      } else {
        where[key] = value;
      }
    });

    return where;
  }

  /**
   * Optimize ORDER BY clauses
   */
  static buildOrderBy(sort?: SortOptions | SortOptions[]) {
    if (!sort) return { createdAt: 'desc' };

    if (Array.isArray(sort)) {
      return sort.map(s => ({ [s.field]: s.direction }));
    }

    return { [sort.field]: sort.direction };
  }
}

/**
 * Database performance analyzer
 */
export class PerformanceAnalyzer {
  /**
   * Analyze query performance and suggest optimizations
   */
  static async analyzeQuery(query: string): Promise<{
    executionPlan: any;
    suggestions: string[];
  }> {
    const prisma = getPrisma();
    
    try {
      // Get query execution plan
      const plan = await prisma.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      
      const suggestions: string[] = [];
      
      // Analyze execution plan and provide suggestions
      if (plan && Array.isArray(plan) && plan[0]?.['QUERY PLAN']) {
        const queryPlan = plan[0]['QUERY PLAN'][0];
        
        if (queryPlan['Execution Time'] > 1000) {
          suggestions.push('Query execution time is high. Consider adding indexes or optimizing WHERE clauses.');
        }
        
        if (queryPlan['Planning Time'] > 100) {
          suggestions.push('Query planning time is high. Consider using prepared statements.');
        }
        
        // Check for sequential scans
        const planStr = JSON.stringify(queryPlan);
        if (planStr.includes('Seq Scan')) {
          suggestions.push('Sequential scan detected. Consider adding appropriate indexes.');
        }
        
        if (planStr.includes('Sort') && planStr.includes('external')) {
          suggestions.push('External sort detected. Consider increasing work_mem or optimizing the query.');
        }
      }
      
      return {
        executionPlan: plan,
        suggestions,
      };
    } catch (error) {
      logger.error('Failed to analyze query:', error);
      return {
        executionPlan: null,
        suggestions: ['Failed to analyze query performance'],
      };
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats() {
    const prisma = getPrisma();
    
    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `;
      
      return stats;
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return [];
    }
  }

  /**
   * Get index usage statistics
   */
  static async getIndexStats() {
    const prisma = getPrisma();
    
    try {
      const indexStats = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
      `;
      
      return indexStats;
    } catch (error) {
      logger.error('Failed to get index stats:', error);
      return [];
    }
  }
}

/**
 * Connection health monitor
 */
export class ConnectionMonitor {
  static async checkHealth(): Promise<{
    isHealthy: boolean;
    connectionCount: number;
    activeQueries: number;
    avgQueryTime: number;
  }> {
    const prisma = getPrisma();
    
    try {
      const [connectionInfo, queryStats] = await Promise.all([
        prisma.$queryRaw`
          SELECT 
            count(*) as connection_count,
            count(*) FILTER (WHERE state = 'active') as active_queries
          FROM pg_stat_activity 
          WHERE datname = current_database()
        ` as Promise<any[]>,
        Promise.resolve(QueryMonitor.getQueryStats()),
      ]);

      const info = connectionInfo[0];
      
      return {
        isHealthy: true,
        connectionCount: parseInt(info.connection_count),
        activeQueries: parseInt(info.active_queries),
        avgQueryTime: queryStats.averageTime,
      };
    } catch (error) {
      logger.error('Connection health check failed:', error);
      return {
        isHealthy: false,
        connectionCount: 0,
        activeQueries: 0,
        avgQueryTime: 0,
      };
    }
  }
}