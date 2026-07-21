import { KnowledgeWorkspaceShell } from '@/components/knowledge-workspace-shell';

export default function UploadsPage() {
  return (
    <KnowledgeWorkspaceShell
      title="Uploads"
      subtitle="PDF · DOCX · PPTX · XLSX · CSV · TXT · Markdown · HTML · images (OCR-ready)."
    >
      <section className="panel">
        <h2>Upload pipeline</h2>
        <ol>
          <li>Upload</li>
          <li>Virus scan (future)</li>
          <li>OCR / parse</li>
          <li>Chunk → metadata → embed → index</li>
          <li>Ready for review / publish</li>
        </ol>
        <p className="muted">
          Use Documents → New document for markdown drafts today. Binary upload adapters plug into
          the existing Knowledge Platform connectors without redesigning retrieval.
        </p>
        <div className="field">
          <label htmlFor="file">Select files</label>
          <input id="file" type="file" multiple disabled />
        </div>
        <p className="muted">
          Binary upload UI wires to connector ingestion in the next ops slice.
        </p>
      </section>
    </KnowledgeWorkspaceShell>
  );
}
