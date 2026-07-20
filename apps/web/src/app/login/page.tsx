import { Suspense } from 'react';
import LoginPage from './page-client';
import { Spinner } from '@/components/ui/spinner';

export default function LoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
