export interface PaymentConfig {
  provider: 'lemonsqueezy' | 'paddle' | 'stripe';
  lemonsqueezy?: {
    apiKey: string;
    storeId: string;
    webhookSecret: string;
    baseUrl: string;
  };
  paddle?: {
    vendorId: string;
    apiKey: string;
    publicKey: string;
    webhookSecret: string;
    environment: 'sandbox' | 'production';
  };
  stripe?: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    apiVersion: string;
  };
  creditPricing: {
    pricePerCredit: number; // in cents
    bulkDiscounts: {
      threshold: number;
      discount: number; // percentage
    }[];
  };
  subscriptionPlans: {
    [key: string]: {
      productId: string;
      priceId: string;
      credits: number;
      price: number; // in cents
    };
  };
}

export const getPaymentConfig = (): PaymentConfig => {
  const provider = (process.env.PAYMENT_PROVIDER as 'lemonsqueezy' | 'paddle' | 'stripe') || 'lemonsqueezy';
  
  return {
    provider,
    lemonsqueezy: provider === 'lemonsqueezy' ? {
      apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
      storeId: process.env.LEMONSQUEEZY_STORE_ID || '',
      webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
      baseUrl: process.env.LEMONSQUEEZY_BASE_URL || 'https://api.lemonsqueezy.com/v1',
    } : undefined,
    paddle: provider === 'paddle' ? {
      vendorId: process.env.PADDLE_VENDOR_ID || '',
      apiKey: process.env.PADDLE_API_KEY || '',
      publicKey: process.env.PADDLE_PUBLIC_KEY || '',
      webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
      environment: (process.env.PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    } : undefined,
    stripe: provider === 'stripe' ? {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      apiVersion: process.env.STRIPE_API_VERSION || '2023-10-16',
    } : undefined,
    creditPricing: {
      pricePerCredit: parseInt(process.env.CREDIT_PRICE || '5'), // 5 cents per credit
      bulkDiscounts: [
        { threshold: 1000, discount: 10 }, // 10% off for 1000+ credits
        { threshold: 5000, discount: 20 }, // 20% off for 5000+ credits
        { threshold: 10000, discount: 30 }, // 30% off for 10000+ credits
      ],
    },
    subscriptionPlans: {
      starter: {
        productId: process.env.STARTER_PRODUCT_ID || '',
        priceId: process.env.STARTER_PRICE_ID || '',
        credits: 100,
        price: 2900, // $29.00
      },
      pro: {
        productId: process.env.PRO_PRODUCT_ID || '',
        priceId: process.env.PRO_PRICE_ID || '',
        credits: 500,
        price: 9900, // $99.00
      },
      ultra: {
        productId: process.env.ULTRA_PRODUCT_ID || '',
        priceId: process.env.ULTRA_PRICE_ID || '',
        credits: 2000,
        price: 29900, // $299.00
      },
    },
  };
};