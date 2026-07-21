import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';

export default function ConnectorsPage() {
  return (
    <KnowledgeWorkspaceShell
      title="Connectors"
      subtitle="Enable, disable, health, last sync, failures, retries."
    >
      <section className="panel">
        <p>
          Platform API: <code>/v1/knowledge-platform/connectors</code>
        </p>
        <p className="muted">
          Credential status uses secretRef patterns — secrets never appear in the UI or prompts.
        </p>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
