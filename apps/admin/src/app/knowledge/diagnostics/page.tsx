import Link from 'next/link';

export default function SearchDiagnosticsPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/">Admin</Link> · Knowledge
      </p>
      <h1>Search Diagnostics</h1>
      <p className="muted">
        Admin-only hybrid search diagnostics (keyword / vector / ACL / rerank). API:
        <code> /v1/knowledge-platform/diagnostics/search</code>.
      </p>
    </main>
  );
}
