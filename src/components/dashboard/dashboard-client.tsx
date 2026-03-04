'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Database } from '@/lib/supabase/types';
import { themeApi } from '@/services/theme-api';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isTelegramWebApp } from '@/components/telegram-provider';
import { TgSettingsBar } from './tg-settings-bar';
import { ThemeList } from './theme-list';

type Theme = Database['public']['Tables']['themes']['Row'];

interface DashboardClientProps {
  initialThemes: Theme[];
  publicThemes?: Theme[];
  cardCounts?: Record<string, number>;
}

export function DashboardClient({
  initialThemes,
  publicThemes = [],
  cardCounts = {},
}: DashboardClientProps) {
  const t = useTranslations();
  const [themes, setThemes] = useState(initialThemes);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  const [showDeleteAllThemes, setShowDeleteAllThemes] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const isTg = isTelegramWebApp();

  const handleDelete = async () => {
    if (!themeToDelete) return;
    try {
      await themeApi.deleteTheme(themeToDelete.id);

      setThemes((prev) => prev.filter((theme) => theme.id !== themeToDelete.id));
      toast.success(t('messages.themeDeleted'));
    } catch {
      toast.error(t('messages.failedDelete'));
    } finally {
      setThemeToDelete(null);
    }
  };

  const handleDeleteAllThemes = async () => {
    if (themes.length === 0) return;
    setIsDeletingAll(true);
    try {
      const deletePromises = themes.map((theme) => themeApi.deleteTheme(theme.id));
      await Promise.all(deletePromises);
      setThemes([]);
      toast.success(t('messages.allThemesDeleted'));
      setShowDeleteAllThemes(false);
    } catch {
      toast.error(t('messages.failedDeleteAll'));
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handlePrivacyToggle = async (themeId: string, currentIsPublic: boolean) => {
    setTogglingPrivacy(themeId);
    try {
      const updated = await themeApi.togglePrivacy(themeId, !currentIsPublic);
      setThemes((prev) =>
        prev.map((theme) =>
          theme.id === themeId ? { ...theme, is_public: updated.is_public } : theme,
        ),
      );
      const status = updated.is_public ? t('dashboard.public') : t('dashboard.private');
      toast.success(t('messages.privacyUpdated', { status }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('messages.failedUpdate'));
    } finally {
      setTogglingPrivacy(null);
    }
  };

  const renderThemeList = (currentThemes: Theme[], isOwner: boolean) => (
    <ThemeList
      themes={currentThemes}
      isOwner={isOwner}
      cardCounts={cardCounts}
      togglingPrivacy={togglingPrivacy}
      onPrivacyToggle={(id, current) => void handlePrivacyToggle(id, current)}
      onDelete={(theme) => setThemeToDelete(theme)}
    />
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 md:py-10">
      {isTg && <TgSettingsBar />}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t('dashboard.heading')}
          </h1>
          <p className="mt-1 text-sm md:text-base text-muted-foreground">
            {t('dashboard.description', { count: themes.length })}
          </p>
        </div>
        <Link href="/themes/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t('buttons.addTheme')}
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="my-themes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="my-themes">{t('dashboard.myThemesTab')}</TabsTrigger>
          <TabsTrigger value="community">{t('dashboard.communityTab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="my-themes">{renderThemeList(themes, true)}</TabsContent>
        <TabsContent value="community">{renderThemeList(publicThemes, false)}</TabsContent>
      </Tabs>

      {themes.length > 0 && (
        <div className="mt-10 pt-10 border-t border-border">
          <h3 className="text-lg font-semibold text-destructive mb-4">
            {t('dialog.deleteAllThemes')}
          </h3>
          <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-800 dark:text-red-100">
              {t('dialog.deleteAllThemesDescription')}
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAllThemes(true)}
              disabled={isDeletingAll}
              className="shrink-0"
            >
              {isDeletingAll ? t('buttons.deleting') : t('buttons.deleteAll')}
            </Button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={!!themeToDelete}
        onOpenChange={(open) => {
          if (!open) setThemeToDelete(null);
        }}
        onConfirm={() => void handleDelete()}
        title={t('dialog.deleteTheme')}
        description={t('dialog.deleteThemeDescription')}
        confirmLabel={t('dialog.delete')}
        cancelLabel={t('dialog.cancel')}
      />

      <ConfirmationDialog
        open={showDeleteAllThemes}
        onOpenChange={(open) => {
          if (!open) setShowDeleteAllThemes(false);
        }}
        onConfirm={() => void handleDeleteAllThemes()}
        title={t('dialog.deleteAllThemes')}
        description={t('dialog.deleteAllThemesDescription')}
        confirmLabel={t('dialog.delete')}
        cancelLabel={t('dialog.cancel')}
      />
    </main>
  );
}
