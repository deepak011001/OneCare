import Link from 'next/link';

export default function KnowledgeSourcesPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/">Admin</Link> · Knowledge
      </p>
      <h1>Knowledge Sources</h1>
      <p className="muted">
        Register SharePoint, Confluence, Drive, Notion, and local file sources. Shell only — APIs at
        <code> /v1/knowledge-platform/sources</code>.
      </p>
    </main>
  );
}
