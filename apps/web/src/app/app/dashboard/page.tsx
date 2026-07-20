'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export default function DashboardPage() {
  const cachedPrincipal = useAuthStore((s) => s.principal);
  const cachedTenant = useAuthStore((s) => s.tenant);
  const setPrincipal = useAuthStore((s) => s.setPrincipal);
  const setTenant = useAuthStore((s) => s.setTenant);

  const query = useQuery({
    queryKey: ['dashboard', 'identity'],
    queryFn: async () => {
      const [me, tenant] = await Promise.all([api.getMe(), api.getCurrentTenant()]);
      setPrincipal(me.data);
      setTenant(tenant.data);
      return { me: me.data, tenant: tenant.data };
    },
  });

  const principal = query.data?.me ?? cachedPrincipal;
  const tenant = query.data?.tenant ?? cachedTenant;

  return (
    <PageContainer>
      <Breadcrumb items={[{ label: 'App', href: '/app/dashboard' }, { label: 'Dashboard' }]} />
      <PageHeader
        title="Dashboard"
        description="Authenticated workspace overview from OneCare identity APIs."
      />

      {query.isLoading && !principal ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          title="Unable to load dashboard"
          description="Check that the API is running and your session is valid."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {principal && tenant ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{principal.displayName}</CardTitle>
              <CardDescription>{principal.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {principal.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
              <dl className="space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="truncate font-mono text-xs">{principal.userId}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Organization</dt>
                  <dd className="font-mono text-xs">{principal.organizationId ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="font-mono text-xs">{principal.departmentId ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Session</dt>
                  <dd className="truncate font-mono text-xs">{principal.sessionId}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tenant.displayName}</CardTitle>
              <CardDescription>Tenant · {tenant.slug}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <Badge>{tenant.status}</Badge>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Domain</span>
                <span>{tenant.domain ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Default timezone</span>
                <span>{tenant.defaultTimezone}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Language</span>
                <span>{tenant.defaultLanguage}</span>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">
                Permissions loaded: {principal.permissions.length}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PageContainer>
  );
}
