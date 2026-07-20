# OneCare — Embedding Strategy

**Related:** [`RAG_ARCHITECTURE.md`](./RAG_ARCHITECTURE.md)

## Port

`EmbeddingProviderPort`: `providerId`, `modelId`, `dimensions`, `embed(texts[])`.

## M6 default

`HashEmbeddingProvider` (`local-hash`) — deterministic local vectors for tests and offline demos.

## Future providers (config only)

`azure-openai` · `openai` · `vertex` · `bedrock` · `huggingface` · local models

Env: `KNOWLEDGE_EMBEDDING_PROVIDER`. Implement adapter; inject into platform composition root. Retrieval must not import vendor SDKs.
