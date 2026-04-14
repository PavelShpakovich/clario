'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TOAST_DURATION_MS } from '@/lib/constants';

interface RootProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string;
  now: Date;
  session: Session | null;
}

export function RootProviders({
  children,
  locale,
  messages,
  timeZone,
  now,
  session,
}: RootProvidersProps) {
  return (
    <SessionProvider session={session}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone} now={now}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex flex-col flex-1">
            {children}
            <Toaster position="bottom-right" duration={TOAST_DURATION_MS} />
          </div>
        </ThemeProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
