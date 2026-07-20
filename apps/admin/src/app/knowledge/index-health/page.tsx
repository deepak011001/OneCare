import Link from 'next/link';

export default function IndexHealthPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/">Admin</Link> · Knowledge
      </p>
      <h1>Index Health</h1>
      <p className="muted">
        Document/chunk counts, embedding provider, vector store id, and platform metrics. API:
        <code> /v1/knowledge-platform/index/health</code>.
      </p>
    </main>
  );
}
