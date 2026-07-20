'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { KnowledgeDashboardWidgets } from '@/features/knowledge/knowledge-dashboard-widgets';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

export default function EmployeeKnowledgePage() {
  const helpQuery = useQuery({
    queryKey: ['knowledge', 'help'],
    queryFn: async () => {
      const res = await api.getKnowledgeHelp();
      return res.data as {
        description: string;
        examples: string[];
        supportedActions: string[];
        limitations: string[];
      };
    },
  });

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'App', href: '/app/dashboard' },
          { label: 'Employee', href: '/app/employee' },
          { label: 'Knowledge' },
        ]}
      />
      <PageHeader
        title="Enterprise Knowledge"
        description="Ask naturally about policies, benefits, IT, and more — with source attribution."
        actions={
          <Button asChild size="sm">
            <Link href="/app/ai?prompt=What%20is%20our%20leave%20policy%3F">Ask OneCare AI</Link>
          </Button>
        }
      />

      <KnowledgeDashboardWidgets />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Help</CardTitle>
            <CardDescription>Supported topics and tips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {helpQuery.isLoading ? <Skeleton className="h-24" /> : null}
            {helpQuery.isError ? (
              <ErrorState
                title="Unable to load help"
                description="Requires knowledge.search."
                onRetry={() => void helpQuery.refetch()}
              />
            ) : null}
            {helpQuery.data ? (
              <>
                <p>{helpQuery.data.description}</p>
                <div>
                  <p className="mb-1 font-medium">Examples</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {helpQuery.data.examples.map((ex) => (
                      <li key={ex}>
                        <Link
                          className="text-primary hover:underline"
                          href={`/app/ai?prompt=${encodeURIComponent(ex)}`}
                        >
                          {ex}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 font-medium">Limitations</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {helpQuery.data.limitations.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search tips</CardTitle>
            <CardDescription>Natural language first</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>You do not need document names, policy codes, or system names.</p>
            <p>Ask follow-ups like “What about paternity?” after a maternity answer.</p>
            <p>Combine questions in one message — OneCare will answer each with sources.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/app/ai?prompt=What%20knowledge%20topics%20can%20you%20help%20with%3F">
                Open knowledge help in chat
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
