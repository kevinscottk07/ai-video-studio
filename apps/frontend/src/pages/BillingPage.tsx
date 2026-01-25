import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Settings, TrendingUp } from 'lucide-react';
import { SubscriptionDashboard } from '../components/billing/SubscriptionDashboard';
import { CreditWidget } from '../components/credits/CreditWidget';
import { CreditUsageHistory } from '../components/credits/CreditUsageHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../hooks/useAuth';
import { useCredits } from '../hooks/useCredits';
import { useSubscription } from '../hooks/useSubscription';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const { creditBalance, totalCreditsEver } = useCredits();
  const { subscription, isSubscribed } = useSubscription();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Please log in to view billing</h1>
          <p className="text-muted-foreground">
            You need to be logged in to access your billing and subscription information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription, view usage, and track your billing history.
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Current Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{creditBalance}</p>
            <p className="text-sm text-muted-foreground">Available for use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{totalCreditsEver}</p>
            <p className="text-sm text-muted-foreground">Lifetime total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Plan Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold capitalize">
              {isSubscribed ? subscription?.planId : 'Free'}
            </p>
            <p className="text-sm text-muted-foreground">
              {isSubscribed ? 'Active subscription' : 'No subscription'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="history">Usage History</TabsTrigger>
          </TabsList>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            <SubscriptionDashboard />
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <CreditWidget />
              </div>
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Management</CardTitle>
                    <CardDescription>
                      Purchase additional credits or manage your credit usage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-2">Current Balance</h3>
                          <p className="text-2xl font-bold text-primary">{creditBalance}</p>
                          <p className="text-sm text-muted-foreground">Credits available</p>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h3 className="font-semibold mb-2">Lifetime Total</h3>
                          <p className="text-2xl font-bold text-green-600">{totalCreditsEver}</p>
                          <p className="text-sm text-muted-foreground">Credits purchased</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-4">
                          Credits are used for AI video generation, script creation, and other premium features.
                          {isSubscribed && ' Your subscription includes monthly credits that reset each billing period.'}
                        </p>
                        
                        {!isSubscribed && (
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                            <h4 className="font-semibold text-primary mb-2">💡 Pro Tip</h4>
                            <p className="text-sm">
                              Subscribe to a plan to get monthly credits included and save money on your video creation!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Usage History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage History</CardTitle>
                <CardDescription>
                  Track your credit usage and transaction history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreditUsageHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};