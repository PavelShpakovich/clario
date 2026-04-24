'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compatibilityApi } from '@/services/compatibility-api';

interface RetryCompatibilityButtonProps {
  reportId: string;
}

export function RetryCompatibilityButton({ reportId }: RetryCompatibilityButtonProps) {
  const router = useRouter();
  const t = useTranslations('compatibility');
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      try {
        await compatibilityApi.resetForRetry(reportId);
        router.refresh();
      } catch {
        // Leave the current error UI in place.
      }
    });
  };

  return (
    <Button variant="outline" onClick={handleRetry} disabled={isPending} className="gap-2">
      <RefreshCw className={isPending ? 'animate-spin size-4' : 'size-4'} />
      {isPending ? t('retrying') : t('generatingRetry')}
    </Button>
  );
}
