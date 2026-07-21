'use client';

import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Dashboard = {
  analytics: {
    documentsTotal: number;
    publishedDocs: number;
    draftDocs: number;
    pendingApprovals: number;
    categories: number;
    collections: number;
    byStatus: Record<string, number>;
  };
  health: {
    indexed: number;
    pending: number;
    missingCategory: number;
    duplicates: number;
    expired: number;
  };
};

export default function KnowledgeDashboardPage() {
  const { data, error, loading, reload } = useKnowledgeAdminResource<Dashboard>(
    '/v1/admin/knowledge/dashboard',
  );

  return (
    <KnowledgeWorkspaceShell
      title="Knowledge Dashboard"
      subtitle="Operate the enterprise knowledge base without code changes."
    >
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => void reload()}>
          Refresh
        </button>
      </div>
      {loading ? <p className="muted">Loading dashboard…</p> : null}
      {error ? (
        <p className="error">
          API unavailable ({error}). Start the API and sign in with knowledge.admin. Demo seed still
          available once authenticated.
        </p>
      ) : null}
      {data ? (
        <>
          <div className="grid-stats">
            <div className="stat">
              <strong>{data.analytics.documentsTotal}</strong>
              <span>Documents</span>
            </div>
            <div className="stat">
              <strong>{data.analytics.publishedDocs}</strong>
              <span>Published</span>
            </div>
            <div className="stat">
              <strong>{data.analytics.draftDocs}</strong>
              <span>Drafts</span>
            </div>
            <div className="stat">
              <strong>{data.analytics.pendingApprovals}</strong>
              <span>Pending approvals</span>
            </div>
            <div className="stat">
              <strong>{data.health.indexed}</strong>
              <span>Indexed</span>
            </div>
            <div className="stat">
              <strong>{data.health.duplicates}</strong>
              <span>Duplicate groups</span>
            </div>
          </div>
          <section className="panel">
            <h2>Status mix</h2>
            <ul>
              {Object.entries(data.analytics.byStatus).map(([status, count]) => (
                <li key={status}>
                  <span className="badge">{status}</span> {count}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
      <section className="panel">
        <h2>Admin capabilities</h2>
        <p className="muted">
          Library folders · documents · categories · tags · collections · approvals · versioning ·
          AI playground (draft-only) · analytics · connector/source ops via Knowledge Platform APIs.
        </p>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
