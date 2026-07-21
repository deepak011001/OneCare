'use client';

import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Health = {
  indexed: number;
  pending: number;
  processing: number;
  errors: number;
  expired: number;
  missingOwner: number;
  missingCategory: number;
  duplicates: number;
};

type Dup = {
  fingerprint: string;
  documentIds: readonly string[];
  titles: readonly string[];
};

export default function DiagnosticsPage() {
  const health = useKnowledgeAdminResource<Health>('/v1/admin/knowledge/health');
  const dups = useKnowledgeAdminResource<Dup[]>('/v1/admin/knowledge/diagnostics/duplicates');

  return (
    <KnowledgeWorkspaceShell
      title="Diagnostics"
      subtitle="Index health, duplicates, missing metadata, search debug."
    >
      {health.error ? <p className="error">{health.error}</p> : null}
      {health.data ? (
        <div className="grid-stats">
          {Object.entries(health.data)
            .filter(([k]) => k !== 'tenantId' && k !== 'generatedAt')
            .map(([k, v]) => (
              <div className="stat" key={k}>
                <strong>{String(v)}</strong>
                <span>{k}</span>
              </div>
            ))}
        </div>
      ) : null}
      <section className="panel">
        <h2>Duplicate detection</h2>
        {(dups.data ?? []).length === 0 ? (
          <p className="muted">No duplicate fingerprint groups.</p>
        ) : (
          <ul>
            {(dups.data ?? []).map((d) => (
              <li key={d.fingerprint}>
                {d.titles.join(' · ')} <code>{d.fingerprint}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <h2>Platform search diagnostics</h2>
        <p className="muted">
          Live hybrid search debug remains at <code>/v1/knowledge-platform/diagnostics/search</code>
          .
        </p>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
