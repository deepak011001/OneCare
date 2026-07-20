'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

type LeaveDashboard = {
  balance: { balances?: Array<{ leaveType: string; available: number; used?: number }> };
  upcoming: Array<Record<string, unknown>>;
  recent: Array<Record<string, unknown>>;
  holidays: { holidays?: Array<{ date: string; name: string }> };
  types: { types?: Array<{ name: string } | string> };
  quickActions: Array<{ id: string; label: string; href: string }>;
};

export function LeaveDashboardWidgets() {
  const query = useQuery({
    queryKey: ['leave', 'dashboard'],
    queryFn: async () => {
      const res = await api.getLeaveDashboard();
      return res.data as LeaveDashboard;
    },
  });

  if (query.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Unable to load leave data"
        description="Leave widgets require leave.read permission and a healthy MCP connector."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data) return null;

  const balances = data.balance.balances ?? [];
  const holidays = data.holidays.holidays ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Leave</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/employee/leave">View history</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Leave balance</CardTitle>
            <CardDescription>Current balances via MCP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {balances.length === 0 ? <p className="text-muted-foreground">No balances</p> : null}
            {balances.map((b) => (
              <div key={b.leaveType} className="flex justify-between gap-2">
                <span>{b.leaveType}</span>
                <span className="font-medium">{b.available} available</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming leave</CardTitle>
            <CardDescription>Pending or approved requests</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.upcoming.length === 0 ? (
              <p className="text-muted-foreground">No upcoming leave</p>
            ) : null}
            {data.upcoming.slice(0, 4).map((item) => (
              <Link
                key={String(item.requestId)}
                href={`/app/employee/leave/${String(item.requestId)}`}
                className="flex items-center justify-between gap-2 hover:underline"
              >
                <span>
                  {String(item.leaveType)} · {String(item.startDate)}
                </span>
                <Badge variant="secondary">{String(item.status)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holiday calendar</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {holidays.length === 0 ? (
              <p className="text-muted-foreground">No holidays listed</p>
            ) : null}
            {holidays.slice(0, 4).map((h) => (
              <div key={`${h.date}-${h.name}`} className="flex justify-between gap-2">
                <span>{h.name}</span>
                <span className="text-muted-foreground">{h.date}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Recent leave requests</CardTitle>
            <CardDescription>Latest activity from leave history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recent.length === 0 ? (
              <p className="text-muted-foreground">No recent requests</p>
            ) : null}
            {data.recent.map((item) => (
              <Link
                key={String(item.requestId)}
                href={`/app/employee/leave/${String(item.requestId)}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0 hover:underline"
              >
                <span className="font-mono text-xs">{String(item.requestId)}</span>
                <span>
                  {String(item.leaveType)} · {String(item.startDate)} → {String(item.endDate)}
                </span>
                <Badge variant="outline">{String(item.status)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.quickActions.map((action) => (
              <Button key={action.id} asChild variant="secondary" size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
