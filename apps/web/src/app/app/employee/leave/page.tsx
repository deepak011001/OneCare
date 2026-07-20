'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeaveHistoryPage() {
  const query = useQuery({
    queryKey: ['leave', 'history'],
    queryFn: async () => {
      const res = await api.getLeaveHistory();
      return res.data as { items?: Array<Record<string, unknown>> };
    },
  });

  const items = query.data?.items ?? [];

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Employee', href: '/app/employee' },
          { label: 'Leave' },
        ]}
      />
      <PageHeader
        title="Leave history"
        description="Your leave requests loaded through the MCP leave tools."
        actions={
          <Button asChild size="sm">
            <Link href="/app/ai?prompt=Apply%20leave">Apply leave</Link>
          </Button>
        }
      />

      {query.isLoading ? <Skeleton className="h-48" /> : null}
      {query.isError ? (
        <ErrorState
          title="Unable to load leave history"
          description="Ensure leave.read is granted and the API is running."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {!query.isLoading && !query.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {items.length === 0 ? (
              <p className="text-muted-foreground">No leave requests yet.</p>
            ) : null}
            {items.map((item) => (
              <Link
                key={String(item.requestId)}
                href={`/app/employee/leave/${String(item.requestId)}`}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0 hover:underline"
              >
                <div>
                  <p className="font-medium">
                    {String(item.leaveType)} · {String(item.startDate)} → {String(item.endDate)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {String(item.requestId)}
                  </p>
                </div>
                <Badge variant="secondary">{String(item.status)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </PageContainer>
  );
}
