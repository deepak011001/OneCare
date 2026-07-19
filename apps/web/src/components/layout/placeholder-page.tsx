'use client';

import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageContainer, PageHeader } from '@/components/ui/page';
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <PageContainer>
      <Breadcrumb items={[{ label: 'App', href: '/app/dashboard' }, { label: title }]} />
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title="Coming in a later milestone"
        description="This area is reserved in the shell. No business or AI logic is wired yet."
      />
    </PageContainer>
  );
}
