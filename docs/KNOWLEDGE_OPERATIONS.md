# OneCare — Knowledge Operations

**Related:** [`OPERATIONS.md`](./OPERATIONS.md) · [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md)

## Runtime

| Item | Value |
|------|--------|
| Engine | `KNOWLEDGE_ENGINE=platform` (default) |
| Fallback | `stub` → in-memory stub store |
| Embeddings | `KNOWLEDGE_EMBEDDING_PROVIDER` |
| Vector | `KNOWLEDGE_VECTOR_STORE` |

## Admin APIs

| Method | Path |
|--------|------|
| GET | `/v1/knowledge-platform/connectors` |
| GET/PUT | `/v1/knowledge-platform/sources` |
| POST | `/v1/knowledge-platform/sync` |
| GET | `/v1/knowledge-platform/jobs` · `/jobs/:id` |
| GET | `/v1/knowledge-platform/documents` |
| GET | `/v1/knowledge-platform/diagnostics/search?q=` |
| GET | `/v1/knowledge-platform/index/health` |

Permission: `knowledge.admin`.

## Knowledge Admin Portal (M6.8)

CMS-style admin APIs under `/v1/admin/knowledge/*` (library, documents, publishing, playground, analytics). See [`KNOWLEDGE_ADMINISTRATION.md`](./KNOWLEDGE_ADMINISTRATION.md).

## Admin UI

`/knowledge` workspace — dashboard, library, documents, collections, categories, tags, approvals, playground, analytics, diagnostics, settings, plus platform sources/connectors/sync/index-health.

## Playbooks

| Symptom | Check |
|---------|--------|
| Empty answers | index health, tenant seed, ACL, sync jobs |
| Stale answers | incremental sync, checkpoint, fingerprint |
| Connector errors | connector list, job errors, secretRef |
