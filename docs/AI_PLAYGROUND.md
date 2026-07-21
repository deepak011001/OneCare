# AI Playground

Admin validates employee questions against **draft** (or published) content before go-live.

Returns answer, confidence, latency, citations, retrieved chunks, diagnostics. Never invents when no hit.

API: `POST /v1/admin/knowledge/playground`  
UI: `/knowledge/playground`  
Contract: [`KNOWLEDGE_ADMINISTRATION.md`](./KNOWLEDGE_ADMINISTRATION.md)
