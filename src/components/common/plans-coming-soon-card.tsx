'use client';

import { Clock3, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PlansComingSoonCard() {
  const t = useTranslations();

  const items = [
    t('subscriptions.comingSoonFeature1'),
    t('subscriptions.comingSoonFeature2'),
    t('subscriptions.comingSoonFeature3'),
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          <span>{t('subscriptions.comingSoonBadge')}</span>
        </div>
        <CardTitle>{t('subscriptions.comingSoonTitle')}</CardTitle>
        <CardDescription>{t('subscriptions.comingSoonDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
