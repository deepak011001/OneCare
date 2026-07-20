import Link from 'next/link';

export default function ConnectorStatusPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/">Admin</Link> · Knowledge
      </p>
      <h1>Connector Status</h1>
      <p className="muted">
        Registered knowledge connectors (SharePoint, Confluence, Drive, Notion, files, …). API:
        <code> /v1/knowledge-platform/connectors</code>.
      </p>
    </main>
  );
}
