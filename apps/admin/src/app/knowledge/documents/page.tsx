'use client';

import { useState } from 'react';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch, useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Doc = {
  id: string;
  title: string;
  status: string;
  version: number;
  updatedAt: string;
  summary: string;
  body: string;
  versions: readonly { version: number; changeNote?: string; createdAt: string }[];
};

export default function DocumentsPage() {
  const { data, error, loading, reload } = useKnowledgeAdminResource<Doc[]>(
    '/v1/admin/knowledge/documents',
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selected, setSelected] = useState<Doc | null>(null);

  async function createDoc() {
    await adminFetch('/v1/admin/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify({ title, body, summary: body.slice(0, 160) }),
    });
    setTitle('');
    setBody('');
    await reload();
  }

  async function submitForReview(id: string) {
    await adminFetch(`/v1/admin/knowledge/documents/${id}/approve-request`, {
      method: 'POST',
      body: JSON.stringify({ note: 'Ready for HR review' }),
    });
    await reload();
  }

  async function publish(id: string) {
    await adminFetch(`/v1/admin/knowledge/documents/${id}/publish`, { method: 'POST' });
    await reload();
  }

  return (
    <KnowledgeWorkspaceShell
      title="Documents"
      subtitle="Upload and author policies with draft → review → publish."
    >
      <section className="panel">
        <h2>New document (markdown editor)</h2>
        <div className="field">
          <label htmlFor="doc-title">Title</label>
          <input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="doc-body">Body</label>
          <textarea
            id="doc-body"
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write policy content…"
          />
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            disabled={!title || !body}
            onClick={() => void createDoc()}
          >
            Save draft
          </button>
        </div>
      </section>
      {loading ? <p className="muted">Loading documents…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <section className="panel">
        <h2>Library</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Version</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((d) => (
              <tr key={d.id}>
                <td>
                  <button type="button" className="btn" onClick={() => setSelected(d)}>
                    {d.title}
                  </button>
                </td>
                <td>
                  <span className="badge">{d.status}</span>
                </td>
                <td>v{d.version}</td>
                <td className="btn-row">
                  {d.status === 'draft' ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void submitForReview(d.id)}
                    >
                      Request review
                    </button>
                  ) : null}
                  {d.status === 'approved' ? (
                    <button type="button" className="btn" onClick={() => void publish(d.id)}>
                      Publish
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected ? (
        <section className="panel">
          <h2>{selected.title}</h2>
          <p className="muted">{selected.summary}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{selected.body}</pre>
          <h3>Versions</h3>
          <ul>
            {selected.versions.map((v) => (
              <li key={v.version}>
                v{v.version} · {v.changeNote ?? 'Update'} · {v.createdAt}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </KnowledgeWorkspaceShell>
  );
}
