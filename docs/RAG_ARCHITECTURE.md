# OneCare — RAG Architecture

**Related:** [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md)

## Pipeline

1. **Ingest** connector documents (full / incremental / delete)
2. **Normalize** to `NormalizedDocument`
3. **Extract metadata** (keywords, domains, policies, …)
4. **Resolve ACL** (tenant + visibility + groups/roles)
5. **Chunk** (heading / paragraph / sliding window / …)
6. **Embed** via `EmbeddingProviderPort`
7. **Upsert** `VectorStorePort` + document index
8. **Retrieve** hybrid (keyword + metadata + vector) with ACL filter
9. **Rerank** via `RerankerPort`
10. **Map** hits → `KnowledgeDocument` + citations for `KnowledgeRetrievalPort`

## Grounding rule

Answers and citations must come from retrieved chunks only. Empty retrieval → explicit no-source (capability already enforces this).

## Scaling path

In-memory adapters today → swap embedding/vector ports for Azure OpenAI + pgvector / Azure AI Search / Qdrant without changing capability or orchestrator. Future: BullMQ workers, multi-region indexes.
