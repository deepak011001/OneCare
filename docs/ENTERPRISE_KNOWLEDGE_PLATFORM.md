# OneCare — Enterprise Knowledge Platform (M6)

**Status:** Living Document — Source of Truth  
**Package:** `@onecare/knowledge-platform`  
**Related:** [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md) · [`DOCUMENT_CONNECTORS.md`](./DOCUMENT_CONNECTORS.md) · [`ACL_MODEL.md`](./ACL_MODEL.md) · [`INGESTION_PIPELINE.md`](./INGESTION_PIPELINE.md) · [`EMBEDDING_STRATEGY.md`](./EMBEDDING_STRATEGY.md) · [`SEARCH_ARCHITECTURE.md`](./SEARCH_ARCHITECTURE.md) · [`CITATION_MODEL.md`](./CITATION_MODEL.md) · [`KNOWLEDGE_OPERATIONS.md`](./KNOWLEDGE_OPERATIONS.md) · [`KNOWLEDGE_CAPABILITY.md`](./KNOWLEDGE_CAPABILITY.md)

---

## 1. Purpose

Production-grade **Enterprise Knowledge Platform** for every current and future OneCare agent (Employee, Manager, HR, Finance, IT, Learning, Recruitment, Legal, Compliance).

Not a chatbot FAQ. Not a vendor SDK embedded in agents.

```
Sources → Connectors → Ingestion → Normalize → Metadata → ACL
  → Chunk → Embed → Vector Store → Hybrid Search → Rerank
  → KnowledgeRetrievalPort → Knowledge Capability → Orchestrator
```

---

## 2. Non-negotiables

- Plugs into existing `KnowledgeRetrievalPort` — **no** Employee Capability / AI Runtime / MCP redesign
- Provider-agnostic: no direct Azure AI Search, Pinecone, pgvector, or OpenAI Embedding SDKs in domain code
- Tenant isolation + ACL on every retrieval
- Citations only from indexed evidence — never hallucinated
- Replaceable layers via ports

---

## 3. Package

`@onecare/knowledge-platform` owns ports + default in-memory / local-hash adapters.

| Layer | Port | Default adapter |
|-------|------|-----------------|
| Connectors | `KnowledgeConnectorPort` | Stubs + local/markdown/pdf/… catalog |
| Ingestion | `IngestionPipelinePort` | `DefaultIngestionPipeline` |
| Normalize | `NormalizerPort` | `DefaultNormalizer` |
| Metadata | `MetadataExtractorPort` | `HeuristicMetadataExtractor` |
| ACL | `AclResolverPort` | `DefaultAclResolver` |
| Chunking | `ChunkerPort` | `ConfigurableChunker` |
| Embeddings | `EmbeddingProviderPort` | `HashEmbeddingProvider` |
| Vector store | `VectorStorePort` | `InMemoryVectorStore` |
| Hybrid search | `HybridSearchPort` | `DefaultHybridSearch` |
| Rerank | `RerankerPort` | `HeuristicReranker` |
| Retrieval | implements `KnowledgeRetrievalPort` | `PlatformKnowledgeRetrieval` |

Config: `KNOWLEDGE_ENGINE=platform|stub`, `KNOWLEDGE_EMBEDDING_PROVIDER`, `KNOWLEDGE_VECTOR_STORE`.

---

## 4. Composition

```ts
const platform = await createEnterpriseKnowledgePlatform({ tenantId });
// Employee / AI inject:
createTenantAwareKnowledgeRetrieval(platform, () => tenantId);
```

---

## 5. Admin APIs

Prefix `/v1/knowledge-platform/*` — permission `knowledge.admin`. Never returns embeddings/vectors.

---

## 6. Success (M6)

✓ Production `KnowledgeRetrievalPort` · connectors · ingestion · normalize · metadata · ACL · chunk · embed · vector · hybrid · rerank · citations · versioning/soft-delete · observability · docs · employee UX unchanged except better answers
