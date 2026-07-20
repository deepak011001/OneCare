# OneCare — Citation Model

**Related:** [`KNOWLEDGE_CAPABILITY.md`](./KNOWLEDGE_CAPABILITY.md)

## Citation fields

- documentId, title, section?, chunkId?
- sourceSystem, lastUpdated?, url?
- confidence (from retrieval score — never fabricated)

## Rules

- Only emit citations for retrieved hits
- Empty retrieval → no sources (capability says so)
- Admin diagnostics may show citation objects; employee APIs expose attribution via existing answer contract
- Never expose raw embeddings
