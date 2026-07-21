import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';

export default function IndexHealthPage() {
  return (
    <KnowledgeWorkspaceShell
      title="Index Health"
      subtitle="Vector / document index stats from Knowledge Platform."
    >
      <section className="panel">
        <p>
          API: <code>/v1/knowledge-platform/index/health</code>
        </p>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
