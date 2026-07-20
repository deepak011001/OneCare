import Link from 'next/link';

export default function SyncJobsPage() {
  return (
    <main className="shell">
      <p className="eyebrow">
        <Link href="/">Admin</Link> · Knowledge
      </p>
      <h1>Sync Jobs</h1>
      <p className="muted">
        Full, incremental, manual, scheduled, and webhook sync status. APIs at
        <code> /v1/knowledge-platform/jobs</code>.
      </p>
    </main>
  );
}
