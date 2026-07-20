import { randomUUID } from 'node:crypto';
import type {
  IngestionJob,
  KnowledgeSourceConfig,
  SyncCheckpoint,
  SyncMode,
  AclPrincipal,
} from './types';
import type {
  AclResolverPort,
  CheckpointStorePort,
  ChunkerPort,
  ConnectorRegistryPort,
  DocumentIndexPort,
  EmbeddingProviderPort,
  IngestionPipelinePort,
  KnowledgeMetricsPort,
  MetadataExtractorPort,
  NormalizerPort,
  VectorStorePort,
} from './ports';

export class DefaultIngestionPipeline implements IngestionPipelinePort {
  private readonly jobs = new Map<string, IngestionJob>();

  constructor(
    private readonly connectors: ConnectorRegistryPort,
    private readonly normalizer: NormalizerPort,
    private readonly metadata: MetadataExtractorPort,
    private readonly acl: AclResolverPort,
    private readonly chunker: ChunkerPort,
    private readonly embeddings: EmbeddingProviderPort,
    private readonly vectors: VectorStorePort,
    private readonly index: DocumentIndexPort,
    private readonly checkpoints: CheckpointStorePort,
    private readonly metrics: KnowledgeMetricsPort,
  ) {}

  async getJob(jobId: string): Promise<IngestionJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async listJobs(tenantId: string): Promise<readonly IngestionJob[]> {
    return [...this.jobs.values()].filter((j) => j.tenantId === tenantId);
  }

  async sync(input: {
    readonly tenantId: string;
    readonly source: KnowledgeSourceConfig;
    readonly mode: SyncMode;
    readonly principal?: AclPrincipal;
  }): Promise<IngestionJob> {
    const startedAt = new Date().toISOString();
    const jobId = randomUUID();
    let job: IngestionJob = {
      id: jobId,
      tenantId: input.tenantId,
      sourceId: input.source.id,
      mode: input.mode,
      status: 'running',
      startedAt,
      documentsProcessed: 0,
      chunksCreated: 0,
      errors: [],
    };
    this.jobs.set(jobId, job);

    const syncStarted = Date.now();
    const connector = this.connectors.get(input.source.connectorType);
    if (!connector) {
      this.metrics.recordConnectorFailure();
      job = {
        ...job,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        errors: [`No connector registered for ${input.source.connectorType}`],
      };
      this.jobs.set(jobId, job);
      return job;
    }

    const prev = await this.checkpoints.get(input.tenantId, input.source.id);
    const fingerprintIndex: Record<string, string> = {
      ...(prev?.fingerprintIndex ?? {}),
    };
    const errors: string[] = [];
    let documentsProcessed = 0;
    let chunksCreated = 0;

    try {
      const docs = await connector.listDocuments({
        tenantId: input.tenantId,
        source: input.source,
        ...(prev ? { checkpoint: prev } : {}),
        mode: input.mode,
      });

      for (const raw of docs) {
        try {
          if (raw.deleted) {
            const docId = `${input.tenantId}:${input.source.id}:${raw.externalId}`;
            await this.index.softDelete(input.tenantId, docId);
            await this.vectors.deleteByDocumentId(input.tenantId, docId);
            delete fingerprintIndex[raw.externalId];
            documentsProcessed += 1;
            continue;
          }

          const acl = this.acl.resolve({
            tenantId: input.tenantId,
            source: input.source,
            document: raw,
          });
          const version = (raw.versionHint ?? 1) + (fingerprintIndex[raw.externalId] ? 0 : 0);
          const normalized = this.normalizer.normalize({
            tenantId: input.tenantId,
            source: input.source,
            document: raw,
            acl,
            version: version || 1,
          });

          // Incremental: skip unchanged fingerprints
          if (
            input.mode === 'incremental' &&
            fingerprintIndex[raw.externalId] === normalized.fingerprint
          ) {
            continue;
          }

          // Duplicate detection across fingerprint
          const existingSame = Object.entries(fingerprintIndex).find(
            ([extId, fp]) => extId !== raw.externalId && fp === normalized.fingerprint,
          );
          if (existingSame) {
            errors.push(`Duplicate of ${existingSame[0]} skipped: ${raw.externalId}`);
            continue;
          }

          const meta = this.metadata.extract(normalized);
          const chunks = this.chunker.chunk(normalized, meta);
          const embedStarted = Date.now();
          const vectors = await this.embeddings.embed(chunks.map((c) => c.text));
          this.metrics.recordEmbeddingLatency(Date.now() - embedStarted);

          await this.vectors.upsert(
            chunks.map((chunk, i) => ({
              chunk,
              embedding: vectors[i] ?? [],
              modelId: this.embeddings.modelId,
              dimensions: this.embeddings.dimensions,
            })),
          );
          await this.index.upsert({ document: normalized, metadata: meta, chunks });

          fingerprintIndex[raw.externalId] = normalized.fingerprint;
          documentsProcessed += 1;
          chunksCreated += chunks.length;
          this.metrics.recordDocumentsIndexed(1);
          this.metrics.recordChunksCreated(chunks.length);
        } catch (err) {
          errors.push(
            `Failed ${raw.externalId}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      const checkpoint: SyncCheckpoint = {
        sourceId: input.source.id,
        tenantId: input.tenantId,
        cursor: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        fingerprintIndex,
      };
      await this.checkpoints.save(checkpoint);

      job = {
        ...job,
        status:
          errors.length && documentsProcessed ? 'partial' : errors.length ? 'failed' : 'succeeded',
        finishedAt: new Date().toISOString(),
        documentsProcessed,
        chunksCreated,
        errors,
        checkpoint,
      };
    } catch (err) {
      this.metrics.recordConnectorFailure();
      job = {
        ...job,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        documentsProcessed,
        chunksCreated,
        errors: [...errors, err instanceof Error ? err.message : String(err)],
      };
    }

    this.metrics.recordSyncDuration(Date.now() - syncStarted);
    this.jobs.set(jobId, job);
    return job;
  }
}
