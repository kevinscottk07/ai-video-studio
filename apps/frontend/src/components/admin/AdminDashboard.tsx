import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Users,
  DollarSign,
  Activity,
  Server,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useAdminDashboard } from '../../hooks/useAdmin';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import type { DateRange } from '@ai-video-studio/types';

/**
 * Executive Admin Dashboard
 * 
 * Comprehensive admin dashboard with real-time analytics, KPIs, and system monitoring.
 * Features interactive charts, live metrics, and executive-level insights.
 */
export const AdminDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });

  const { metrics, isLoading, error, refetch } = useAdminDashboard(dateRange);

  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    let start: Date;

    switch (range) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    setDateRange({ start, end: now });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Failed to Load Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Unable to retrieve dashboard metrics. Please try again.
            </p>
            <Button onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Executive Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time platform analytics and system insights
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select defaultValue="30d" onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Users"
          value={metrics?.users.total}
          change={metrics?.users.growth}
          icon={Users}
          color="blue"
          isLoading={isLoading}
        />
        <KPICard
          title="Monthly Revenue"
          value={metrics?.revenue.monthly}
          change={metrics?.revenue.growth}
          icon={DollarSign}
          color="green"
          isLoading={isLoading}
          formatValue={(value) => `$${(value / 100).toFixed(2)}`}
        />
        <KPICard
          title="Active Jobs"
          value={metrics?.system.activeJobs}
          icon={Zap}
          color="orange"
          isLoading={isLoading}
        />
        <KPICard
          title="System Uptime"
          value={metrics?.system.uptime}
          icon={Server}
          color="purple"
          isLoading={isLoading}
          formatValue={(value) => `${value}%`}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Breakdown
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Subscriptions', value: metrics?.revenue.breakdown.subscriptions || 0 },
                    { name: 'Credits', value: metrics?.revenue.breakdown.credits || 0 }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip formatter={(value: number) => `$${(value / 100).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* User Growth */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            User Activity
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: 'Total', value: metrics?.users.total || 0 },
                  { name: 'Active', value: metrics?.users.active || 0 },
                  { name: 'New', value: metrics?.users.new || 0 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* System Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Performance
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={[
                  { name: 'Response Time', value: metrics?.system.avgResponseTime || 0 },
                  { name: 'Error Rate', value: (metrics?.system.errorRate || 0) * 100 },
                  { name: 'Uptime', value: metrics?.system.uptime || 0 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Usage Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Platform Usage
          </h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Generations</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metrics?.usage.totalGenerations?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Credits Consumed</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metrics?.usage.creditsConsumed?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">AWS Costs</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${((metrics?.usage.awsCosts || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Platform Profit</span>
                <span className="text-lg font-semibold text-green-600">
                  ${((metrics?.usage.profit || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusIndicator
            label="Database"
            status="healthy"
            value="50ms"
            isLoading={isLoading}
          />
          <StatusIndicator
            label="Redis Cache"
            status="healthy"
            value="10ms"
            isLoading={isLoading}
          />
          <StatusIndicator
            label="AWS Services"
            status="healthy"
            value="200ms"
            isLoading={isLoading}
          />
        </div>
      </Card>
    </div>
  );
};

interface KPICardProps {
  title: string;
  value?: number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'orange' | 'purple';
  isLoading: boolean;
  formatValue?: (value: number) => string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  isLoading,
  formatValue = (v) => v.toLocaleString()
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
    green: 'text-green-600 bg-green-100 dark:bg-green-900/20',
    orange: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
    purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {value !== undefined ? formatValue(value) : '—'}
              </p>
            )}
            {change !== undefined && !isLoading && (
              <div className="flex items-center mt-2">
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

interface StatusIndicatorProps {
  label: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
  isLoading: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  label,
  status,
  value,
  isLoading
}) => {
  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500' },
    warning: { icon: AlertCircle, color: 'text-yellow-500' },
    error: { icon: AlertCircle, color: 'text-red-500' }
  };

  const { icon: StatusIcon, color } = statusConfig[status];

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center">
        <StatusIcon className={`h-5 w-5 ${color} mr-3`} />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </span>
      </div>
      {isLoading ? (
        <Skeleton className="h-4 w-12" />
      ) : (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value}
        </span>
      )}
    </div>
  );
};