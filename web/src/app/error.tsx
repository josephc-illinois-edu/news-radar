'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Something went wrong</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. We apologize for the inconvenience.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="rounded-lg bg-muted p-4 text-left font-mono text-xs overflow-auto max-h-40">
                <p className="text-destructive font-semibold">{error.name}</p>
                <p className="text-muted-foreground mt-1 break-words">{error.message}</p>
                {error.digest && (
                  <p className="text-muted-foreground mt-2 text-[10px]">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={reset} size="lg" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Try Again
              </Button>
              <Button variant="outline" size="lg" asChild className="w-full">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                  Go to Homepage
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support or{' '}
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
          </div>
        </div>
      </body>
    </html>
  );
}
