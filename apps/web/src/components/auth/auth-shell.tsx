import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      {/* Cosmic glow background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.22 0.06 268 / 50%) 0%, transparent 70%)',
        }}
      />
      <Card className="relative z-10 w-full max-w-md border-border/60 shadow-xl shadow-black/20">
        <CardHeader className="flex flex-col gap-2 text-center pb-2">
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {children}
          {footer}
        </CardContent>
      </Card>
    </main>
  );
}
