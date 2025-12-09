'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            An error occurred while loading this page. This could be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error details in dev mode */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-lg bg-muted p-3 font-mono text-xs overflow-auto max-h-32">
              <p className="text-destructive font-semibold">{error.name}</p>
              <p className="text-muted-foreground mt-1">{error.message}</p>
              {error.digest && (
                <p className="text-muted-foreground mt-1 text-[10px]">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Try Again
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            If this problem persists, please{' '}
            <a
              href="https://github.com/your-repo/news-radar/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              report an issue
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
