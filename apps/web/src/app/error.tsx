'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">500 · Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">{error.message || 'Unexpected application error.'}</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
