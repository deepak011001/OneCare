'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function AttendanceCalendarPage() {
  const query = useQuery({
    queryKey: ['attendance', 'history', 'calendar'],
    queryFn: async () => {
      const res = await api.getAttendanceHistory();
      return res.data as { items?: Array<Record<string, unknown>> };
    },
  });

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Employee', href: '/app/employee' },
          { label: 'Attendance', href: '/app/employee/attendance' },
          { label: 'Calendar' },
        ]}
      />
      <PageHeader
        title="Attendance calendar"
        description="Month view of present, late, and WFH days."
      />
      {query.isLoading ? <Skeleton className="h-48" /> : null}
      {query.isError ? (
        <ErrorState title="Unable to load calendar" onRetry={() => void query.refetch()} />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {(query.data?.items ?? []).map((item) => (
          <Card key={String(item.date)}>
            <CardHeader>
              <CardTitle className="text-base">{String(item.date)}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm capitalize text-muted-foreground">
              {String(item.status)}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
