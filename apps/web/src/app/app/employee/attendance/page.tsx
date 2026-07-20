'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function AttendanceHistoryPage() {
  const query = useQuery({
    queryKey: ['attendance', 'history'],
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
          { label: 'Attendance' },
        ]}
      />
      <PageHeader
        title="Attendance history"
        description="Recent punches and daily status from MCP attendance tools."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/app/employee/attendance/calendar">Calendar</Link>
          </Button>
        }
      />
      {query.isLoading ? <Skeleton className="h-48" /> : null}
      {query.isError ? (
        <ErrorState title="Unable to load history" onRetry={() => void query.refetch()} />
      ) : null}
      <div className="space-y-3">
        {(query.data?.items ?? []).map((item) => (
          <Card key={String(item.date)}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={`/app/employee/attendance/${String(item.date)}`} className="underline">
                  {String(item.date)}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {String(item.status)} · in {String(item.checkInAt ?? '—')} · out{' '}
              {String(item.checkOutAt ?? '—')}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
