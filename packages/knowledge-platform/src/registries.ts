import type { KnowledgeSourceConfig, SyncCheckpoint } from './types';
import type { CheckpointStorePort, SourceRegistryPort } from './ports';

export class InMemorySourceRegistry implements SourceRegistryPort {
  private readonly sources = new Map<string, KnowledgeSourceConfig>();

  private key(tenantId: string, sourceId: string): string {
    return `${tenantId}::${sourceId}`;
  }

  async upsert(source: KnowledgeSourceConfig): Promise<void> {
    this.sources.set(this.key(source.tenantId, source.id), source);
  }

  async get(tenantId: string, sourceId: string): Promise<KnowledgeSourceConfig | null> {
    return this.sources.get(this.key(tenantId, sourceId)) ?? null;
  }

  async list(tenantId: string): Promise<readonly KnowledgeSourceConfig[]> {
    return [...this.sources.values()].filter((s) => s.tenantId === tenantId);
  }

  async remove(tenantId: string, sourceId: string): Promise<void> {
    this.sources.delete(this.key(tenantId, sourceId));
  }
}

export class InMemoryCheckpointStore implements CheckpointStorePort {
  private readonly checkpoints = new Map<string, SyncCheckpoint>();

  private key(tenantId: string, sourceId: string): string {
    return `${tenantId}::${sourceId}`;
  }

  async get(tenantId: string, sourceId: string): Promise<SyncCheckpoint | null> {
    return this.checkpoints.get(this.key(tenantId, sourceId)) ?? null;
  }

  async save(checkpoint: SyncCheckpoint): Promise<void> {
    this.checkpoints.set(this.key(checkpoint.tenantId, checkpoint.sourceId), checkpoint);
  }
}
