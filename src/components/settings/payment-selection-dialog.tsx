'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { isTelegramWebApp } from '@/components/telegram-provider';

interface PaymentSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  onSelectStripe: (planId: string) => Promise<void>;
  onSelectTelegramStars: (planId: string) => Promise<void>;
  isProcessing: boolean;
}

export function PaymentSelectionDialog({
  open,
  onOpenChange,
  planId,
  planName,
  onSelectStripe,
  onSelectTelegramStars,
  isProcessing,
}: PaymentSelectionDialogProps) {
  const t = useTranslations('plans.paymentSelection');
  const isTwa = isTelegramWebApp();
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'stars' | null>(null);

  const handleStripe = async () => {
    setSelectedMethod('stripe');
    await onSelectStripe(planId);
    setSelectedMethod(null);
  };

  const handleStars = async () => {
    setSelectedMethod('stars');
    await onSelectTelegramStars(planId);
    setSelectedMethod(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description', { planName })}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Button
            variant="outline"
            className="flex items-center justify-start gap-4 p-6 h-auto"
            onClick={handleStripe}
            disabled={isProcessing}
          >
            {isProcessing && selectedMethod === 'stripe' ? (
              <Loader2 className="w-6 h-6 animate-spin shrink-0 text-muted-foreground" />
            ) : (
              <CreditCard className="w-6 h-6 shrink-0 text-muted-foreground" />
            )}
            <div className="flex flex-col items-start text-left">
              <span className="font-semibold">{t('creditCard')}</span>
              <span className="text-xs text-muted-foreground font-normal whitespace-normal mt-0.5">
                {isTwa ? t('creditCardDescTwa') : t('creditCardDescWeb')}
              </span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-4 p-6 h-auto"
            onClick={handleStars}
            disabled={isProcessing}
          >
            {isProcessing && selectedMethod === 'stars' ? (
              <Loader2 className="w-6 h-6 animate-spin shrink-0 text-[#24A1DE]" />
            ) : (
              <Send className="w-6 h-6 shrink-0 text-[#24A1DE]" />
            )}
            <div className="flex flex-col items-start text-left">
              <span className="font-semibold">{t('telegramStars')}</span>
              <span className="text-xs text-muted-foreground font-normal whitespace-normal mt-0.5">
                {isTwa ? t('telegramStarsDescTwa') : t('telegramStarsDescWeb')}
              </span>
            </div>
          </Button>

          <div className="flex justify-end w-full pt-2">
            <AlertDialogCancel disabled={isProcessing}>{t('cancel')}</AlertDialogCancel>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
