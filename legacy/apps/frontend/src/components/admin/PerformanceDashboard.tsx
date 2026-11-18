import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  TrendingDown,
  Monitor,
  Zap
} from 'lucide-react';
import { performanceMonitoring, PerformanceMetric } from '../../services/performanceMonitoring';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PerformanceStats {
  totalMetrics: number;
  goodMetrics: number;
  needsImprovementMetrics: number;
  poorMetrics: number;
  averageLoadTime: number;
  errorRate: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [stats, setStats] = useState<PerformanceStats>({
    totalMetrics: 0,
    goodMetrics: 0,
    needsImprovementMetrics: 0,
    poorMetrics: 0,
    averageLoadTime: 0,
    errorRate: 0
  });
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    const { metrics: currentMetrics, summary } = performanceMonitoring.getPerformanceSummary();
    setMetrics(currentMetrics);
    
    // Calculate stats
    const totalMetrics = currentMetrics.length;
    const goodMetrics = currentMetrics.filter(m => m.rating === 'good').length;
    const needsImprovementMetrics = currentMetrics.filter(m => m.rating === 'needs-improvement').length;
    const poorMetrics = currentMetrics.filter(m => m.rating === 'poor').length;
    
    const loadTimeMetrics = currentMetrics.filter(m => 
      m.name.includes('LOAD') || m.name.includes('LCP') || m.name.includes('FCP')
    );
    const averageLoadTime = loadTimeMetrics.length > 0 
      ? loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length 
      : 0;
    
    const errorMetrics = currentMetrics.filter(m => 
      m.name.includes('ERROR') || m.rating === 'poor'
    );
    const errorRate = totalMetrics > 0 ? (errorMetrics.length / totalMetrics) * 100 : 0;

    setStats({
      totalMetrics,
      goodMetrics,
      needsImprovementMetrics,
      poorMetrics,
      averageLoadTime,
      errorRate
    });
  }, []);

  const getMetricsByTimeRange = () => {
    const now = Date.now();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - timeRanges[timeRange];
    return metrics.filter(m => m.timestamp >= cutoff);
  };

  const getChartData = () => {
    const filteredMetrics = getMetricsByTimeRange();
    const groupedByHour: Record<string, { good: number; poor: number; total: number }> = {};
    
    filteredMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp).toISOString().slice(0, 13);
      if (!groupedByHour[hour]) {
        groupedByHour[hour] = { good: 0, poor: 0, total: 0 };
      }
      
      groupedByHour[hour].total++;
      if (metric.rating === 'good') {
        groupedByHour[hour].good++;
      } else if (metric.rating === 'poor') {
        groupedByHour[hour].poor++;
      }
    });

    return Object.entries(groupedByHour).map(([hour, data]) => ({
      time: new Date(hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      good: data.good,
      poor: data.poor,
      total: data.total,
      successRate: data.total > 0 ? (data.good / data.total) * 100 : 0
    }));
  };

  const getWebVitalsData = () => {
    const vitalsMetrics = metrics.filter(m => 
      ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].includes(m.name)
    );
    
    const grouped = vitalsMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(grouped).map(([name, values]) => ({
      name,
      average: values.reduce((sum, val) => sum + val, 0) / values.length,
      count: values.length,
      p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || 0
    }));
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: 'up' | 'down';
    color?: 'blue' | 'green' | 'yellow' | 'red';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-4">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? 'Improving' : 'Declining'}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Performance Dashboard
        </h1>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '1h' | '24h' | '7d')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Metrics"
          value={stats.totalMetrics}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Good Performance"
          value={`${stats.goodMetrics} (${stats.totalMetrics > 0 ? Math.round((stats.goodMetrics / stats.totalMetrics) * 100) : 0}%)`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Avg Load Time"
          value={`${Math.round(stats.averageLoadTime)}ms`}
          icon={Clock}
          color={stats.averageLoadTime > 3000 ? 'red' : stats.averageLoadTime > 1000 ? 'yellow' : 'green'}
        />
        <StatCard
          title="Error Rate"
          value={`${stats.errorRate.toFixed(1)}%`}
          icon={AlertTriangle}
          color={stats.errorRate > 5 ? 'red' : stats.errorRate > 1 ? 'yellow' : 'green'}
        />
      </div>

      {/* Performance Trends Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Trends
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Success Rate (%)"
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Total Requests"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Web Vitals */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Core Web Vitals
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getWebVitalsData()}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average" fill="#3b82f6" name="Average (ms)" />
              <Bar dataKey="p95" fill="#ef4444" name="95th Percentile (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Issues */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Performance Issues
        </h2>
        <div className="space-y-3">
          {metrics
            .filter(m => m.rating === 'poor')
            .slice(0, 10)
            .map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {metric.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(metric.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600 dark:text-red-400">
                    {Math.round(metric.value)}ms
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {metric.url.split('/').pop() || 'Unknown'}
                  </p>
                </div>
              </div>
            ))}
          {metrics.filter(m => m.rating === 'poor').length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No performance issues detected
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => performanceMonitoring.clearMetrics()}
            className="flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Monitor className="h-4 w-4 mr-2" />
            Clear Metrics
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
          >
            <Zap className="h-4 w-4 mr-2" />
            Refresh Data
          </button>
          <button
            onClick={() => {
              const data = performanceMonitoring.getPerformanceSummary();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center justify-center px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}