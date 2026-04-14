'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface RecalculateButtonProps {
  chartId: string;
}

export function RecalculateButton({ chartId }: RecalculateButtonProps) {
  const t = useTranslations('chartDetail');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/charts/${chartId}/recalculate`, {
          method: 'POST',
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? tErrors('generic'));
        }

        const data = (await res.json()) as { warnings?: string[] };
        toast.success(t('recalculateSuccess'));

        if (data.warnings && data.warnings.length > 0) {
          toast.warning(t('recalculateWarnings'), {
            description: data.warnings.join('\n'),
            duration: 8000,
          });
        }

        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tErrors('generic'));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <RefreshCw className={`mr-1.5 size-3.5 ${isPending ? 'animate-spin' : ''}`} />
          {t('recalculate')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('recalculateConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('recalculateConfirmDesc')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('backToCharts')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>{t('recalculate')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
