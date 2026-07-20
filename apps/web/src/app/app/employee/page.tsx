'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { LeaveDashboardWidgets } from '@/features/leave/leave-dashboard-widgets';
import { AttendanceDashboardWidgets } from '@/features/attendance/attendance-dashboard-widgets';

export default function EmployeePage() {
  return (
    <PageContainer>
      <Breadcrumb items={[{ label: 'App', href: '/app/dashboard' }, { label: 'Employee' }]} />
      <PageHeader
        title="Employee Services"
        description="Self-service leave and attendance powered by the Employee Agent and MCP."
        actions={
          <Button asChild size="sm">
            <Link href="/app/ai?prompt=Am%20I%20checked%20in%20today%3F">Ask OneCare AI</Link>
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Leave history</CardTitle>
            <CardDescription>Browse and open leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/employee/leave">Open</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Today status, history, and calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/employee/attendance">Open</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clock in</CardTitle>
            <CardDescription>Mark attendance via AI</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/ai?prompt=Clock%20me%20in">Start</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-8">
        <LeaveDashboardWidgets />
        <AttendanceDashboardWidgets />
      </div>
    </PageContainer>
  );
}
