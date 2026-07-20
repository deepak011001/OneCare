'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';

type KnowledgeDashboard = {
  popularPolicies: Array<{
    id: string;
    title: string;
    summary: string;
    domain: string;
    category: string;
    url?: string;
  }>;
  recentSearches: string[];
  announcements: Array<{ id: string; title: string; body: string; publishedAt: string }>;
  quickLinks: Array<{ id: string; label: string; href: string }>;
  categories: Array<{ domain: string; category: string; count: number }>;
  faqs: string[];
  taxonomy: Array<{ domain: string; category: string; label: string; example?: string }>;
};

export function KnowledgeDashboardWidgets() {
  const query = useQuery({
    queryKey: ['knowledge', 'dashboard'],
    queryFn: async () => {
      const res = await api.getKnowledgeDashboard();
      return res.data as KnowledgeDashboard;
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
        title="Unable to load knowledge"
        description="Knowledge widgets require knowledge.search permission."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Knowledge</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/employee/knowledge">Browse knowledge</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Popular policies</CardTitle>
            <CardDescription>Most viewed topics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.popularPolicies.slice(0, 5).map((p) => (
              <div key={p.id} className="flex justify-between gap-2">
                <Link
                  className="text-primary hover:underline"
                  href={`/app/ai?prompt=${encodeURIComponent(`Tell me about ${p.title}`)}`}
                >
                  {p.title}
                </Link>
                <span className="text-muted-foreground">{p.domain}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent searches</CardTitle>
            <CardDescription>Session suggestions (stub)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recentSearches.map((q) => (
              <Link
                key={q}
                className="block text-primary hover:underline"
                href={`/app/ai?prompt=${encodeURIComponent(q)}`}
              >
                {q}
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company announcements</CardTitle>
            <CardDescription>Stub feed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.announcements.map((a) => (
              <div key={a.id}>
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Handbook and FAQs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.quickLinks.map((link) => (
              <Button key={link.id} asChild variant="outline" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Knowledge categories</CardTitle>
            <CardDescription>Browse by domain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.taxonomy.slice(0, 8).map((t) => (
              <div key={`${t.domain}-${t.category}`} className="flex justify-between gap-2">
                <span>
                  {t.domain} / {t.label}
                </span>
                <Link
                  className="text-primary hover:underline"
                  href={`/app/ai?prompt=${encodeURIComponent(t.example ?? t.label)}`}
                >
                  Ask
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frequently asked</CardTitle>
            <CardDescription>Trending employee questions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.faqs.map((q) => (
              <Link
                key={q}
                className="block text-primary hover:underline"
                href={`/app/ai?prompt=${encodeURIComponent(q)}`}
              >
                {q}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
