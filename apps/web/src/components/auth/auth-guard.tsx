'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/ui/spinner';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setPrincipal = useAuthStore((s) => s.setPrincipal);
  const setTenant = useAuthStore((s) => s.setTenant);
  const clear = useAuthStore((s) => s.clear);

  const sessionQuery = useQuery({
    queryKey: ['session', 'me'],
    enabled: hydrated && Boolean(accessToken),
    queryFn: async () => {
      const [me, tenant] = await Promise.all([api.getMe(), api.getCurrentTenant()]);
      setPrincipal(me.data);
      setTenant(tenant.data);
      return { me: me.data, tenant: tenant.data };
    },
    retry: false,
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!accessToken) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, accessToken, router, pathname]);

  useEffect(() => {
    if (sessionQuery.error instanceof ApiError) {
      if (sessionQuery.error.status === 401) {
        clear();
        router.replace('/unauthorized');
      }
      if (sessionQuery.error.status === 403) {
        router.replace('/forbidden');
      }
    }
  }, [sessionQuery.error, clear, router]);

  if (!hydrated || (accessToken && sessionQuery.isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status">
        <Spinner className="h-8 w-8" />
        <span className="sr-only">Restoring session</span>
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  if (sessionQuery.isError) {
    return null;
  }

  return <>{children}</>;
}
