import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api/adminApi';
import { useToast } from '../providers/ToastProvider';
import type {
  AdminDashboardMetrics,
  GetUsersRequest,
  GetUsersResponse,
  UpdateUserRequest,
  GetSystemMetricsRequest,
  GetSystemMetricsResponse,
  PricingConfig,
  UpdatePricingConfigRequest,
  GetAuditLogsRequest,
  GetAuditLogsResponse,
  DateRange,
  User
} from '../types';

/**
 * Admin Dashboard Hook
 * Provides dashboard metrics with real-time updates
 */
export const useAdminDashboard = (dateRange?: DateRange) => {
  const { error: showErrorToast } = useToast();

  const {
    data: metrics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin', 'dashboard', 'metrics', dateRange],
    queryFn: () => adminApi.getDashboardMetrics(dateRange),
    refetchInterval: 30000, // Refresh every 30 seconds
    onError: (error: any) => {
      showErrorToast('Failed to load dashboard metrics');
    }
  });

  return {
    metrics,
    isLoading,
    error,
    refetch
  };
};

/**
 * User Management Hook
 * Provides user listing, filtering, and management capabilities
 */
export const useUserManagement = () => {
  const queryClient = useQueryClient();
  const { success, error: showErrorToast } = useToast();
  const [filters, setFilters] = useState<GetUsersRequest>({
    pagination: { page: 1, limit: 20 }
  });

  const {
    data: usersResponse,
    isLoading,
    error
  } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: () => adminApi.getUsers(filters),
    keepPreviousData: true
  });

  const updateUserMutation = useMutation({
    mutationFn: (request: UpdateUserRequest) => adminApi.updateUser(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['admin', 'users']);
      queryClient.invalidateQueries(['admin', 'dashboard']);
      success('User updated successfully');
    },
    onError: (error: any) => {
      showErrorToast('Failed to update user');
    }
  });

  const updateFilters = useCallback((newFilters: Partial<GetUsersRequest>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      pagination: {
        ...prev.pagination,
        ...newFilters.pagination,
        page: newFilters.pagination?.page || 1 // Reset to page 1 when filters change
      }
    }));
  }, []);

  const updateUser = useCallback((userId: string, updates: UpdateUserRequest['updates']) => {
    updateUserMutation.mutate({ userId, updates });
  }, [updateUserMutation]);

  return {
    users: usersResponse?.data || [],
    pagination: usersResponse?.pagination,
    isLoading,
    error,
    filters,
    updateFilters,
    updateUser,
    isUpdating: updateUserMutation.isLoading
  };
};

/**
 * System Metrics Hook
 * Provides detailed system performance and health metrics
 */
export const useSystemMetrics = (request: GetSystemMetricsRequest) => {
  const { error: showErrorToast } = useToast();

  const {
    data: metrics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin', 'system', 'metrics', request],
    queryFn: () => adminApi.getSystemMetrics(request),
    refetchInterval: 60000, // Refresh every minute
    onError: (error: any) => {
      showErrorToast('Failed to load system metrics');
    }
  });

  const {
    data: health,
    isLoading: isHealthLoading,
    refetch: refetchHealth
  } = useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: () => adminApi.getSystemHealth(),
    refetchInterval: 30000, // Refresh every 30 seconds
    onError: (error: any) => {
      showErrorToast('Failed to load system health');
    }
  });

  return {
    metrics,
    health,
    isLoading: isLoading || isHealthLoading,
    error,
    refetch: () => {
      refetch();
      refetchHealth();
    }
  };
};

/**
 * Pricing Configuration Hook
 * Manages pricing and credit configuration
 */
export const usePricingConfig = () => {
  const queryClient = useQueryClient();
  const { success, error: showErrorToast } = useToast();

  const {
    data: config,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['admin', 'pricing', 'config'],
    queryFn: () => adminApi.getPricingConfig()
  });

  const updateConfigMutation = useMutation({
    mutationFn: (request: UpdatePricingConfigRequest) => adminApi.updatePricingConfig(request),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'pricing', 'config'], data.config);
      queryClient.invalidateQueries(['admin', 'dashboard']);
      success('Pricing configuration updated successfully');
    },
    onError: (error: any) => {
      showErrorToast('Failed to update pricing configuration');
    }
  });

  const updateConfig = useCallback((updates: UpdatePricingConfigRequest['config']) => {
    updateConfigMutation.mutate({ config: updates });
  }, [updateConfigMutation]);

  return {
    config,
    isLoading,
    error,
    refetch,
    updateConfig,
    isUpdating: updateConfigMutation.isLoading
  };
};

/**
 * Audit Logs Hook
 * Provides audit trail functionality with filtering
 */
export const useAuditLogs = () => {
  const { error: showErrorToast } = useToast();
  const [filters, setFilters] = useState<GetAuditLogsRequest>({
    pagination: { page: 1, limit: 20 }
  });

  const {
    data: logsResponse,
    isLoading,
    error
  } = useQuery({
    queryKey: ['admin', 'audit', 'logs', filters],
    queryFn: () => adminApi.getAuditLogs(filters),
    keepPreviousData: true,
    onError: (error: any) => {
      showErrorToast('Failed to load audit logs');
    }
  });

  const updateFilters = useCallback((newFilters: Partial<GetAuditLogsRequest>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      pagination: {
        ...prev.pagination,
        ...newFilters.pagination,
        page: newFilters.pagination?.page || 1
      }
    }));
  }, []);

  return {
    logs: logsResponse?.data || [],
    pagination: logsResponse?.pagination,
    isLoading,
    error,
    filters,
    updateFilters
  };
};

/**
 * System Actions Hook
 * Provides system maintenance and administrative actions
 */
export const useSystemActions = () => {
  const queryClient = useQueryClient();
  const { success, error: showErrorToast } = useToast();

  const maintenanceMutation = useMutation({
    mutationFn: () => adminApi.triggerMaintenance(),
    onSuccess: () => {
      success('System maintenance initiated');
      // Refresh system metrics after maintenance
      queryClient.invalidateQueries(['admin', 'system']);
    },
    onError: (error: any) => {
      showErrorToast('Failed to trigger maintenance');
    }
  });

  const triggerMaintenance = useCallback(() => {
    maintenanceMutation.mutate();
  }, [maintenanceMutation]);

  return {
    triggerMaintenance,
    isMaintenanceRunning: maintenanceMutation.isLoading
  };
};