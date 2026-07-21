'use client';

import { useState } from 'react';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch, useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Collection = {
  id: string;
  name: string;
  description?: string;
  documentIds: readonly string[];
};

export default function CollectionsPage() {
  const { data, error, reload } = useKnowledgeAdminResource<Collection[]>(
    '/v1/admin/knowledge/collections',
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  async function create() {
    await adminFetch('/v1/admin/knowledge/collections', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    setName('');
    setDescription('');
    await reload();
  }

  return (
    <KnowledgeWorkspaceShell
      title="Collections"
      subtitle="Group documents for journeys like New Employee onboarding."
    >
      <section className="panel">
        <div className="field">
          <label htmlFor="col-name">Name</label>
          <input id="col-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="col-desc">Description</label>
          <input
            id="col-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button type="button" className="btn" disabled={!name} onClick={() => void create()}>
          Create collection
        </button>
      </section>
      {error ? <p className="error">{error}</p> : null}
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Documents</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.documentIds.length}</td>
                <td>{c.description ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
