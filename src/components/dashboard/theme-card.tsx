'use client';

import Link from 'next/link';
import { Trash2, Globe, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Database } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

type Theme = Database['public']['Tables']['themes']['Row'];

interface ThemeCardProps {
  theme: Theme;
  cardCount: number;
  isOwner: boolean;
  togglingPrivacy: string | null;
  onPrivacyToggle: (themeId: string, currentIsPublic: boolean) => void;
  onDelete: (theme: Theme) => void;
  view?: 'grid' | 'list';
}

export function ThemeCard({
  theme,
  cardCount,
  isOwner,
  togglingPrivacy,
  onPrivacyToggle,
  onDelete,
  view = 'grid',
}: ThemeCardProps) {
  const t = useTranslations();

  if (view === 'list') {
    return (
      <Card className="flex flex-row items-center gap-3 px-4 py-3">
        {/* Left: title + description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-sm text-foreground">{theme.name}</span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {cardCount} {t('dashboard.cards')}
            </span>
          </div>
          {theme.description && (
            <p className="truncate text-xs text-muted-foreground mt-0.5">{theme.description}</p>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && (
            <div className="flex items-center gap-1">
              {theme.is_public ? (
                <Globe className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <Switch
                checked={theme.is_public ?? false}
                onCheckedChange={() => onPrivacyToggle(theme.id, theme.is_public ?? false)}
                disabled={togglingPrivacy === theme.id}
              />
            </div>
          )}
          <Link href={`/study/${theme.id}`}>
            <Button variant="default" size="sm">
              {t('buttons.study')}
            </Button>
          </Link>
          {isOwner && (
            <Link href={`/themes/${theme.id}/edit`}>
              <Button variant="outline" size="sm">
                {t('buttons.edit')}
              </Button>
            </Link>
          )}
          {isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive dark:text-destructive-foreground hover:text-destructive dark:hover:text-destructive-foreground"
              onClick={() => onDelete(theme)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2">{theme.name}</CardTitle>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {cardCount} {t('dashboard.cards')}
          </span>
        </div>
        {theme.description && (
          <CardDescription className="line-clamp-2">{theme.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <div className="flex gap-2">
          <Link href={`/study/${theme.id}`} className="flex-1">
            <Button className="w-full" variant="default" size="sm">
              {t('buttons.study')}
            </Button>
          </Link>
          {isOwner && (
            <Link href={`/themes/${theme.id}/edit`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                {t('buttons.edit')}
              </Button>
            </Link>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              {theme.is_public ? (
                <Globe className="h-4 w-4 text-primary" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">
                {theme.is_public ? t('dashboard.public') : t('dashboard.private')}
              </span>
            </div>
            <Switch
              checked={theme.is_public ?? false}
              onCheckedChange={() => onPrivacyToggle(theme.id, theme.is_public ?? false)}
              disabled={togglingPrivacy === theme.id}
            />
          </div>
        )}

        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-destructive dark:text-destructive-foreground hover:text-destructive dark:hover:text-destructive-foreground"
            onClick={() => onDelete(theme)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('buttons.delete')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
