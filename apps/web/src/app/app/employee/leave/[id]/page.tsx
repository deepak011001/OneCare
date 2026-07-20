'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeaveDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const query = useQuery({
    queryKey: ['leave', 'request', id],
    queryFn: async () => {
      const res = await api.getLeaveRequest(id);
      return res.data as Record<string, unknown>;
    },
    enabled: Boolean(id),
  });

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Leave', href: '/app/employee/leave' },
          { label: id },
        ]}
      />
      <PageHeader
        title="Leave request"
        description="Details for a single leave request."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/app/employee/leave">Back to history</Link>
          </Button>
        }
      />

      {query.isLoading ? <Skeleton className="h-40" /> : null}
      {query.isError ? (
        <ErrorState
          title="Leave request not found"
          description="The request may not exist or you may lack leave.read permission."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-mono text-base">{String(query.data.requestId)}</CardTitle>
            <Badge>{String(query.data.status)}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Leave type</span>
              <span>{String(query.data.leaveType)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Start</span>
              <span>{String(query.data.startDate)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">End</span>
              <span>{String(query.data.endDate)}</span>
            </div>
            {query.data.status === 'pending_approval' ? (
              <Button asChild className="mt-4" size="sm">
                <Link href={`/app/ai?prompt=${encodeURIComponent(`Cancel leave request ${id}`)}`}>
                  Cancel via OneCare AI
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </PageContainer>
  );
}
