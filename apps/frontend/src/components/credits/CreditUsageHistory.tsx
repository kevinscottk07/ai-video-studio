/**
 * Credit Usage History Component
 * 
 * Interactive credit usage history with charts, filters, and transaction details.
 * Shows spending patterns, transaction timeline, and usage analytics.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Plus,
  Minus,
  Circle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useCredits } from '../../hooks/useCredits';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { cn } from '../../lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { TransactionType, CreditTransaction } from '@ai-video-studio/types';

export interface CreditUsageHistoryProps {
  className?: string;
  showCharts?: boolean;
  maxTransactions?: number;
}

interface ChartData {
  date: string;
  credits: number;
  transactions: number;
  type: 'spent' | 'earned';
}

const CreditUsageHistory: React.FC<CreditUsageHistoryProps> = ({
  className,
  showCharts = true,
  maxTransactions = 50,
}) => {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');

  const { 
    useCreditHistory, 
    formatCredits, 
    formatCreditValue, 
    getTransactionTypeColor,
    getTransactionTypeIcon 
  } = useCredits();

  // Build query based on filters
  const historyQuery = useMemo(() => {
    const query: any = {
      pagination: { limit: maxTransactions, page: 1 },
      filters: {},
    };

    // Date range filter
    if (dateRange !== 'all') {
      const days = parseInt(dateRange.replace('d', ''));
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(endDate, days));
      query.filters.dateRange = { start: startDate, end: endDate };
    }

    // Type filter
    if (typeFilter !== 'all') {
      query.filters.type = typeFilter;
    }

    return query;
  }, [dateRange, typeFilter, maxTransactions]);

  const { data: historyData, isLoading, error } = useCreditHistory(historyQuery);

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    if (!historyData?.data) return [];
    
    let transactions = historyData.data;
    
    if (searchQuery) {
      transactions = transactions.filter(transaction =>
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.operationId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return transactions;
  }, [historyData?.data, searchQuery]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (!filteredTransactions.length) return [];

    const dataMap = new Map<string, ChartData>();
    
    filteredTransactions.forEach(transaction => {
      const date = format(new Date(transaction.createdAt), 'MMM dd');
      const existing = dataMap.get(date) || {
        date,
        credits: 0,
        transactions: 0,
        type: transaction.amount > 0 ? 'earned' : 'spent',
      };

      existing.credits += Math.abs(transaction.amount);
      existing.transactions += 1;
      
      dataMap.set(date, existing);
    });

    return Array.from(dataMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredTransactions]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalSpent = filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const totalEarned = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const avgTransaction = filteredTransactions.length > 0 
      ? filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / filteredTransactions.length
      : 0;

    return { totalSpent, totalEarned, avgTransaction };
  }, [filteredTransactions]);

  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'purchase':
      case 'subscription_grant':
        return Plus;
      case 'deduction':
        return Minus;
      case 'refund':
        return RotateCcw;
      default:
        return Circle;
    }
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        Failed to load transaction history
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Credit Usage History</h3>
          <p className="text-sm text-muted-foreground">
            Track your credit spending and earning patterns
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          {showCharts && (
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Chart
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={dateRange}
            onValueChange={(value: any) => setDateRange(value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={typeFilter}
            onValueChange={(value: any) => setTypeFilter(value)}
          >
            <option value="all">All types</option>
            <option value="purchase">Purchases</option>
            <option value="deduction">Usage</option>
            <option value="refund">Refunds</option>
            <option value="subscription_grant">Subscription</option>
          </Select>
        </div>

        <div className="flex items-center space-x-2 flex-1 max-w-xs">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          className="bg-card border border-border rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Credits Spent</div>
              <div className="text-xl font-bold text-destructive">
                {formatCredits(summaryStats.totalSpent)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCreditValue(summaryStats.totalSpent)}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Credits Earned</div>
              <div className="text-xl font-bold text-success">
                {formatCredits(summaryStats.totalEarned)}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCreditValue(summaryStats.totalEarned)}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Transaction</div>
              <div className="text-xl font-bold">
                {formatCredits(Math.round(summaryStats.avgTransaction))}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCreditValue(summaryStats.avgTransaction)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'chart' && showCharts ? (
          <motion.div
            key="chart"
            className="bg-card border border-border rounded-lg p-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Simple Bar Chart */}
            <div className="space-y-4">
              <h4 className="font-semibold">Daily Credit Activity</h4>
              <div className="h-64 flex items-end justify-between space-x-2">
                {chartData.map((data, index) => {
                  const maxCredits = Math.max(...chartData.map(d => d.credits));
                  const height = (data.credits / maxCredits) * 100;
                  
                  return (
                    <motion.div
                      key={data.date}
                      className="flex-1 flex flex-col items-center space-y-2"
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <motion.div
                        className={cn(
                          'w-full rounded-t-md',
                          data.type === 'earned' ? 'bg-success' : 'bg-primary'
                        )}
                        style={{ height: `${height}%` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                      />
                      <div className="text-xs text-center">
                        <div className="font-medium">{formatCredits(data.credits)}</div>
                        <div className="text-muted-foreground">{data.date}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Transaction List */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for the selected filters
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredTransactions.map((transaction, index) => {
                    const Icon = getTransactionIcon(transaction.type);
                    const isPositive = transaction.amount > 0;
                    
                    return (
                      <motion.div
                        key={transaction.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={cn(
                              'p-2 rounded-lg',
                              isPositive ? 'bg-success/10' : 'bg-muted'
                            )}>
                              <Icon className={cn(
                                'h-4 w-4',
                                getTransactionTypeColor(transaction.type)
                              )} />
                            </div>
                            
                            <div>
                              <div className="font-medium">
                                {transaction.description}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(transaction.createdAt), 'MMM dd, yyyy • HH:mm')}
                              </div>
                              {transaction.operationId && (
                                <div className="text-xs text-muted-foreground">
                                  Operation: {transaction.operationId}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={cn(
                              'text-lg font-semibold flex items-center',
                              isPositive ? 'text-success' : 'text-foreground'
                            )}>
                              {isPositive ? (
                                <ArrowUpRight className="h-4 w-4 mr-1" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 mr-1" />
                              )}
                              {isPositive ? '+' : ''}{formatCredits(transaction.amount)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatCreditValue(Math.abs(transaction.amount))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Load More */}
            {historyData?.pagination.hasNext && (
              <div className="text-center">
                <Button variant="outline">
                  Load More Transactions
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreditUsageHistory;