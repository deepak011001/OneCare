'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeaveHolidaysPage() {
  const query = useQuery({
    queryKey: ['leave', 'holidays'],
    queryFn: async () => {
      const res = await api.getLeaveHolidays();
      return res.data as { month?: string; holidays?: Array<{ date: string; name: string }> };
    },
  });

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Leave', href: '/app/employee/leave' },
          { label: 'Holidays' },
        ]}
      />
      <PageHeader
        title="Holiday calendar"
        description="Company holidays for the current month via MCP."
      />
      {query.isLoading ? <Skeleton className="h-40" /> : null}
      {query.isError ? (
        <ErrorState
          title="Unable to load holidays"
          description="Requires holiday.read permission."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Month {query.data.month ?? ''}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(query.data.holidays ?? []).map((h) => (
              <div key={`${h.date}-${h.name}`} className="flex justify-between gap-2">
                <span>{h.name}</span>
                <span className="text-muted-foreground">{h.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </PageContainer>
  );
}
