'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';

export interface ChatMessageItem {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface FollowUpChatProps {
  readingId: string;
  readingTitle: string;
  initialMessages: ChatMessageItem[];
  initialUsed: number;
  limit: number;
}

export function FollowUpChat({
  readingId,
  readingTitle,
  initialMessages,
  initialUsed,
  limit,
}: FollowUpChatProps) {
  const t = useTranslations('chat');
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages);
  const [used, setUsed] = useState(initialUsed);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const limitReached = used >= limit;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming || limitReached) return;

    setInput('');
    setError(null);

    const optimisticUser: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    const streamingId = `stream-${Date.now()}`;
    const streamingMsg: ChatMessageItem = {
      id: streamingId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUser, streamingMsg]);
    setUsed((prev) => prev + 1);
    setIsStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`/api/chat/${readingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Error');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === streamingId ? { ...m, content: accumulated } : m)),
        );
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      // Finalize — give stable id
      setMessages((prev) =>
        prev.map((m) => (m.id === streamingId ? { ...m, id: `final-${Date.now()}` } : m)),
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(t('errorSending'));
      // Rollback
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id && m.id !== streamingId));
      setUsed((prev) => Math.max(0, prev - 1));
      setInput(text);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href={`/readings/${readingId}`}>
              <ArrowLeft />
              {t('backToReading')}
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{readingTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('pageTitle')}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          {t('limitHint', { used, max: limit })}
        </span>
      </div>

      {/* Messages */}
      <div className="flex min-h-[300px] flex-col gap-4 pb-4">
        {messages.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">{t('emptyState')}</p>
        ) : null}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isStreamingMsg = isStreaming && msg.id.startsWith('stream-');
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm border bg-card text-card-foreground'
                }`}
              >
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  {isUser ? t('you') : t('assistant')}
                </p>
                {isUser ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    {msg.content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    ) : isStreamingMsg ? (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span className="text-xs">{t('assistant')}…</span>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error ? (
        <p className="mb-3 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Input */}
      {limitReached ? (
        <div className="rounded-2xl border bg-muted/40 px-4 py-4 text-center text-sm text-muted-foreground">
          {t('limitReached')}
        </div>
      ) : (
        <div className="flex items-end gap-2 rounded-2xl border bg-card p-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('askPlaceholder')}
            aria-label={t('askPlaceholder')}
            rows={2}
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={() => void handleSend()}
            disabled={!input.trim() || isStreaming}
            className="shrink-0"
          >
            {isStreaming ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      )}
    </div>
  );
}
