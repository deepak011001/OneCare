'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function AttendanceDetailPage() {
  const params = useParams<{ id: string }>();
  const date = params.id;
  const query = useQuery({
    queryKey: ['attendance', 'history', date],
    queryFn: async () => {
      const res = await api.getAttendanceHistory();
      const data = res.data as { items?: Array<Record<string, unknown>> };
      return data.items?.find((i) => String(i.date) === date) ?? null;
    },
  });

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Employee', href: '/app/employee' },
          { label: 'Attendance', href: '/app/employee/attendance' },
          { label: date },
        ]}
      />
      <PageHeader
        title={`Attendance · ${date}`}
        description="Day detail from attendance history."
      />
      {query.isLoading ? <Skeleton className="h-32" /> : null}
      {query.isError ? (
        <ErrorState title="Unable to load detail" onRetry={() => void query.refetch()} />
      ) : null}
      {query.data ? (
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            <p>Status: {String(query.data.status)}</p>
            <p>Check-in: {String(query.data.checkInAt ?? '—')}</p>
            <p>Check-out: {String(query.data.checkOutAt ?? '—')}</p>
          </CardContent>
        </Card>
      ) : null}
      {!query.isLoading && !query.data && !query.isError ? (
        <p className="text-sm text-muted-foreground">No record for this date.</p>
      ) : null}
    </PageContainer>
  );
}
