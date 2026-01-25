import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useSubscription } from '../../hooks/useSubscription';
import type { SubscriptionPlan } from '@ai-video-studio/types';

interface PricingTableProps {
  onSelectPlan?: (planId: string) => void;
  showCurrentPlan?: boolean;
  className?: string;
}

const planIcons = {
  free: Sparkles,
  starter: Star,
  pro: Zap,
  ultra: Crown,
};

const planColors = {
  free: 'from-gray-500 to-gray-600',
  starter: 'from-blue-500 to-blue-600',
  pro: 'from-purple-500 to-purple-600',
  ultra: 'from-amber-500 to-amber-600',
};

const planBadges = {
  free: null,
  starter: 'Most Popular',
  pro: 'Best Value',
  ultra: 'Premium',
};

export const PricingTable: React.FC<PricingTableProps> = ({
  onSelectPlan,
  showCurrentPlan = true,
  className = '',
}) => {
  const {
    subscriptionPlans,
    subscription,
    isCreatingSubscription,
    createSubscription,
    updateSubscriptionPlan,
    isUpdatingSubscription,
  } = useSubscription();

  const handleSelectPlan = async (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
      return;
    }

    if (subscription && subscription.planId !== planId) {
      // Update existing subscription
      await updateSubscriptionPlan(planId);
    } else if (!subscription) {
      // Create new subscription
      await createSubscription(planId);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return subscription?.planId === planId;
  };

  const getButtonText = (planId: string) => {
    if (isCurrentPlan(planId)) {
      return 'Current Plan';
    }
    
    if (subscription) {
      const currentPlan = subscriptionPlans.find(p => p.id === subscription.planId);
      const targetPlan = subscriptionPlans.find(p => p.id === planId);
      
      if (currentPlan && targetPlan) {
        return targetPlan.price > currentPlan.price ? 'Upgrade' : 'Downgrade';
      }
    }
    
    return planId === 'free' ? 'Get Started' : 'Subscribe';
  };

  const isButtonDisabled = (planId: string) => {
    return isCurrentPlan(planId) || isCreatingSubscription || isUpdatingSubscription;
  };

  if (subscriptionPlans.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {subscriptionPlans.map((plan, index) => {
        const Icon = planIcons[plan.id as keyof typeof planIcons] || Star;
        const gradientColor = planColors[plan.id as keyof typeof planColors] || 'from-gray-500 to-gray-600';
        const badge = planBadges[plan.id as keyof typeof planBadges];
        const isCurrent = isCurrentPlan(plan.id);
        const isPopular = plan.id === 'starter';

        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`relative rounded-2xl border-2 p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${
              isCurrent
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : isPopular
                ? 'border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10'
                : 'border-border bg-card hover:border-primary/30'
            }`}
            whileHover={{ scale: 1.02 }}
          >
            {/* Badge */}
            {badge && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge
                  variant="default"
                  className={`bg-gradient-to-r ${gradientColor} text-white px-3 py-1 text-xs font-semibold`}
                >
                  {badge}
                </Badge>
              </div>
            )}

            {/* Current Plan Badge */}
            {isCurrent && showCurrentPlan && (
              <div className="absolute -top-3 right-4">
                <Badge variant="outline" className="bg-primary text-primary-foreground">
                  Current
                </Badge>
              </div>
            )}

            {/* Plan Header */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r ${gradientColor} text-white mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-xl font-bold capitalize mb-2">{plan.name}</h3>
              
              <div className="flex items-baseline justify-center mb-2">
                <span className="text-3xl font-bold">
                  ${(plan.price / 100).toFixed(0)}
                </span>
                <span className="text-muted-foreground ml-1">
                  /{plan.interval}
                </span>
              </div>
              
              {plan.creditsIncluded > 0 && (
                <p className="text-sm text-muted-foreground">
                  {plan.creditsIncluded} credits included
                </p>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              {plan.features && typeof plan.features === 'object' && (
                <>
                  {Object.entries(plan.features).map(([feature, included]) => (
                    <div key={feature} className="flex items-center">
                      <Check className={`w-4 h-4 mr-3 ${included ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm ${included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                        {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </div>
                  ))}
                </>
              )}
              
              {/* Default features based on plan */}
              {plan.id === 'free' && (
                <>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">15-60 second videos</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Standard resolution</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Basic AI tools</span>
                  </div>
                </>
              )}
              
              {plan.id === 'starter' && (
                <>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Up to 5 minute videos</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">HD resolution</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Advanced AI tools</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </>
              )}
              
              {plan.id === 'pro' && (
                <>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Up to 120 minute videos</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">4K resolution</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Premium AI models</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Custom branding</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">API access</span>
                  </div>
                </>
              )}
              
              {plan.id === 'ultra' && (
                <>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Unlimited video length</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">8K resolution + VR</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Exclusive AI models</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">White-label solution</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-3 text-green-500" />
                    <span className="text-sm">Dedicated support</span>
                  </div>
                </>
              )}
            </div>

            {/* Action Button */}
            <Button
              onClick={() => handleSelectPlan(plan.id)}
              disabled={isButtonDisabled(plan.id)}
              className={`w-full ${
                isCurrent
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : isPopular
                  ? `bg-gradient-to-r ${gradientColor} hover:opacity-90`
                  : ''
              }`}
              variant={isCurrent ? 'outline' : isPopular ? 'default' : 'outline'}
            >
              {isCreatingSubscription || isUpdatingSubscription ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Processing...
                </div>
              ) : (
                getButtonText(plan.id)
              )}
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
};