/**
 * Credit Purchase Modal Component
 * 
 * A premium modal for purchasing credits with animated pricing tiers,
 * popular badges, and smooth checkout flow.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Zap, Star, Check, CreditCard, Sparkles } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../ui/modal';
import { Button } from '../ui/button';
import { useCredits } from '../../hooks/useCredits';
import { cn } from '../../lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface CreditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

interface CreditTier {
  id: string;
  credits: number;
  price: number; // in dollars
  pricePerCredit: number;
  popular?: boolean;
  bonus?: number; // bonus credits
  savings?: number; // percentage savings
  features: string[];
}

const creditTiers: CreditTier[] = [
  {
    id: 'starter',
    credits: 100,
    price: 5,
    pricePerCredit: 0.05,
    features: ['Perfect for trying out', 'Basic video generation', 'Standard support'],
  },
  {
    id: 'popular',
    credits: 500,
    price: 20,
    pricePerCredit: 0.04,
    popular: true,
    bonus: 50,
    savings: 20,
    features: ['Most popular choice', 'Extended video creation', 'Priority support', '50 bonus credits'],
  },
  {
    id: 'pro',
    credits: 1000,
    price: 35,
    pricePerCredit: 0.035,
    bonus: 150,
    savings: 30,
    features: ['Best value for creators', 'Unlimited video length', 'Premium support', '150 bonus credits'],
  },
  {
    id: 'enterprise',
    credits: 2500,
    price: 75,
    pricePerCredit: 0.03,
    bonus: 500,
    savings: 40,
    features: ['For professional studios', 'All premium features', 'Dedicated support', '500 bonus credits'],
  },
];

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  open,
  onOpenChange,
  className,
}) => {
  const [selectedTier, setSelectedTier] = useState<CreditTier>(creditTiers[1]); // Default to popular
  const { purchaseCredits, isPurchasing, formatCredits, formatCreditValue } = useCredits();

  const handlePurchase = async () => {
    const successUrl = `${window.location.origin}/dashboard?purchase=success`;
    const cancelUrl = `${window.location.origin}/dashboard?purchase=cancelled`;

    await purchaseCredits({
      amount: selectedTier.credits + (selectedTier.bonus || 0),
      successUrl,
      cancelUrl,
    });
  };

  const totalCredits = selectedTier.credits + (selectedTier.bonus || 0);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Purchase Credits"
      description="Choose a credit package that fits your needs"
      size="xl"
      className={className}
    >
      <ModalBody className="space-y-6">
        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {creditTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              className={cn(
                'relative p-4 border rounded-xl cursor-pointer transition-all duration-200',
                'hover:shadow-lg hover:scale-105',
                selectedTier.id === tier.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card hover:border-primary/50',
                tier.popular && 'ring-2 ring-primary/20'
              )}
              onClick={() => setSelectedTier(tier)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <motion.div
                  className="absolute -top-3 left-1/2 transform -translate-x-1/2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>Most Popular</span>
                  </div>
                </motion.div>
              )}

              {/* Savings Badge */}
              {tier.savings && (
                <div className="absolute -top-2 -right-2">
                  <motion.div
                    className="bg-success text-success-foreground px-2 py-1 rounded-full text-xs font-bold"
                    initial={{ rotate: -12, scale: 0 }}
                    animate={{ rotate: -12, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    {tier.savings}% OFF
                  </motion.div>
                </div>
              )}

              <div className="text-center space-y-3">
                {/* Icon */}
                <div className="flex justify-center">
                  <motion.div
                    className={cn(
                      'p-3 rounded-full',
                      selectedTier.id === tier.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    {tier.popular ? (
                      <Zap className="h-6 w-6" />
                    ) : (
                      <Coins className="h-6 w-6" />
                    )}
                  </motion.div>
                </div>

                {/* Credits */}
                <div>
                  <div className="text-2xl font-bold">
                    {formatCredits(tier.credits)}
                  </div>
                  {tier.bonus && (
                    <motion.div
                      className="text-sm text-success font-semibold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      +{formatCredits(tier.bonus)} bonus
                    </motion.div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    ${tier.pricePerCredit.toFixed(3)} per credit
                  </div>
                </div>

                {/* Price */}
                <div className="text-3xl font-bold text-primary">
                  ${tier.price}
                </div>

                {/* Features */}
                <div className="space-y-1 text-xs text-left">
                  {tier.features.map((feature, featureIndex) => (
                    <motion.div
                      key={featureIndex}
                      className="flex items-center space-x-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + featureIndex * 0.1 }}
                    >
                      <Check className="h-3 w-3 text-success flex-shrink-0" />
                      <span>{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Selection Indicator */}
                <AnimatePresence>
                  {selectedTier.id === tier.id && (
                    <motion.div
                      className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Tier Summary */}
        <motion.div
          className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {formatCredits(totalCredits)} Credits
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedTier.bonus && (
                    <span className="text-success">
                      Includes {formatCredits(selectedTier.bonus)} bonus credits
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                ${selectedTier.price}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatCreditValue(totalCredits)} value
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payment Security */}
        <motion.div
          className="flex items-center justify-center space-x-4 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-center space-x-1">
            <CreditCard className="h-4 w-4" />
            <span>Secure Payment</span>
          </div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full" />
          <span>Instant Credit Delivery</span>
          <div className="w-1 h-1 bg-muted-foreground rounded-full" />
          <span>30-Day Refund Policy</span>
        </motion.div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isPurchasing}
        >
          Cancel
        </Button>
        <Button
          onClick={handlePurchase}
          disabled={isPurchasing}
          loading={isPurchasing}
          className="min-w-[120px]"
        >
          {isPurchasing ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Purchase ${selectedTier.price}</span>
            </div>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreditPurchaseModal;