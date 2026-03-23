'use client';

import { useState } from 'react';

/** 4 discrete levels: 0 = small, 1 = default, 2 = large, 3 = extra-large */
export type CardFontSize = 0 | 1 | 2 | 3;

const MIN: CardFontSize = 0;
const MAX: CardFontSize = 3;
const DEFAULT: CardFontSize = 2;
const STORAGE_KEY = 'card-font-size';

export function useCardFontSize() {
  const [fontSize, setFontSizeState] = useState<CardFontSize>(() => {
    if (typeof window === 'undefined') return DEFAULT;
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = Number(saved);
    return !isNaN(parsed) && parsed >= MIN && parsed <= MAX ? (parsed as CardFontSize) : DEFAULT;
  });

  const setFontSize = (next: CardFontSize) => {
    localStorage.setItem(STORAGE_KEY, String(next));
    setFontSizeState(next);
  };

  const increase = () => {
    setFontSize(Math.min(fontSize + 1, MAX) as CardFontSize);
  };

  const decrease = () => {
    setFontSize(Math.max(fontSize - 1, MIN) as CardFontSize);
  };

  return {
    fontSize,
    increase,
    decrease,
    canIncrease: fontSize < MAX,
    canDecrease: fontSize > MIN,
  };
}
