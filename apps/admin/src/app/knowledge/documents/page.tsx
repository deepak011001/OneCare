import Link from 'next/link';

export default function DocumentLibraryPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/">Admin</Link> · Knowledge
      </p>
      <h1>Document Library</h1>
      <p className="muted">
        Indexed document metadata, versions, and soft-deletes. No embeddings exposed. API:
        <code> /v1/knowledge-platform/documents</code>.
      </p>
    </main>
  );
}
