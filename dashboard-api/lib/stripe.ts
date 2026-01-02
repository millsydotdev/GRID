import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing env.STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const PRICE_IDS: Record<'pro' | 'enterprise', string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_grid_pro_monthly',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_grid_enterprise_seat',
};

export const TIER_PRICES = {
  pro: {
    amount: 1200, // £12.00 in pence
    currency: 'gbp',
    interval: 'month' as const,
  },
  enterprise: {
    amount: 2500, // £25.00 per seat in pence
    currency: 'gbp',
    interval: 'month' as const,
  },
};
