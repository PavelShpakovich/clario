'use client';

import Link from 'next/link';
import { Loader2, RefreshCw, Plus, Infinity, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CARD_COUNT_OPTIONS } from '@/lib/constants';

interface StudyBottomBarProps {
  totalCards: number;
  currentCardIndex: number;
  isGenerating: boolean;
  isManualGenerating: boolean;
  infiniteMode: boolean;
  cardCount: number;
  onToggleInfiniteMode: () => void;
  onGenerateMore: (count: number) => void;
  onSetCardCount: (count: number) => void;
  canGenerate?: boolean;
}

export function StudyBottomBar({
  totalCards,
  currentCardIndex,
  isGenerating,
  isManualGenerating,
  infiniteMode,
  cardCount,
  onToggleInfiniteMode,
  onGenerateMore,
  onSetCardCount,
  canGenerate = true,
}: StudyBottomBarProps) {
  const t = useTranslations();
  const anyGenerating = isGenerating || isManualGenerating;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2 md:py-3 bg-background border border-border rounded-full shadow-lg max-w-[90vw] overflow-x-auto no-scrollbar">
      {/* Progress */}
      <span className="shrink-0 text-xs md:text-sm font-semibold text-foreground tabular-nums">
        {totalCards > 0 ? `${Math.min(currentCardIndex + 1, totalCards)}/${totalCards}` : '—'}
      </span>

      <div className="shrink-0 w-px h-3 md:h-4 bg-border" />

      {/* Generation status (shown in both modes while active) */}
      {anyGenerating && (
        <>
          <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">{t('study.generating')}</span>
          </div>
          <div className="shrink-0 w-px h-3 md:h-4 bg-border" />
        </>
      )}

      {/* Manual mode: generate popover — hidden while generating */}
      {canGenerate && !infiniteMode && !anyGenerating && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <button
                title={t('study.generateMore')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {t('study.generateCount', { count: cardCount })}
                </span>
                <span className="sm:hidden">{cardCount}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1.5" align="center" side="top">
              <div className="flex flex-col gap-0.5">
                {CARD_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      onSetCardCount(n);
                      onGenerateMore(n);
                    }}
                    className={`w-full px-3 py-1.5 rounded text-sm font-medium text-left transition-colors cursor-pointer ${
                      cardCount === n
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {n} {t('dashboard.cards').toLowerCase()}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="w-px h-4 bg-border" />
        </>
      )}

      {/* Auto / Manual toggle */}
      {canGenerate ? (
        <button
          onClick={onToggleInfiniteMode}
          title={infiniteMode ? t('study.disableAutoGenerate') : t('study.enableAutoGenerate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
            infiniteMode
              ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
              : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
          }`}
        >
          {infiniteMode ? <Infinity className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
          <span className="hidden sm:inline">
            {infiniteMode ? t('study.auto') : t('study.manual')}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
          <span className="hidden sm:inline">{t('study.readOnly')}</span>
          <span className="sm:hidden">RO</span>
        </div>
      )}

      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        title={t('study.exit')}
      >
        <LogOut className="w-3 h-3" />
        <span className="hidden sm:inline">{t('study.exit')}</span>
      </Link>
    </div>
  );
}
