'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const principal = useAuthStore((s) => s.principal);
  const tenant = useAuthStore((s) => s.tenant);

  return (
    <PageContainer>
      <Breadcrumb items={[{ label: 'App', href: '/app/dashboard' }, { label: 'Settings' }]} />
      <PageHeader title="Settings" description="Profile and workspace preferences." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>From authenticated session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {principal?.displayName}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {principal?.email}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {principal?.roles.map((role) => (
                <Badge key={role} variant="outline">
                  {role}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Current tenant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Tenant:</span> {tenant?.displayName}
            </p>
            <p>
              <span className="text-muted-foreground">Slug:</span> {tenant?.slug}
            </p>
            <p className="text-xs text-muted-foreground">
              Theme preference is stored locally (light / dark / system).
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
