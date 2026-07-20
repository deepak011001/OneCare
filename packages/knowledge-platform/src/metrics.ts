import type { KnowledgePlatformMetricsSnapshot } from './types';
import type { KnowledgeMetricsPort } from './ports';

export class InMemoryKnowledgeMetrics implements KnowledgeMetricsPort {
  private documentsIndexed = 0;
  private chunksCreated = 0;
  private embeddingLatencyMsTotal = 0;
  private searchLatencyMsTotal = 0;
  private rerankLatencyMsTotal = 0;
  private hits = 0;
  private misses = 0;
  private connectorFailures = 0;
  private syncDurationMsTotal = 0;

  recordDocumentsIndexed(count: number): void {
    this.documentsIndexed += count;
  }
  recordChunksCreated(count: number): void {
    this.chunksCreated += count;
  }
  recordEmbeddingLatency(ms: number): void {
    this.embeddingLatencyMsTotal += ms;
  }
  recordSearchLatency(ms: number): void {
    this.searchLatencyMsTotal += ms;
  }
  recordRerankLatency(ms: number): void {
    this.rerankLatencyMsTotal += ms;
  }
  recordHit(): void {
    this.hits += 1;
  }
  recordMiss(): void {
    this.misses += 1;
  }
  recordConnectorFailure(): void {
    this.connectorFailures += 1;
  }
  recordSyncDuration(ms: number): void {
    this.syncDurationMsTotal += ms;
  }

  snapshot(): KnowledgePlatformMetricsSnapshot {
    return {
      documentsIndexed: this.documentsIndexed,
      chunksCreated: this.chunksCreated,
      embeddingLatencyMsTotal: this.embeddingLatencyMsTotal,
      searchLatencyMsTotal: this.searchLatencyMsTotal,
      rerankLatencyMsTotal: this.rerankLatencyMsTotal,
      hits: this.hits,
      misses: this.misses,
      connectorFailures: this.connectorFailures,
      syncDurationMsTotal: this.syncDurationMsTotal,
    };
  }
}
