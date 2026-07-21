# OneCare — Enterprise Knowledge Administration (M6.8)

**Status:** Living Document — Source of Truth  
**Package:** `@onecare/knowledge-admin`  
**Admin app:** `apps/admin` Knowledge Workspace  
**APIs:** `/v1/admin/knowledge/*`  
**Related:** [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md) · [`KNOWLEDGE_OPERATIONS.md`](./KNOWLEDGE_OPERATIONS.md) · [`ACL_MODEL.md`](./ACL_MODEL.md) · [`SECURITY.md`](./SECURITY.md)

---

## 1. Purpose

HR / Knowledge administrators manage the **entire enterprise knowledge base through UI** — no developer required for day-to-day content updates.

This milestone is **Admin UX + Knowledge Operations**. It does **not** redesign:

- AI Runtime · Agent Framework · Employee Capability Framework  
- Enterprise Knowledge Platform · KnowledgeRetrievalPort · MCP  

```
Admin Portal (apps/admin)
  → KnowledgeAdminService (@onecare/knowledge-admin)
  → (publish) Knowledge Platform ingestion / retrieval
  → Employee Agent answers via KnowledgeRetrievalPort
```

---

## 2. Architecture

| Layer | Responsibility |
|-------|----------------|
| `apps/admin` Knowledge Workspace | UI: library, documents, approvals, playground, analytics |
| `@onecare/knowledge-admin` | Domain + application: folders, docs, versions, publish, ACL metadata, playground |
| `apps/api` `KnowledgeAdminModule` | REST `/v1/admin/knowledge`, RBAC `knowledge.admin` |
| `@onecare/knowledge-platform` | Unchanged retrieval / connectors / index (sources, sync, diagnostics) |

Persistence today: **tenant-scoped in-memory store** (swap to Prisma later without changing service API).

---

## 3. Admin routes (UI)

| Path | Purpose |
|------|---------|
| `/knowledge` | Dashboard |
| `/knowledge/library` | Nested folders |
| `/knowledge/documents` | Author / draft / review / publish |
| `/knowledge/collections` | Document groups |
| `/knowledge/categories` · `/tags` | Taxonomy |
| `/knowledge/approvals` | Review queue |
| `/knowledge/versions` | Version timeline |
| `/knowledge/playground` | Draft-only AI preview |
| `/knowledge/analytics` | Coverage metrics |
| `/knowledge/diagnostics` | Health + duplicates |
| `/knowledge/uploads` | Upload pipeline (binary adapters next) |
| `/knowledge/settings` | Limits / approval gate |
| `/knowledge/sources` · connectors · sync-jobs · index-health | Platform ops |

---

## 4. REST APIs

Prefix: `/v1/admin/knowledge`  
Permission: `knowledge.admin`  
Tenant: from auth context only.

| Area | Methods |
|------|---------|
| Dashboard / health / analytics | `GET /dashboard` · `/health` · `/analytics` |
| Folders | `GET/POST /folders` · `PATCH/DELETE /folders/:id` |
| Documents | `GET/POST /documents` · `PATCH /documents/:id` · publish/archive/restore/approve-request |
| Categories / tags / collections | CRUD under `/categories` · `/tags` · `/collections` |
| Approvals | `GET /approvals` · `POST /approvals/:id/decide` |
| Playground | `POST /playground` `{ question, scope: draft\|published }` |
| Diagnostics | `GET /diagnostics/duplicates` |
| Settings | `GET/PUT /settings` |

Platform connector/source APIs remain under `/v1/knowledge-platform/*`.

---

## 5. Publishing workflow

```
Draft → Review → Approved → Published → Archived | Expired
```

- Edits create **new versions** with fingerprint + audit fields  
- `requireApproval` (settings) blocks direct publish from draft  
- **AI Playground** answers from **draft/review/approved** only when `scope=draft` — never invents policy  

---

## 6. Security

- RBAC: `knowledge.admin`  
- Tenant isolation on every store mutation  
- No embeddings/vectors returned to UI  
- Secrets stay in `secretRef` / env (connectors)  

---

## 7. Future enhancements

- Prisma persistence + binary upload → connector ingestion  
- TipTap / collaborative rich editor, OCR, virus scan  
- Employee search replay, multi-level approval graph, ABAC UI  
- Live SharePoint/Confluence credential reconnect UX  

See also: [`KNOWLEDGE_LIBRARY.md`](./KNOWLEDGE_LIBRARY.md) · [`DOCUMENT_MANAGEMENT.md`](./DOCUMENT_MANAGEMENT.md) · [`PUBLISHING_WORKFLOW.md`](./PUBLISHING_WORKFLOW.md) · [`AI_PLAYGROUND.md`](./AI_PLAYGROUND.md) · [`KNOWLEDGE_ANALYTICS.md`](./KNOWLEDGE_ANALYTICS.md)
