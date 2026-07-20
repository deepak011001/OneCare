import Link from 'next/link';

export default function AgentsHealthPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/agents">Agents</Link> · Health
      </p>
      <h1>Agent Health</h1>
      <p className="muted">
        Per-agent health status from the Enterprise Agent Framework. API:
        <code> GET /v1/agents/health</code>.
      </p>
    </main>
  );
}
