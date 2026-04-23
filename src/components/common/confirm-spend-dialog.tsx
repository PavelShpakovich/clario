'use client';

import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmSpendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: number;
  onConfirm: () => void;
}

export function ConfirmSpendDialog({
  open,
  onOpenChange,
  cost,
  onConfirm,
}: ConfirmSpendDialogProps) {
  const t = useTranslations('credits');
  const tc = useTranslations('common');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {t('confirmSpendTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('confirmSpendDescription', { cost })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t('confirm')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
