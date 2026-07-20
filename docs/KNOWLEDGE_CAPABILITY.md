# OneCare — Knowledge Capability

**Status:** Living Document — Source of Truth for Employee Knowledge (M5 Slice 3)  
**Package:** `@onecare/ess-knowledge`  
**Capability ID:** `ess.knowledge`  
**Related:** [`EMPLOYEE_CAPABILITY_FRAMEWORK.md`](./EMPLOYEE_CAPABILITY_FRAMEWORK.md) · [`EMPLOYEE_AGENT.md`](./EMPLOYEE_AGENT.md) · [`AI_AGENTS.md`](./AI_AGENTS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`ROADMAP.md`](./ROADMAP.md) · [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md)

---

## 1. Purpose

The **Knowledge Capability** is the intelligent knowledge layer of OneCare for employees.

It is **not** a simple FAQ chatbot. Production retrieval is provided by the **Enterprise Knowledge Platform** (M6) behind `KnowledgeRetrievalPort`.

Employees ask naturally. The capability:

- Classifies hierarchical domains/categories (not hundreds of hardcoded intents)
- Parses multi-question prompts
- Retrieves via a **replaceable retrieval abstraction**
- Returns structured answers with **source attribution**
- Supports follow-ups and selective clarification
- Consumes `@onecare/knowledge-platform` without coupling to any vector vendor SDK

```
User → Master Orchestrator → Employee Agent
         → Capability Registry → ess.knowledge
              → KnowledgeRetrievalPort
                   → Enterprise Knowledge Platform (default)
                   → StubKnowledgeStore (KNOWLEDGE_ENGINE=stub)
```

---

## 2. Non-goals (capability package)

Do **not** put vendor SDKs or ingestion workers inside `@onecare/ess-knowledge`.

Platform concerns (connectors, embeddings, vector DBs) live in `@onecare/knowledge-platform` — see [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md).

---

## 3. Package layout

| Path | Role |
|------|------|
| `packages/ess-knowledge/src/capability.ts` | `EmployeeCapability` + `process()` |
| `packages/ess-knowledge/src/intents.ts` | Hierarchical classification, multi-question split |
| `packages/ess-knowledge/src/taxonomy.ts` | HR / IT / Finance / Company / Learning / Recruitment / General |
| `packages/ess-knowledge/src/retrieval/` | `KnowledgeRetrievalPort`, stub store + seed corpus |
| `packages/ess-knowledge/src/answer.ts` | Structured answers + attribution |
| `packages/ess-knowledge/src/popular.ts` | Trending / most viewed / recently updated |
| `apps/api/src/modules/knowledge/` | HTTP APIs over the same abstraction |
| `apps/web/.../employee/knowledge` | Dashboard widgets + help |

---

## 4. Intent model

Stable intents (few):

| Intent | Meaning |
|--------|---------|
| `employee.knowledge.ask` | Answer one or more knowledge questions |
| `employee.knowledge.search` | Explicit search |
| `employee.knowledge.related` | Related policies / documents |
| `employee.knowledge.popular` | Trending / most viewed |
| `employee.knowledge.help` | Topics, tips, limitations |
| `employee.knowledge.categories` | Browse taxonomy |

Classification adds slots: `domain`, `category`, `topic`, entities (`country`, `benefit`, `policyName`, …).

Domains plug in via `KNOWLEDGE_TAXONOMY` — do not explode the intent catalog.

---

## 5. Retrieval abstraction

```ts
interface KnowledgeRetrievalPort {
  engineId: string;
  search(query): Promise<KnowledgeSearchResult>;
  getById(id): Promise<KnowledgeDocument | null>;
  listRelated(id, limit?): Promise<KnowledgeDocument[]>;
  listPopular?(limit?): Promise<KnowledgeDocument[]>;
  listCategories?(): Promise<{ domain; category; count }[]>;
}
```

**Current default:** Enterprise Knowledge Platform via API composition.  
**Fallback:** `StubKnowledgeStore` when `KNOWLEDGE_ENGINE=stub`.  
**Adapters:** Azure AI Search, pgvector, Elastic, SharePoint, etc. implement platform ports — capability stays unchanged.

---

## 6. Answer contract

Every answer includes:

- Text / summary / bullets / steps (as appropriate)
- Source document, section, last updated (when known), document type, confidence
- Related documents / topics / suggested follow-ups
- Explicit “no documented source” when retrieval returns nothing — **never invent sources**

---

## 7. APIs

| Method | Path | Permission |
|--------|------|------------|
| GET | `/v1/knowledge/dashboard` | `knowledge.search` |
| GET | `/v1/knowledge/search?q=` | `knowledge.search` |
| POST | `/v1/knowledge/ask` | `knowledge.search` |
| GET | `/v1/knowledge/popular` | `knowledge.search` |
| GET | `/v1/knowledge/categories` | `knowledge.search` |
| GET | `/v1/knowledge/help` | `knowledge.search` |
| GET | `/v1/knowledge/documents/:id` | `knowledge.search` |

Storage engine is not exposed to clients.

---

## 8. Dashboard widgets

- Popular Policies
- Recent Searches (stub session list)
- Company Announcements (stub)
- Quick Links
- Knowledge Categories
- Frequently Asked Questions

---

## 9. Registration

```ts
createEmployeeCapabilityRegistry(undefined, [createKnowledgeCapability()]);
```

Planner routes `employee.knowledge.*`. Orchestrator runs `KnowledgeCapability.process()` with conversation memory key `knowledge.slots` for follow-ups.

---

## 10. Enterprise Knowledge Platform (M6)

Production retrieval is `@onecare/knowledge-platform` implementing `KnowledgeRetrievalPort`. See [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md).

Follow-ups: live SharePoint connector, pgvector/Azure AI Search adapters, BullMQ workers, richer citation UI.

---

## 11. Success criteria (Slice 3)

- [x] Implements `EmployeeCapability` and registers
- [x] Hierarchical classification + multi-intent parsing
- [x] Retrieval abstraction + stub store
- [x] Source attribution + related docs
- [x] Dashboard widgets + suggested prompts + help
- [x] AI Runtime / MCP architectures unchanged
- [x] Typecheck / lint / tests green (gate before merge)
