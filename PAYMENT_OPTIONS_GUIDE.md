# Payment Options & Monetization Strategy

## Overview

Because traditional payment processors often have geographical restrictions (such as Stripe not operating natively in Belarus), this application uses a **dual-payment architecture**:

1. **Stripe**: The primary processor for global users interacting with the standalone Web App.
2. **Telegram Stars (XTR)**: The fallback/primary processor for users interacting via the Telegram Mini App (TWA). This completely bypasses traditional fiat banking restrictions, allowing users in Belarus/Russia to pay seamlessly.

---

## 1. Stripe (Global Web Users)

Stripe is fully implemented in the codebase but requires dashboard configuration to go live.

### Current State in Codebase

- **Checkout**: `src/app/api/subscription/checkout/route.ts` generates Stripe checkout sessions.
- **Customer Portal**: `src/app/api/subscription/portal/route.ts` handles subscription management/cancellation.
- **Webhooks**: `src/app/api/webhooks/stripe/route.ts` syncs Stripe renewals (`invoice.payment_succeeded`) and cancellations with the Supabase `user_subscriptions` table.

### How to Proceed (Next Steps)

1. **Create Products in Stripe**:
   - Go to your Stripe Dashboard -> Product Catalog.
   - Create 3 products matching your DB: `Starter`, `Pro`, and `Max`.
   - Set monthly recurring prices for each (e.g., $4.99, $12.99, $24.99).
2. **Get Price IDs**:
   - Copy the generated Price IDs (they start with `price_...`).
3. **Update Environment Variables** (`.env.local` or Vercel):
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_BASIC=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_MAX=price_...
   ```
4. **Local Testing**:
   - Install the Stripe CLI.
   - Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` to test webhooks locally.

---

## 2. Telegram Stars (Recommended for Belarus & CIS)

Telegram Stars (`XTR`) are native to the Telegram ecosystem and function as an internal digital currency. Users buy Stars via Apple/Google (or PremiumBot), and you (the developer) can withdraw Stars from Telegram directly to **TON (The Open Network)** crypto wallet, which you can then sell on a crypto exchange (like Bybit or OKX) for fiat currency in Belarus.

### Current State in Codebase

- **Invoice Generation**: We have created a placeholder at `src/app/api/telegram/invoice/route.ts`.

### How to Proceed (Next Steps)

1. **Frontend Integration (User Choice Flow)**:
   - Instead of strictly forcing a payment method based on the platform, you can update `src/components/common/plans-card.tsx` so that clicking "Upgrade" opens a **Payment Selection Modal** (e.g., "How would you like to pay?").
   - **Option A (Stripe)**: If they select "Credit Card", call `/api/subscription/checkout` and redirect them to the Stripe URL. _(Note: If they are inside the Telegram Mobile app, you should open this Stripe link in an external browser using `window.Telegram.WebApp.openLink(url)` to comply with Telegram's App Store policies)._
   - **Option B (Stars)**: If they select "Telegram Stars", make a POST request to `/api/telegram/invoice`. The API will return an `invoiceLink`.
   - Call `window.Telegram.WebApp.openInvoice(invoiceLink, (status) => { ... })` to trigger the native Telegram payment bottom-sheet.
2. **Backend Webhooks (Bot API)**:
   - Your Telegram Bot webhook endpoint needs to listen for two specific updates from Telegram:
     - `pre_checkout_query`: You must answer this with `ok: true` within 10 seconds.
     - `successful_payment`: Once received, update Supabase `user_subscriptions` using the `provider_payment_charge_id`.
3. **Withdrawal**:
   - Once your bot accumulates over 1,000 XTR, you can go to Fragment.com, connect your wallet, and convert XTR to TON.

---

## 3. Direct Crypto Gateways (Alternative Option)

If you want to accept crypto directly on the Web App (outside of Telegram), you can integrate a crypto payment gateway.

**Recommended Services:**

- **Cryptomus**: Very developer-friendly API, works natively in CIS regions, accepts straight USDT/TON/BTC, and provides easy webhooks.
- **TON Connect**: If you want to build a fully decentralized payment flow where users connect their Tonkeeper wallet and send TON directly to your wallet address.

### How to Implement Crypto:

1. Create `src/app/api/crypto/checkout/route.ts`.
2. Generate an invoice via the provider's API (e.g., Cryptomus `POST /v1/payment`).
3. Redirect the user to the generated crypto checkout URL.
4. Listen to the provider's webhook to update the Supabase subscription.

---

## Summary Action Plan

For the fastest route to monetization considering your location:

1. **Enable Stripe purely for international users** hitting the web app from outside regions.
2. **Focus heavily on completing the Telegram Stars pipeline**, as it completely bypasses regional App Store and Banking restrictions for your main target market inside the Mini App.
3. Once Stars are active, hook up your Fragment account to a local TON wallet (e.g., Tonkeeper) to secure your revenue withdrawals.
