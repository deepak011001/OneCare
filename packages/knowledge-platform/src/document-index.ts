import type {
  DocumentChunk,
  ExtractedMetadata,
  IndexStatistics,
  NormalizedDocument,
} from './types';
import type { DocumentIndexPort } from './ports';

type IndexRow = {
  document: NormalizedDocument;
  metadata: ExtractedMetadata;
  chunks: readonly DocumentChunk[];
  popularity: number;
};

export class InMemoryDocumentIndex implements DocumentIndexPort {
  private readonly docs = new Map<string, IndexRow>();

  private key(tenantId: string, documentId: string): string {
    return `${tenantId}::${documentId}`;
  }

  async upsert(record: {
    readonly document: NormalizedDocument;
    readonly metadata: ExtractedMetadata;
    readonly chunks: readonly DocumentChunk[];
  }): Promise<void> {
    const k = this.key(record.document.acl.tenantId, record.document.id);
    const prev = this.docs.get(k);
    this.docs.set(k, {
      document: record.document,
      metadata: record.metadata,
      chunks: record.chunks,
      popularity: prev?.popularity ?? 0,
    });
  }

  async softDelete(tenantId: string, documentId: string): Promise<void> {
    const k = this.key(tenantId, documentId);
    const row = this.docs.get(k);
    if (!row) return;
    this.docs.set(k, {
      ...row,
      document: { ...row.document, status: 'soft_deleted' },
    });
  }

  async get(tenantId: string, documentId: string) {
    const row = this.docs.get(this.key(tenantId, documentId));
    if (!row || row.document.status === 'soft_deleted') return null;
    return row;
  }

  async list(tenantId: string) {
    return [...this.docs.values()]
      .filter((r) => r.document.acl.tenantId === tenantId && r.document.status === 'active')
      .map((r) => ({
        document: r.document,
        metadata: r.metadata,
        popularity: r.popularity,
      }));
  }

  async getChunk(tenantId: string, chunkId: string): Promise<DocumentChunk | null> {
    for (const row of this.docs.values()) {
      if (row.document.acl.tenantId !== tenantId) continue;
      const chunk = row.chunks.find((c) => c.id === chunkId);
      if (chunk) return chunk;
    }
    return null;
  }

  async stats(tenantId: string): Promise<IndexStatistics> {
    const rows = [...this.docs.values()].filter((r) => r.document.acl.tenantId === tenantId);
    const active = rows.filter((r) => r.document.status === 'active');
    const softDeleted = rows.filter((r) => r.document.status === 'soft_deleted').length;
    const chunks = active.reduce((n, r) => n + r.chunks.length, 0);
    const sources = new Set(active.map((r) => r.document.sourceSystem));
    const last = active
      .map((r) => r.document.lastModified)
      .sort()
      .at(-1);
    return {
      tenantId,
      documents: active.length,
      chunks,
      sources: sources.size,
      softDeleted,
      ...(last ? { lastIndexedAt: last } : {}),
    };
  }

  async touch(tenantId: string, documentId: string): Promise<void> {
    const row = this.docs.get(this.key(tenantId, documentId));
    if (!row) return;
    this.docs.set(this.key(tenantId, documentId), {
      ...row,
      popularity: row.popularity + 1,
    });
  }
}
