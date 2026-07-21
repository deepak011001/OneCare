'use client';

import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Analytics = {
  documentsTotal: number;
  publishedDocs: number;
  draftDocs: number;
  pendingApprovals: number;
  avgTokenEstimate: number;
  topCategories: readonly { id: string; name: string; count: number }[];
  byStatus: Record<string, number>;
};

export default function AnalyticsPage() {
  const { data, error } = useKnowledgeAdminResource<Analytics>('/v1/admin/knowledge/analytics');

  return (
    <KnowledgeWorkspaceShell
      title="Knowledge Analytics"
      subtitle="Coverage, drafts, approvals, and category usage."
    >
      {error ? <p className="error">{error}</p> : null}
      {data ? (
        <>
          <div className="grid-stats">
            <div className="stat">
              <strong>{data.documentsTotal}</strong>
              <span>Total docs</span>
            </div>
            <div className="stat">
              <strong>{data.publishedDocs}</strong>
              <span>Published</span>
            </div>
            <div className="stat">
              <strong>{data.draftDocs}</strong>
              <span>Drafts</span>
            </div>
            <div className="stat">
              <strong>{data.pendingApprovals}</strong>
              <span>Pending reviews</span>
            </div>
            <div className="stat">
              <strong>{data.avgTokenEstimate}</strong>
              <span>Avg tokens</span>
            </div>
          </div>
          <section className="panel">
            <h2>Top categories</h2>
            <ul>
              {data.topCategories.map((c) => (
                <li key={c.id}>
                  {c.name}: {c.count}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="muted">Loading analytics…</p>
      )}
    </KnowledgeWorkspaceShell>
  );
}
