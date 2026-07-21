'use client';

import { useState } from 'react';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch, useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Settings = {
  maxUploadBytes: number;
  requireApproval: boolean;
  defaultVisibility: string;
  autoExpireDays?: number;
  allowedFormats: readonly string[];
};

export default function KnowledgeSettingsPage() {
  const { data, error, reload } = useKnowledgeAdminResource<Settings>(
    '/v1/admin/knowledge/settings',
  );
  const [requireApproval, setRequireApproval] = useState(true);

  async function save() {
    await adminFetch('/v1/admin/knowledge/settings', {
      method: 'PUT',
      body: JSON.stringify({ requireApproval }),
    });
    await reload();
  }

  return (
    <KnowledgeWorkspaceShell
      title="Knowledge Settings"
      subtitle="Upload limits, approval gates, default ACL visibility."
    >
      {error ? <p className="error">{error}</p> : null}
      {data ? (
        <section className="panel">
          <p>Max upload: {(data.maxUploadBytes / (1024 * 1024)).toFixed(0)} MB</p>
          <p>Default visibility: {data.defaultVisibility}</p>
          <p>Formats: {data.allowedFormats.join(', ')}</p>
          <label>
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
            />{' '}
            Require approval before publish
          </label>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn" onClick={() => void save()}>
              Save settings
            </button>
          </div>
        </section>
      ) : (
        <p className="muted">Loading settings…</p>
      )}
    </KnowledgeWorkspaceShell>
  );
}
