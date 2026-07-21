'use client';

import { useState } from 'react';
import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';
import { adminFetch } from '@/lib/knowledge-admin-api';

type PlaygroundResult = {
  question: string;
  scope: string;
  answer: string;
  confidence: number;
  latencyMs: number;
  citations: readonly { documentId: string; title: string; version: number; status: string }[];
  retrievedChunks: readonly {
    documentId: string;
    title: string;
    excerpt: string;
    score: number;
  }[];
  diagnostics: { query: string; candidateCount: number; rankedCount: number };
};

export default function PlaygroundPage() {
  const [question, setQuestion] = useState('Can I work from home?');
  const [scope, setScope] = useState<'draft' | 'published'>('draft');
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<PlaygroundResult>('/v1/admin/knowledge/playground', {
        method: 'POST',
        body: JSON.stringify({ question, scope }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Playground failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KnowledgeWorkspaceShell
      title="AI Playground"
      subtitle="Validate answers from draft content before publishing to employees."
    >
      <section className="panel">
        <div className="field">
          <label htmlFor="q">Employee question</label>
          <input id="q" value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="scope">Scope</label>
          <select
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'draft' | 'published')}
          >
            <option value="draft">Draft / review only</option>
            <option value="published">Published production</option>
          </select>
        </div>
        <button
          type="button"
          className="btn"
          disabled={!question || loading}
          onClick={() => void run()}
        >
          {loading ? 'Running…' : 'Ask'}
        </button>
      </section>
      {error ? <p className="error">{error}</p> : null}
      {result ? (
        <>
          <section className="panel">
            <h2>Answer</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{result.answer}</pre>
            <p className="muted">
              Confidence {(result.confidence * 100).toFixed(0)}% · {result.latencyMs}ms · scope{' '}
              {result.scope}
            </p>
          </section>
          <section className="panel">
            <h2>Citations</h2>
            <ul>
              {result.citations.map((c) => (
                <li key={c.documentId}>
                  {c.title} (v{c.version}, {c.status})
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2>Retrieved chunks</h2>
            {result.retrievedChunks.map((c) => (
              <div
                key={`${c.documentId}-${c.score}`}
                className="panel"
                style={{ marginTop: '0.5rem' }}
              >
                <strong>
                  {c.title} · score {c.score}
                </strong>
                <p className="muted">{c.excerpt}</p>
              </div>
            ))}
            <p className="muted">
              Candidates {result.diagnostics.candidateCount} · ranked{' '}
              {result.diagnostics.rankedCount}
            </p>
          </section>
        </>
      ) : null}
    </KnowledgeWorkspaceShell>
  );
}
