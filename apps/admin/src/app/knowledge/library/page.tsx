'use client';

import { useState } from 'react';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch, useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Folder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  status: string;
};

export default function KnowledgeLibraryPage() {
  const { data, error, loading, reload } = useKnowledgeAdminResource<Folder[]>(
    '/v1/admin/knowledge/folders',
  );
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  async function createFolder() {
    await adminFetch('/v1/admin/knowledge/folders', {
      method: 'POST',
      body: JSON.stringify({
        name,
        parentId: parentId || null,
      }),
    });
    setName('');
    await reload();
  }

  return (
    <KnowledgeWorkspaceShell
      title="Knowledge Library"
      subtitle="Nested folders for HR, IT, Finance, and custom trees."
    >
      <section className="panel">
        <h2>Create folder</h2>
        <div className="field">
          <label htmlFor="folder-name">Name</label>
          <input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Travel"
          />
        </div>
        <div className="field">
          <label htmlFor="folder-parent">Parent (optional)</label>
          <select id="folder-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Root</option>
            {(data ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.path}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn" onClick={() => void createFolder()} disabled={!name}>
          Create folder
        </button>
      </section>
      {loading ? <p className="muted">Loading folders…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <section className="panel">
        <h2>Folder tree</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Path</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((f) => (
              <tr key={f.id}>
                <td>{f.path}</td>
                <td>
                  <span className="badge">{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
