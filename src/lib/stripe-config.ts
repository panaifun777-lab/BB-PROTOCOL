import Stripe from 'stripe';

// Initialize Stripe with secret key
// In production, use environment variable STRIPE_SECRET_KEY
// For development/demo, use a test key placeholder
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-12-18.acacia' as any,
  typescript: true,
});

// Stripe publishable key for frontend
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder';

// Payment tiers for BB Protocol
export const PAYMENT_TIERS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_placeholder',
    amount: 999, // $9.99 in cents
    currency: 'usd',
    features: ['5 Avatar calls/day', 'Basic skill pack', 'Email support'],
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    amount: 2999, // $29.99
    currency: 'usd',
    features: ['Unlimited Avatar calls', 'Advanced skill pack', 'Priority support', 'Revenue analytics'],
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_placeholder',
    amount: 9999, // $99.99
    currency: 'usd',
    features: ['Unlimited everything', 'Custom skill packs', 'Dedicated support', 'On-chain revenue split', 'SLA guarantee'],
  },
} as const;

export type TierName = keyof typeof PAYMENT_TIERS;

// One-time service prices
export const SERVICE_PRICES = {
  'skill_call': 200, // $2.00
  'rental': 100, // $1.00
  'collaboration': 500, // $5.00
  'rag_query': 50, // $0.50
  'multimodal': 300, // $3.00
} as const;

export type ServiceType = keyof typeof SERVICE_PRICES;

// Revenue split configuration (must match on-chain DynamicSplitter)
export const FIAT_SPLIT_CONFIG = {
  humanBps: 7000,    // 70%
  avatarBps: 2000,   // 20%
  protocolBps: 1000, // 10%
};

// Supported currencies for multi-currency
export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', default: true },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'Korean Won' },
] as const;

// Fallback exchange rates (against USD)
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CNY: 7.24,
  KRW: 1320,
};

// Invoice line item template
export const INVOICE_LINE_ITEMS = {
  subscription: (tier: string, amount: number) => ({
    description: `BB Protocol ${tier.charAt(0).toUpperCase() + tier.slice(1)} Subscription`,
    quantity: 1,
    unitPrice: amount,
    amount,
  }),
  usage: (serviceType: string, quantity: number, unitPrice: number) => ({
    description: `API Usage: ${serviceType}`,
    quantity,
    unitPrice,
    amount: quantity * unitPrice,
  }),
  oneTime: (serviceName: string, amount: number) => ({
    description: serviceName,
    quantity: 1,
    unitPrice: amount,
    amount,
  }),
};
