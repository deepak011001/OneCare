import type { EmbeddedChunk, DocumentChunk } from './types';
import type { EmbeddingProviderPort, VectorStorePort, AclResolverPort } from './ports';
import type { AclPrincipal } from './types';

/** Deterministic local embedding — swap via EmbeddingProviderPort for Azure/OpenAI/etc. */
export class HashEmbeddingProvider implements EmbeddingProviderPort {
  readonly providerId = 'local-hash';
  readonly modelId = 'hash-v1';
  readonly dimensions: number;

  constructor(dimensions = 64) {
    this.dimensions = dimensions;
  }

  async embed(texts: readonly string[]): Promise<readonly (readonly number[])[]> {
    return texts.map((text) => hashEmbed(text, this.dimensions));
  }
}

export function hashEmbed(text: string, dimensions: number): number[] {
  const vec = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dimensions;
    vec[idx] = (vec[idx] ?? 0) + 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export class InMemoryVectorStore implements VectorStorePort {
  readonly storeId = 'memory-vector';
  private readonly byChunk = new Map<
    string,
    { tenantId: string; chunk: DocumentChunk; embedding: readonly number[]; modelId: string }
  >();

  constructor(private readonly acl: AclResolverPort) {}

  async upsert(chunks: readonly EmbeddedChunk[]): Promise<void> {
    for (const item of chunks) {
      this.byChunk.set(item.chunk.id, {
        tenantId: item.chunk.acl.tenantId,
        chunk: item.chunk,
        embedding: item.embedding,
        modelId: item.modelId,
      });
    }
  }

  async deleteByDocumentId(tenantId: string, documentId: string): Promise<void> {
    for (const [id, row] of this.byChunk) {
      if (row.tenantId === tenantId && row.chunk.documentId === documentId) {
        this.byChunk.delete(id);
      }
    }
  }

  async search(input: {
    readonly tenantId: string;
    readonly embedding: readonly number[];
    readonly limit: number;
    readonly principal: AclPrincipal;
  }): Promise<readonly { chunkId: string; score: number }[]> {
    const scored: { chunkId: string; score: number }[] = [];
    for (const row of this.byChunk.values()) {
      if (row.tenantId !== input.tenantId) continue;
      if (!this.acl.isAllowed(row.chunk.acl, input.principal)) continue;
      scored.push({
        chunkId: row.chunk.id,
        score: cosineSimilarity(input.embedding, row.embedding),
      });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, input.limit);
  }

  /** Internal helper for hybrid keyword overlay (not part of VectorStorePort). */
  listTenantChunks(tenantId: string): readonly DocumentChunk[] {
    return [...this.byChunk.values()].filter((r) => r.tenantId === tenantId).map((r) => r.chunk);
  }
}
