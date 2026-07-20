import Link from 'next/link';

export default function AgentsRegistryPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/agents">Agents</Link> · Registry
      </p>
      <h1>Agent Registry</h1>
      <p className="muted">
        Discover registered agents, capabilities, roles, and enablement. API:
        <code> GET /v1/agents</code> · <code>GET /v1/agents/:id</code> ·
        <code> GET /v1/agents/capabilities</code>.
      </p>
    </main>
  );
}
