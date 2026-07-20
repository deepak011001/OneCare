# OneCare — Ingestion Pipeline

**Related:** [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md)

## Modes

`full` | `incremental` | `manual` | `scheduled` | `webhook`

## Behaviors

- Fingerprint per document (sha256 of identity + body + modified)
- Incremental skips unchanged fingerprints
- Duplicate fingerprint across external IDs → skip + error note
- `deleted: true` → soft-delete index + remove vectors
- Checkpoint store persists fingerprint index + cursor
- Job statuses: queued / running / succeeded / failed / partial
- Retries at document level (errors collected; job may be `partial`)
- Future: queue / BullMQ workers without changing `IngestionPipelinePort`

## Observability

Metrics: documents indexed, chunks created, embedding latency, sync duration, connector failures.
