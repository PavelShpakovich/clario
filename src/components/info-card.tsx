'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { CardRow } from '@/lib/supabase/types';
import 'highlight.js/styles/github-dark.css';

interface InfoCardProps {
  card: Pick<CardRow, 'id' | 'title' | 'body'>;
  themeId: string;
}

export function InfoCard({ card, themeId }: InfoCardProps) {
  return (
    <div
      className="w-full h-full flex flex-col bg-white dark:bg-gray-900 relative overflow-hidden"
      data-card-id={card.id}
    >
      {/* Scrollable body — title inline with content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 pt-8 md:px-10 md:py-8 md:pt-12 touch-pan-y">
        <div className="max-w-3xl mx-auto pb-20 md:pb-24">
          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 leading-snug">
            {card.title}
          </h1>

          {/* Markdown body */}
          <div
            className="prose dark:prose-invert max-w-none
            prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-base md:prose-p:text-lg
            prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
            prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-semibold
            prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
            prose-ul:text-gray-700 dark:prose-ul:text-gray-300
            prose-ol:text-gray-700 dark:prose-ol:text-gray-300
            prose-li:text-base md:prose-li:text-lg prose-li:leading-relaxed
            prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-800 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:not-italic
            prose-table:rounded-xl prose-table:overflow-hidden
            prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:font-semibold
            prose-td:border-gray-100 dark:prose-td:border-gray-800
          "
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                pre: ({ children }) => (
                  <div className="not-prose my-4 rounded-xl overflow-hidden shadow-md">
                    <pre className="text-sm leading-relaxed p-0">{children}</pre>
                  </div>
                ),
                code: ({ className, children, ...props }) => {
                  const isBlock = !!className?.includes('language-');
                  if (isBlock) {
                    return (
                      <code className={`${className} block p-5 text-sm leading-relaxed`} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code
                      className="bg-gray-100 dark:bg-gray-800 text-rose-600 dark:text-rose-400 rounded px-1.5 py-0.5 text-sm font-mono not-prose"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {card.body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
