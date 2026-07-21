import Link from 'next/link';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';

export default function SourcesPage() {
  return (
    <KnowledgeWorkspaceShell
      title="Sources"
      subtitle="SharePoint · Confluence · Drive · Notion · uploads · markdown."
    >
      <section className="panel">
        <p>
          Platform APIs: <code>/v1/knowledge-platform/sources</code>
        </p>
        <p className="muted">
          Enable, sync, and monitor sources without changing AI Runtime or retrieval contracts.
        </p>
        <p>
          Also see <Link href="/knowledge/connectors">Connectors</Link> and{' '}
          <Link href="/knowledge/sync-jobs">Sync Jobs</Link>.
        </p>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
