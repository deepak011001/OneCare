# OneCare — Search Architecture

**Related:** [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md) · [`ACL_MODEL.md`](./ACL_MODEL.md)

## Hybrid search

`DefaultHybridSearch` combines:

1. Keyword / title scoring
2. Metadata topic/keyword boosts
3. Recency + popularity
4. Vector similarity (`VectorStorePort.search`) with ACL
5. Pluggable `RerankerPort` (authority, department, quality)

Diagnostics (admin): keywordHits, vectorHits, metadataHits, afterAcl, afterRerank, tookMs.

## Vector stores

Port: `VectorStorePort`. Default `memory`. Config `KNOWLEDGE_VECTOR_STORE` prepares pgvector / Azure AI Search / Elastic / Qdrant / Milvus / Pinecone / Weaviate adapters.
