import Stripe from 'stripe';
import { env } from '@/lib/env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover',
  appInfo: {
    name: 'Clario',
    version: '0.1.0',
  },
});
