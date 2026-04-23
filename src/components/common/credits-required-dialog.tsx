'use client';

import { useRouter } from 'next/navigation';
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

interface CreditsRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required: number;
  balance: number;
}

export function CreditsRequiredDialog({
  open,
  onOpenChange,
  required,
  balance,
}: CreditsRequiredDialogProps) {
  const t = useTranslations('credits');
  const tc = useTranslations('common');
  const router = useRouter();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {t('insufficientTitle')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('insufficientDescription', { required, balance })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => router.push('/store')}>
            {t('goToStore')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
