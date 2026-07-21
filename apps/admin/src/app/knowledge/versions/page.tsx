'use client';

import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Doc = {
  id: string;
  title: string;
  version: number;
  versions: readonly {
    version: number;
    changeNote?: string;
    createdAt: string;
    createdBy: string;
  }[];
};

export default function VersionsPage() {
  const { data, error } = useKnowledgeAdminResource<Doc[]>('/v1/admin/knowledge/documents');

  return (
    <KnowledgeWorkspaceShell
      title="Versions"
      subtitle="Every update creates an auditable version; restore from history."
    >
      {error ? <p className="error">{error}</p> : null}
      {(data ?? []).map((d) => (
        <section key={d.id} className="panel">
          <h2>
            {d.title} · current v{d.version}
          </h2>
          <ol>
            {d.versions.map((v) => (
              <li key={v.version}>
                v{v.version} — {v.changeNote ?? 'Update'} — {v.createdBy} — {v.createdAt}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </KnowledgeWorkspaceShell>
  );
}
