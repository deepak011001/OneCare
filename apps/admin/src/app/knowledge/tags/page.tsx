'use client';

import { useState } from 'react';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch, useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Tag = { id: string; name: string; color: string };

export default function TagsPage() {
  const { data, error, reload } = useKnowledgeAdminResource<Tag[]>('/v1/admin/knowledge/tags');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#c9853f');

  async function create() {
    await adminFetch('/v1/admin/knowledge/tags', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    });
    setName('');
    await reload();
  }

  return (
    <KnowledgeWorkspaceShell title="Tags" subtitle="Color-coded, searchable tags.">
      <section className="panel">
        <div className="field">
          <label htmlFor="tag">Tag name</label>
          <input id="tag" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="color">Color</label>
          <input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <button type="button" className="btn" disabled={!name} onClick={() => void create()}>
          Add tag
        </button>
      </section>
      {error ? <p className="error">{error}</p> : null}
      <section className="panel">
        <ul>
          {(data ?? []).map((t) => (
            <li key={t.id}>
              <span className="badge" style={{ borderColor: t.color, color: t.color }}>
                {t.name}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
