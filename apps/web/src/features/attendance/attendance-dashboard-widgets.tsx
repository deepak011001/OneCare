'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

type AttendanceDashboard = {
  today?: {
    date?: string;
    status?: string;
    checkInAt?: string;
    checkOutAt?: string;
    workingHours?: number;
    late?: boolean;
    wfh?: boolean;
  };
  recent?: Array<Record<string, unknown>>;
  summary?: {
    presentDays?: number;
    absentDays?: number;
    lateDays?: number;
    wfhDays?: number;
    workingDays?: number;
  };
  hours?: { totalHours?: number; averageHours?: number };
  shift?: { shift?: string; start?: string; end?: string };
  quickActions?: Array<{ id: string; label: string; href: string }>;
};

export function AttendanceDashboardWidgets() {
  const query = useQuery({
    queryKey: ['attendance', 'dashboard'],
    queryFn: async () => {
      const res = await api.getAttendanceDashboard();
      return res.data as AttendanceDashboard;
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
        title="Unable to load attendance data"
        description="Attendance widgets require attendance.read and a healthy MCP connector."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  const today = data?.today;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Today</CardTitle>
          <CardDescription>{today?.date ?? 'Today'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant="secondary">{(today?.status ?? 'unknown').replace(/_/g, ' ')}</Badge>
          <p className="text-sm text-muted-foreground">
            Check-in: {today?.checkInAt ?? '—'} · Check-out: {today?.checkOutAt ?? '—'}
          </p>
          {today?.workingHours !== undefined ? (
            <p className="text-sm">Working hours: {today.workingHours}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
          <CardDescription>This month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Present: {data?.summary?.presentDays ?? 0}</p>
          <p>Absent: {data?.summary?.absentDays ?? 0}</p>
          <p>Late: {data?.summary?.lateDays ?? 0}</p>
          <p>WFH: {data?.summary?.wfhDays ?? 0}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>Shift {data?.shift?.shift ?? 'General'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Total: {data?.hours?.totalHours ?? 0}h</p>
          <p>Average: {data?.hours?.averageHours ?? 0}h/day</p>
          <p>
            Shift window: {data?.shift?.start ?? '09:00'} – {data?.shift?.end ?? '18:00'}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.recent ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent records.</p>
          ) : (
            (data?.recent ?? []).map((item) => (
              <div key={String(item.date)} className="flex items-center justify-between text-sm">
                <span>
                  {String(item.date)} — {String(item.status)}
                </span>
                <span className="text-muted-foreground">
                  {item.checkInAt ? String(item.checkInAt) : '—'}
                  {item.checkOutAt ? ` → ${String(item.checkOutAt)}` : ''}
                </span>
              </div>
            ))
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/app/employee/attendance">View history</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(data?.quickActions ?? []).map((action) => (
            <Button key={action.id} asChild variant="outline" size="sm">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
          <Button asChild size="sm">
            <Link href="/app/employee/attendance/calendar">Calendar</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
