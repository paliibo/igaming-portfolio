import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@igaming/ui';
import { HarborMark } from '@/components/shell/logo';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-6 sm:py-12">
      <div className="flex items-center gap-3">
        <HarborMark className="h-10 w-10" />
        <div>
          <p className="text-lg font-semibold tracking-tight">
            Spin<span className="text-brand">Harbor</span>
          </p>
          <p className="text-xs text-muted-foreground">Demo online casino · virtual credits only</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
      <div className="text-center text-sm text-muted-foreground">{footer}</div>
    </div>
  );
}

export function DemoCredentials() {
  return (
    <div className="rounded-md border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
      <p className="mb-1 font-medium uppercase tracking-wide">Demo credentials</p>
      <p>
        Player: <code className="font-mono text-foreground">player@demo.local</code> /{' '}
        <code className="font-mono text-foreground">Player123!</code>
      </p>
      <p className="mt-1">
        Operator and admin accounts (for the catalogue page): operator@demo.local / Operator123! ·
        admin@demo.local / Admin123!
      </p>
    </div>
  );
}
