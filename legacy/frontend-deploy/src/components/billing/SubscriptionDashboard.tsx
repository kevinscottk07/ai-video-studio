import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  CreditCard,
  Download,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Clock,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useSubscription } from '../../hooks/useSubscription';
import { PricingTable } from './PricingTable';
import { formatDate, formatCurrency } from '../../lib/utils';

interface SubscriptionDashboardProps {
  className?: string;
}

export const SubscriptionDashboard: React.FC<SubscriptionDashboardProps> = ({
  className = '',
}) => {
  const {
    subscription,
    subscriptionPlans,
    usage,
    billingHistory,
    isLoading,
    isCancellingSubscription,
    cancelSubscription,
    reactivateSubscription,
    refreshSubscription,
    refreshUsage,
    refreshBillingHistory,
    isSubscribed,
    canUpgrade,
    canDowngrade,
    daysUntilRenewal,
    usagePercentage,
  } = useSubscription();

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentPlan = subscriptionPlans.find(plan => plan.id === subscription?.planId);

  const handleCancelSubscription = async (immediate: boolean = false) => {
    await cancelSubscription(!immediate);
    setShowCancelConfirm(false);
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    const statusConfig = {
      active: { color: 'bg-green-500', text: 'Active', icon: CheckCircle },
      canceled: { color: 'bg-red-500', text: 'Cancelled', icon: XCircle },
      past_due: { color: 'bg-yellow-500', text: 'Past Due', icon: AlertTriangle },
      unpaid: { color: 'bg-red-500', text: 'Unpaid', icon: XCircle },
    };

    const config = statusConfig[subscription.status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isSubscribed) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Active Subscription</h2>
          <p className="text-muted-foreground mb-6">
            Choose a plan to unlock premium features and start creating amazing videos.
          </p>
        </div>
        
        <PricingTable />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Subscription Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Current Plan
              {getStatusBadge()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold capitalize">{currentPlan?.name}</h3>
              <p className="text-muted-foreground">
                {formatCurrency(currentPlan?.price || 0)} per {currentPlan?.interval}
              </p>
              {subscription?.cancelAtPeriodEnd && (
                <div className="flex items-center text-yellow-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Cancels on {formatDate(subscription.currentPeriodEnd)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Usage This Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Credits Used</span>
                <span>{usage?.creditsUsed || 0} / {usage?.creditsIncluded || 0}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {usage?.creditsRemaining || 0} credits remaining
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Billing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Next Billing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-2xl font-bold">{daysUntilRenewal} days</p>
              <p className="text-muted-foreground text-sm">
                {formatDate(subscription?.currentPeriodEnd)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(currentPlan?.price || 0)} will be charged
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Subscription Details
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshSubscription}
                  className="flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Plan</label>
                  <p className="text-lg font-semibold capitalize">{currentPlan?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Started</label>
                  <p className="text-lg">{formatDate(subscription?.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Next Renewal</label>
                  <p className="text-lg">{formatDate(subscription?.currentPeriodEnd)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {subscription?.cancelAtPeriodEnd ? (
                  <Button
                    onClick={reactivateSubscription}
                    className="flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reactivate Subscription
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={isCancellingSubscription}
                    className="flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cancel Confirmation Modal */}
          {showCancelConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowCancelConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card p-6 rounded-lg max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">Cancel Subscription</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to cancel your subscription? You can choose to cancel
                  immediately or at the end of your current billing period.
                </p>
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleCancelSubscription(false)}
                    disabled={isCancellingSubscription}
                  >
                    Cancel at Period End
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelSubscription(true)}
                    disabled={isCancellingSubscription}
                  >
                    Cancel Immediately
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowCancelConfirm(false)}
                  >
                    Keep Subscription
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Usage Analytics
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshUsage}
                  className="flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                Track your credit usage for the current billing period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usage ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{usage.creditsIncluded}</p>
                      <p className="text-sm text-muted-foreground">Credits Included</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{usage.creditsUsed}</p>
                      <p className="text-sm text-muted-foreground">Credits Used</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{usage.creditsRemaining}</p>
                      <p className="text-sm text-muted-foreground">Credits Remaining</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Usage Progress</span>
                      <span>{usagePercentage}%</span>
                    </div>
                    <Progress value={usagePercentage} className="h-3" />
                  </div>

                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    {usage.daysRemaining} days remaining in current period
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No usage data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Billing History
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshBillingHistory}
                  className="flex items-center"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </CardTitle>
              <CardDescription>
                View your past invoices and payment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {billingHistory.length > 0 ? (
                <div className="space-y-4">
                  {billingHistory.map((invoice, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{formatDate(invoice.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.amount)}</p>
                        <Button variant="ghost" size="sm" className="mt-1">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No billing history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Plan</CardTitle>
              <CardDescription>
                Upgrade or downgrade your subscription plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingTable showCurrentPlan={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};