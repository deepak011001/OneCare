import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';

export default function SyncJobsPage() {
  return (
    <KnowledgeWorkspaceShell title="Sync Jobs" subtitle="Ingestion jobs from Knowledge Platform.">
      <section className="panel">
        <p>
          API: <code>/v1/knowledge-platform/jobs</code>
        </p>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
