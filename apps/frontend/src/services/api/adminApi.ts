import { apiClient } from './client';
import type {
  AdminDashboardMetrics,
  GetUsersRequest,
  GetUsersResponse,
  UpdateUserRequest,
  UpdateUserResponse,
  GetSystemMetricsRequest,
  GetSystemMetricsResponse,
  PricingConfig,
  UpdatePricingConfigRequest,
  UpdatePricingConfigResponse,
  GetAuditLogsRequest,
  GetAuditLogsResponse,
  DateRange
} from '@ai-video-studio/types';

/**
 * Admin API Service
 * Handles all administrative operations including analytics, user management, and system configuration
 */
export class AdminApiService {

  // ============================================================================
  // DASHBOARD METRICS
  // ============================================================================

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(dateRange?: DateRange): Promise<AdminDashboardMetrics> {
    const params = new URLSearchParams();
    
    if (dateRange?.start) {
      params.append('startDate', dateRange.start.toISOString());
    }
    if (dateRange?.end) {
      params.append('endDate', dateRange.end.toISOString());
    }

    const response = await apiClient.get(`/admin/dashboard/metrics?${params.toString()}`);
    return response.data.data;
  }

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * Get users with filtering and pagination
   */
  async getUsers(request: GetUsersRequest): Promise<GetUsersResponse> {
    const params = new URLSearchParams();
    
    if (request.pagination) {
      params.append('page', request.pagination.page.toString());
      params.append('limit', request.pagination.limit.toString());
    }
    
    if (request.filters) {
      if (request.filters.role && request.filters.role.length > 0) {
        request.filters.role.forEach(role => params.append('role', role));
      }
      if (request.filters.isActive !== undefined) {
        params.append('isActive', request.filters.isActive.toString());
      }
      if (request.filters.search) {
        params.append('search', request.filters.search);
      }
      if (request.filters.dateRange) {
        if (request.filters.dateRange.start) {
          params.append('startDate', request.filters.dateRange.start.toISOString());
        }
        if (request.filters.dateRange.end) {
          params.append('endDate', request.filters.dateRange.end.toISOString());
        }
      }
    }

    const response = await apiClient.get(`/admin/users?${params.toString()}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  }

  /**
   * Update user details
   */
  async updateUser(request: UpdateUserRequest): Promise<UpdateUserResponse> {
    const response = await apiClient.put(`/admin/users/${request.userId}`, request.updates);
    return { user: response.data.data };
  }

  // ============================================================================
  // SYSTEM METRICS
  // ============================================================================

  /**
   * Get detailed system metrics
   */
  async getSystemMetrics(request: GetSystemMetricsRequest): Promise<GetSystemMetricsResponse> {
    const params = new URLSearchParams();
    
    if (request.dateRange) {
      if (request.dateRange.start) {
        params.append('dateRange.start', request.dateRange.start.toISOString());
      }
      if (request.dateRange.end) {
        params.append('dateRange.end', request.dateRange.end.toISOString());
      }
    }
    
    if (request.granularity) {
      params.append('granularity', request.granularity);
    }

    const response = await apiClient.get(`/admin/system/metrics?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<Record<string, any>> {
    const response = await apiClient.get('/admin/system/health');
    return response.data.data;
  }

  /**
   * Trigger system maintenance
   */
  async triggerMaintenance(): Promise<void> {
    await apiClient.post('/admin/system/maintenance');
  }

  // ============================================================================
  // PRICING CONFIGURATION
  // ============================================================================

  /**
   * Get current pricing configuration
   */
  async getPricingConfig(): Promise<PricingConfig> {
    const response = await apiClient.get('/admin/pricing/config');
    return response.data.data;
  }

  /**
   * Update pricing configuration
   */
  async updatePricingConfig(request: UpdatePricingConfigRequest): Promise<UpdatePricingConfigResponse> {
    const response = await apiClient.put('/admin/pricing/config', request.config);
    return { config: response.data.data };
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(request: GetAuditLogsRequest): Promise<GetAuditLogsResponse> {
    const params = new URLSearchParams();
    
    if (request.pagination) {
      params.append('page', request.pagination.page.toString());
      params.append('limit', request.pagination.limit.toString());
    }
    
    if (request.filters) {
      if (request.filters.userId) {
        params.append('userId', request.filters.userId);
      }
      if (request.filters.action) {
        params.append('action', request.filters.action);
      }
      if (request.filters.resource) {
        params.append('resource', request.filters.resource);
      }
      if (request.filters.dateRange) {
        if (request.filters.dateRange.start) {
          params.append('startDate', request.filters.dateRange.start.toISOString());
        }
        if (request.filters.dateRange.end) {
          params.append('endDate', request.filters.dateRange.end.toISOString());
        }
      }
    }

    const response = await apiClient.get(`/admin/audit/logs?${params.toString()}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination
    };
  }
}

export const adminApi = new AdminApiService();