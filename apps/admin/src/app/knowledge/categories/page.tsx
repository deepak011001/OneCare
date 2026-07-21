'use client';

import { useState } from 'react';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch, useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Category = { id: string; name: string; slug: string; description?: string };

export default function CategoriesPage() {
  const { data, error, reload } = useKnowledgeAdminResource<Category[]>(
    '/v1/admin/knowledge/categories',
  );
  const [name, setName] = useState('');

  async function create() {
    await adminFetch('/v1/admin/knowledge/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setName('');
    await reload();
  }

  return (
    <KnowledgeWorkspaceShell title="Categories" subtitle="Unlimited custom knowledge categories.">
      <section className="panel">
        <div className="field">
          <label htmlFor="cat">New category</label>
          <input id="cat" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="button" className="btn" disabled={!name} onClick={() => void create()}>
          Add category
        </button>
      </section>
      {error ? <p className="error">{error}</p> : null}
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.slug}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
