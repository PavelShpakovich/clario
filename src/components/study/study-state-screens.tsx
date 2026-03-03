'use client';

import { Loader2, Zap, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function StudyInitialLoadingScreen() {
  const t = useTranslations();
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900 snap-start snap-always px-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('study.preparing')}</p>
      </div>
    </div>
  );
}

export function StudyGeneratingScreen() {
  const t = useTranslations();
  return (
    <div className="w-full h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 snap-start snap-always px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-6 md:p-10">
          <div className="flex justify-center mb-6">
            <Zap className="w-14 h-14 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('study.generatingCards')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{t('study.creatingFlashcards')}</p>
            <div className="flex items-center justify-center gap-2 pt-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <div
                className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
              {t('study.typicalTime')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudyLoadingMoreScreen() {
  const t = useTranslations();
  return (
    <div className="w-full h-screen flex items-center justify-center bg-white dark:bg-gray-900 snap-start snap-always px-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">{t('study.generatingMore')}</p>
      </div>
    </div>
  );
}

export function StudyDoneScreen() {
  const t = useTranslations();
  return (
    <div className="w-full h-screen flex items-center justify-center snap-start snap-always bg-slate-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm p-6 md:p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <Trophy className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-3">
            {t('study.finished')}
          </h2>
          <p className="text-slate-600 dark:text-gray-300 mb-8 text-lg">
            {t('study.completedSession')}
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {t('study.backToDashboard')}
          </a>
        </div>
      </div>
    </div>
  );
}
