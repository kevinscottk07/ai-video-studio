import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Settings,
  Save,
  RotateCcw,
  TrendingUp,
  Calculator,
  Zap,
  Video,
  Music,
  FileText
} from 'lucide-react';
import { usePricingConfig } from '../../hooks/useAdmin';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import type { PricingConfig, OperationType } from '../../types';

/**
 * Pricing Configuration Component
 * 
 * Advanced pricing management interface for admins to configure credit costs,
 * operation pricing, and profit margins. Features real-time cost calculation
 * and subscription plan management.
 */
export const PricingConfiguration: React.FC = () => {
  const { config, isLoading, updateConfig, isUpdating } = usePricingConfig();
  const [localConfig, setLocalConfig] = useState<PricingConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local config when data loads
  React.useEffect(() => {
    if (config && !localConfig) {
      setLocalConfig(config);
    }
  }, [config, localConfig]);

  const handleConfigChange = (updates: Partial<PricingConfig>) => {
    if (!localConfig) return;
    
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    setHasChanges(true);
  };

  const handleOperationCostChange = (
    operation: OperationType,
    field: string,
    value: number
  ) => {
    if (!localConfig) return;

    const newOperationCosts = {
      ...localConfig.operationCosts,
      [operation]: {
        ...localConfig.operationCosts[operation],
        [field]: field === 'baseCredits' ? value : {
          ...localConfig.operationCosts[operation].multipliers,
          [field]: value
        }
      }
    };

    handleConfigChange({ operationCosts: newOperationCosts });
  };

  const handleSave = () => {
    if (!localConfig || !hasChanges) return;
    
    updateConfig(localConfig);
    setHasChanges(false);
  };

  const handleReset = () => {
    if (!config) return;
    
    setLocalConfig(config);
    setHasChanges(false);
  };

  const calculateEstimatedCost = (operation: OperationType, multiplier: number = 1) => {
    if (!localConfig) return 0;
    
    const operationConfig = localConfig.operationCosts[operation];
    if (!operationConfig) return 0;
    
    return operationConfig.baseCredits * multiplier;
  };

  const calculateRevenue = (credits: number) => {
    if (!localConfig) return 0;
    return (credits * localConfig.creditPrice) / 100; // Convert cents to dollars
  };

  if (isLoading || !localConfig) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
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
            Pricing Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure credit pricing, operation costs, and profit margins
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Badge variant="secondary">
              Unsaved Changes
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isUpdating}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isUpdating}
          >
            <Save className="h-4 w-4 mr-2" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="credits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credits">Credit Pricing</TabsTrigger>
          <TabsTrigger value="operations">Operation Costs</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscription Plans</TabsTrigger>
        </TabsList>

        {/* Credit Pricing Tab */}
        <TabsContent value="credits" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Credit Pricing
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="creditPrice">Price per Credit (cents)</Label>
                  <Input
                    id="creditPrice"
                    type="number"
                    min="1"
                    value={localConfig.creditPrice}
                    onChange={(e) => handleConfigChange({ 
                      creditPrice: parseInt(e.target.value) || 1 
                    })}
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Current: ${(localConfig.creditPrice / 100).toFixed(2)} per credit
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Revenue Calculator
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>100 Credits</Label>
                    <p className="text-2xl font-bold text-green-600">
                      ${calculateRevenue(100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label>1,000 Credits</Label>
                    <p className="text-2xl font-bold text-green-600">
                      ${calculateRevenue(1000).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label>Monthly Revenue (10,000 credits sold)</Label>
                  <p className="text-3xl font-bold text-green-600">
                    ${calculateRevenue(10000).toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Operation Costs Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {Object.entries(localConfig.operationCosts).map(([operation, config]) => (
              <OperationCostCard
                key={operation}
                operation={operation as OperationType}
                config={config}
                creditPrice={localConfig.creditPrice}
                onChange={(field, value) => 
                  handleOperationCostChange(operation as OperationType, field, value)
                }
              />
            ))}
          </div>
        </TabsContent>

        {/* Subscription Plans Tab */}
        <TabsContent value="subscriptions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {localConfig.subscriptionPlans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.id}
                plan={plan}
                creditPrice={localConfig.creditPrice}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface OperationCostCardProps {
  operation: OperationType;
  config: {
    baseCredits: number;
    multipliers: Record<string, number>;
  };
  creditPrice: number;
  onChange: (field: string, value: number) => void;
}

const OperationCostCard: React.FC<OperationCostCardProps> = ({
  operation,
  config,
  creditPrice,
  onChange
}) => {
  const operationConfig = {
    script_generation: {
      name: 'Script Generation',
      icon: FileText,
      color: 'text-blue-600',
      examples: [
        { name: 'Simple', multiplier: 1 },
        { name: 'Complex', multiplier: 2 }
      ]
    },
    video_generation: {
      name: 'Video Generation',
      icon: Video,
      color: 'text-purple-600',
      examples: [
        { name: '30s HD', multiplier: 1 },
        { name: '60s 4K', multiplier: 3 },
        { name: '120s 8K', multiplier: 8 }
      ]
    },
    music_generation: {
      name: 'Music Generation',
      icon: Music,
      color: 'text-green-600',
      examples: [
        { name: '30s Track', multiplier: 1 },
        { name: '2min Track', multiplier: 4 }
      ]
    }
  };

  const opConfig = operationConfig[operation];
  if (!opConfig) return null;

  const Icon = opConfig.icon;

  return (
    <Card className="p-6">
      <div className="flex items-center mb-4">
        <Icon className={`h-6 w-6 ${opConfig.color} mr-3`} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {opConfig.name}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor={`${operation}-base`}>Base Credits</Label>
            <Input
              id={`${operation}-base`}
              type="number"
              min="1"
              value={config.baseCredits}
              onChange={(e) => onChange('baseCredits', parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>

          {Object.entries(config.multipliers).map(([multiplier, value]) => (
            <div key={multiplier}>
              <Label htmlFor={`${operation}-${multiplier}`}>
                {multiplier.charAt(0).toUpperCase() + multiplier.slice(1)} Multiplier
              </Label>
              <Input
                id={`${operation}-${multiplier}`}
                type="number"
                min="0.1"
                step="0.1"
                value={value}
                onChange={(e) => onChange(multiplier, parseFloat(e.target.value) || 0.1)}
                className="mt-1"
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Cost Examples</h4>
          {opConfig.examples.map((example) => {
            const credits = config.baseCredits * example.multiplier;
            const revenue = (credits * creditPrice) / 100;
            
            return (
              <div key={example.name} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">{example.name}</span>
                <div className="text-right">
                  <div className="text-sm font-semibold">{credits} credits</div>
                  <div className="text-xs text-gray-500">${revenue.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

interface SubscriptionPlanCardProps {
  plan: {
    id: string;
    name: string;
    price: number;
    creditsIncluded: number;
    features: string[];
  };
  creditPrice: number;
}

const SubscriptionPlanCard: React.FC<SubscriptionPlanCardProps> = ({ plan, creditPrice }) => {
  const creditValue = (plan.creditsIncluded * creditPrice) / 100;
  const savings = creditValue - (plan.price / 100);
  const savingsPercentage = creditValue > 0 ? (savings / creditValue) * 100 : 0;

  return (
    <Card className="p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {plan.name}
        </h3>
        <div className="mt-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            ${(plan.price / 100).toFixed(2)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">/month</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Credits Included</span>
          <span className="text-sm font-medium">{plan.creditsIncluded.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Credit Value</span>
          <span className="text-sm font-medium">${creditValue.toFixed(2)}</span>
        </div>
        {savings > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Savings</span>
            <span className="text-sm font-medium text-green-600">
              ${savings.toFixed(2)} ({savingsPercentage.toFixed(0)}%)
            </span>
          </div>
        )}
      </div>

      <Separator className="my-4" />

      <div className="space-y-2">
        {plan.features.map((feature, index) => (
          <div key={index} className="flex items-center text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3" />
            {feature}
          </div>
        ))}
      </div>
    </Card>
  );
};