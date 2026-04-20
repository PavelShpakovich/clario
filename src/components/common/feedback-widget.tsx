'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, X, Send, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type State = 'closed' | 'open' | 'submitting' | 'success';

export function FeedbackWidget() {
  const [state, setState] = useState<State>('closed');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (state === 'open') {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [state]);

  // Auto-reset success state after 3 s
  useEffect(() => {
    if (state === 'success') {
      const t = setTimeout(() => {
        setState('closed');
        setMessage('');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [state]);

  async function handleSubmit() {
    const text = message.trim();
    if (text.length < 5) {
      setError('Минимум 5 символов');
      return;
    }
    setError(null);
    setState('submitting');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Ошибка');
      }
      setState('success');
    } catch (err) {
      setError((err as Error).message ?? 'Не удалось отправить');
      setState('open');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      {state !== 'closed' && (
        <div className="w-80 rounded-2xl border bg-card shadow-xl shadow-black/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {state === 'success' ? (
            <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                <Check className="size-6" />
              </span>
              <p className="text-sm font-semibold">Спасибо за отзыв!</p>
              <p className="text-xs text-muted-foreground">Мы обязательно прочитаем</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="text-sm font-semibold">Обратная связь</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setState('closed');
                    setError(null);
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col gap-3">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Расскажите, что думаете или что можно улучшить…"
                  rows={4}
                  maxLength={2000}
                  disabled={state === 'submitting'}
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                />
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    {message.length > 0 ? `${message.length}/2000` : '⌘↵ для отправки'}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => void handleSubmit()}
                    disabled={state === 'submitting' || message.trim().length < 5}
                    className="gap-1.5"
                  >
                    {state === 'submitting' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Отправить
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <Button
        size="icon"
        className="size-12 rounded-full shadow-lg shadow-black/15"
        onClick={() => {
          if (state === 'closed') setState('open');
          else if (state !== 'submitting' && state !== 'success') setState('closed');
        }}
        aria-label="Обратная связь"
      >
        {state === 'success' ? (
          <Check className="size-5" />
        ) : state !== 'closed' ? (
          <X className="size-5" />
        ) : (
          <MessageSquarePlus className="size-5" />
        )}
      </Button>
    </div>
  );
}
