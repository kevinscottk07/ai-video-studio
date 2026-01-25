/**
 * Credits Management Page
 * 
 * A comprehensive credit management page featuring animated balance displays,
 * purchase modal, usage history, and real-time updates.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, History, TrendingUp, Settings, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { 
  CreditBalanceDisplay, 
  CreditPurchaseModal, 
  CreditUsageHistory 
} from '../components/credits';
import { useCredits } from '../hooks/useCredits';

const CreditsPage: React.FC = () => {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');
  const { balance } = useCredits();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-ai to-video bg-clip-text text-transparent">
          Credit Management
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Manage your credits, track usage, and purchase additional credits for your AI video generation needs.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="flex justify-center space-x-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Button
          size="lg"
          onClick={() => setShowPurchaseModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Purchase Credits</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="flex items-center space-x-2"
        >
          <HelpCircle className="h-5 w-5" />
          <span>How Credits Work</span>
        </Button>
      </motion.div>

      {/* Credit Balance Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <CreditBalanceDisplay 
          size="lg" 
          variant="card"
          className="max-w-2xl mx-auto"
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                className="bg-card border border-border rounded-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    {balance ? Math.round((balance.current / balance.lifetime) * 100) : 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Credits Remaining</div>
                  <div className="text-xs text-muted-foreground">
                    of lifetime credits
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-card border border-border rounded-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-success">
                    ${balance ? (balance.lifetime * 0.05).toFixed(0) : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Invested</div>
                  <div className="text-xs text-muted-foreground">
                    in AI video creation
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-card border border-border rounded-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-info">
                    {balance ? Math.round(balance.lifetime / 50) : 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Videos Created</div>
                  <div className="text-xs text-muted-foreground">
                    estimated count
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Recent Activity Preview */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <CreditUsageHistory 
                maxTransactions={5} 
                showCharts={false}
              />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <CreditUsageHistory showCharts={true} />
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Credit Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Low Balance Alerts</div>
                    <div className="text-sm text-muted-foreground">
                      Get notified when credits are running low
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto-Purchase</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically purchase credits when balance is low
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Set Up
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Usage Reports</div>
                    <div className="text-sm text-muted-foreground">
                      Receive monthly usage and spending reports
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Payment Methods</div>
                    <div className="text-sm text-muted-foreground">
                      Manage your saved payment methods
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Billing History</div>
                    <div className="text-sm text-muted-foreground">
                      View and download invoices
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Purchase Modal */}
      <CreditPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
      />
    </div>
  );
};

export default CreditsPage;