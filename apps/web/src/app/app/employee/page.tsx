'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { LeaveDashboardWidgets } from '@/features/leave/leave-dashboard-widgets';
import { AttendanceDashboardWidgets } from '@/features/attendance/attendance-dashboard-widgets';
import { KnowledgeDashboardWidgets } from '@/features/knowledge/knowledge-dashboard-widgets';

export default function EmployeePage() {
  return (
    <PageContainer>
      <Breadcrumb items={[{ label: 'App', href: '/app/dashboard' }, { label: 'Employee' }]} />
      <PageHeader
        title="Employee Services"
        description="Self-service leave, attendance, and knowledge powered by the Employee Agent."
        actions={
          <Button asChild size="sm">
            <Link href="/app/ai?prompt=What%20is%20our%20leave%20policy%3F">Ask OneCare AI</Link>
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <CardTitle>Knowledge</CardTitle>
            <CardDescription>Policies, FAQs, and guides</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/employee/knowledge">Open</Link>
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
        <KnowledgeDashboardWidgets />
      </div>
    </PageContainer>
  );
}
