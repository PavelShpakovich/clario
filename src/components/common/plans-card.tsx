'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { profileApi } from '@/services/profile-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentSelectionDialog } from '@/components/settings/payment-selection-dialog';
import { isTelegramWebApp, getTelegramWebApp } from '@/components/telegram-provider';

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------

const PLANS = [
  { id: 'free', name: 'Free', cards: 50, priceMonthly: 0 },
  { id: 'basic', name: 'Starter', cards: 300, priceMonthly: 4.99 },
  { id: 'pro', name: 'Pro', cards: 2000, priceMonthly: 12.99 },
  { id: 'max', name: 'Max', cards: 5000, priceMonthly: 24.99 },
] as const;

type Plan = (typeof PLANS)[number];

// ---------------------------------------------------------------------------
// PlanTile atom
// ---------------------------------------------------------------------------

interface PlanTileProps {
  plan: Plan;
  features: string[];
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isRequesting: boolean;
  onUpgrade: (planId: string) => void;
  onDowngrade: (planId: string) => void;
}

function PlanTile({
  plan,
  features,
  isCurrent,
  isUpgrade,
  isDowngrade,
  isRequesting,
  onUpgrade,
  onDowngrade,
}: PlanTileProps) {
  const t = useTranslations();

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        isCurrent ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{plan.name}</p>
          <p className="text-xs text-muted-foreground">
            {t('plans.cardsPerMonth', { count: plan.cards.toLocaleString() })}
          </p>
        </div>
        <p className="text-sm font-semibold shrink-0">
          {plan.priceMonthly === 0 ? t('plans.free') : `$${plan.priceMonthly.toFixed(2)}/mo`}
        </p>
      </div>

      <ul className="space-y-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="w-3 h-3 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <Check className="w-3.5 h-3.5" />
          {t('plans.currentPlan')}
        </div>
      ) : isUpgrade ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpgrade(plan.id)}
          disabled={isRequesting}
          className="w-full text-xs"
        >
          {isRequesting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <ArrowUpRight className="w-3 h-3 mr-1" />
              {t('plans.upgrade')}
            </>
          )}
        </Button>
      ) : isDowngrade ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDowngrade(plan.id)}
          disabled={isRequesting}
          className="w-full text-xs"
        >
          {isRequesting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <ArrowDownLeft className="w-3 h-3 mr-1" />
              {t('plans.downgrade')}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlansCard
// ---------------------------------------------------------------------------

/** Plan comparison card for Settings page — shows all tiers and upgrade CTA. */
export function PlansCard() {
  const t = useTranslations();
  const tl = useTranslations('landing');
  const { status, isLoading } = useSubscription();

  // Dialog State
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<Plan | null>(null);
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  const currentPlanId = status?.plan.planId ?? 'free';
  const currentPlanIndex = PLANS.findIndex((p) => p.id === currentPlanId);

  const planFeatures: Record<string, string[]> = {
    free: [tl('plan1Feature1'), tl('plan1Feature2')],
    basic: [tl('plan2Feature1'), tl('plan2Feature2'), tl('plan2Feature3')],
    pro: [tl('plan3Feature1'), tl('plan3Feature2'), tl('plan3Feature3')],
    max: [tl('plan4Feature1'), tl('plan4Feature2'), tl('plan4Feature3')],
  };

  const openUpgradeDialog = (planId: string) => {
    const plan = PLANS.find((p) => p.id === planId) || null;
    setSelectedPlanForUpgrade(plan);
  };

  const handleStripe = async (planId: string) => {
    setIsProcessingUpgrade(true);
    try {
      const data = await profileApi.requestUpgrade(planId);

      // If we are in the Telegram Mini App, we must open Stripe in an external browser
      // to avoid violating Apple/Google in-app purchase store guidelines.
      if (isTelegramWebApp()) {
        const twa = getTelegramWebApp();
        twa?.openLink(data.url);
      } else {
        // Standard web app redirect
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsProcessingUpgrade(false);
      setSelectedPlanForUpgrade(null);
    }
  };

  const handleTelegramStars = async (planId: string) => {
    setIsProcessingUpgrade(true);
    try {
      if (!isTelegramWebApp()) {
        toast.error('Telegram Stars are only available inside the Telegram App.');
        return;
      }

      const data = await profileApi.requestTelegramStarsUpgrade(planId);
      const twa = getTelegramWebApp();

      if (twa) {
        twa.openInvoice(data.invoiceLink, (paymentStatus) => {
          if (paymentStatus === 'paid') {
            toast.success('Payment successful! Your account will be upgraded shortly.');
          } else if (paymentStatus === 'cancelled') {
            toast.info('Payment was cancelled.');
          } else {
            toast.error('Payment failed. Please try again.');
          }
        });
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('errors.generic'));
    } finally {
      setIsProcessingUpgrade(false);
      setSelectedPlanForUpgrade(null);
    }
  };

  const handleDowngrade = async (planId: string) => {
    setRequesting(planId);
    try {
      // Create a customer portal session for downgrading via stripe
      const response = await fetch('/api/subscription/portal', { method: 'POST' });
      if (!response.ok) throw new Error();
      const { url } = await response.json();

      if (isTelegramWebApp()) {
        getTelegramWebApp()?.openLink(url);
      } else {
        window.location.href = url;
      }
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setRequesting(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('plans.title')}</CardTitle>
          <CardDescription>{t('plans.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLANS.map((plan, idx) => (
                <PlanTile
                  key={plan.id}
                  plan={plan}
                  features={planFeatures[plan.id] ?? []}
                  isCurrent={plan.id === currentPlanId}
                  isUpgrade={idx > currentPlanIndex}
                  isDowngrade={idx < currentPlanIndex}
                  isRequesting={requesting === plan.id}
                  onUpgrade={(id) => openUpgradeDialog(id)}
                  onDowngrade={(id) => void handleDowngrade(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPlanForUpgrade && (
        <PaymentSelectionDialog
          open={!!selectedPlanForUpgrade}
          onOpenChange={(open) => !open && setSelectedPlanForUpgrade(null)}
          planId={selectedPlanForUpgrade.id}
          planName={selectedPlanForUpgrade.name}
          onSelectStripe={handleStripe}
          onSelectTelegramStars={handleTelegramStars}
          isProcessing={isProcessingUpgrade}
        />
      )}
    </>
  );
}
