'use client';

import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch, useKnowledgeAdminResource } from '@/lib/knowledge-admin-api';

type Approval = {
  id: string;
  documentId: string;
  status: string;
  step: string;
  requestedBy: string;
  note?: string;
  createdAt: string;
};

export default function ApprovalsPage() {
  const { data, error, reload } = useKnowledgeAdminResource<Approval[]>(
    '/v1/admin/knowledge/approvals?status=pending',
  );

  async function decide(id: string, decision: 'approved' | 'rejected') {
    await adminFetch(`/v1/admin/knowledge/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
    await reload();
  }

  return (
    <KnowledgeWorkspaceShell
      title="Approvals"
      subtitle="Author → Reviewer → HR → Legal → Publish (configurable)."
    >
      {error ? <p className="error">{error}</p> : null}
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Step</th>
              <th>Requested by</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td>
                  <code>{a.documentId.slice(0, 8)}</code>
                </td>
                <td>
                  <span className="badge">{a.step}</span>
                </td>
                <td>{a.requestedBy}</td>
                <td className="btn-row">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void decide(a.id, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void decide(a.id, 'rejected')}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data ?? []).length === 0 ? <p className="muted">No pending approvals.</p> : null}
      </section>
    </KnowledgeWorkspaceShell>
  );
}
