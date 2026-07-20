# OneCare — System Architecture

**Status:** Living Document — Source of Truth  
**Principles:** Clean Architecture, DDD, EDA, Repository Pattern, DI, Feature-based modules, microservice-ready boundaries

---

## 1. Why This Architecture

| Decision | Rationale |
|----------|-----------|
| Clean Architecture | Business rules independent of NestJS/Next/Prisma; testable; replaceable infra |
| Feature modules | Each domain (ESS, Payroll, …) can later become its own service |
| MCP for integrations | Tools as contracts; swap Keka/SAP without rewriting agents |
| Multi-agent (not monolith) | Domain expertise, blast-radius isolation, independent scaling & eval |
| Event-driven side effects | Notifications, analytics, audit fan-out without coupling |
| NestJS + Next.js | Enterprise DI/modules on backend; modern UX on frontend |
| PostgreSQL + pgvector + Redis + BullMQ | System of record + RAG + cache/sessions + durable jobs |

**Tradeoff accepted:** Slightly more boilerplate early vs. demo speed — required for enterprise scale.

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Presentation   Next.js UI · Admin · Chat · BFF (thin)  │
├─────────────────────────────────────────────────────────┤
│  Application    Use cases · DTOs · Orchestration ports  │
├─────────────────────────────────────────────────────────┤
│  Domain         Entities · Value Objects · Domain Events│
│                 Policies · Agent contracts (ports)      │
├─────────────────────────────────────────────────────────┤
│  Infrastructure Prisma · Redis · BullMQ · Entra · LLM   │
│                 MCP clients · Object storage · Telemetry │
├─────────────────────────────────────────────────────────┤
│  Integrations   MCP Servers · Webhooks · Bus adapters   │
├─────────────────────────────────────────────────────────┤
│  External       Keka · Graph · ServiceNow · SharePoint… │
└─────────────────────────────────────────────────────────┘
```

**Rules:**

- Controllers / route handlers contain **no** business logic.
- Domain has **no** imports from Nest/Prisma/OpenAI SDKs.
- Application depends on **ports** (interfaces); Infrastructure implements them.
- Features communicate via application services, domain events, or message bus — not cross-reaching into another feature’s tables.

---

## 3. Logical Runtime Topology

```
                    ┌──────────────┐
   Browser ────────▶│  Next.js Web │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
                    │  API Gateway │  (NestJS HTTP + WS)
                    │  AuthN/Z     │
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ App Modules│  │ Agent Worker│  │ Job Workers│
    │ (use cases)│  │ (LangGraph) │  │ (BullMQ)   │
    └─────┬──────┘  └──────┬─────┘  └──────┬─────┘
          │                │               │
          ▼                ▼               ▼
    PostgreSQL (+pgvector)   Redis      MCP Servers
```

Workers may co-locate initially; process boundaries must stay **clear** so they can split without rewriting domain code.

---

## 4. Repository Structure (Canonical)

```
onecare/
├── apps/
│   ├── web/                 # Employee/manager product UI (Next.js)
│   ├── admin/               # Tenant admin portal (Next.js) — separate deploy surface
│   ├── api/                 # Core HTTP/WS API (NestJS)
│   ├── mcp-gateway/         # MCP client gateway (secrets + allowlists boundary)
│   └── workers/             # BullMQ + agent/ingestion/workflow timers
├── packages/
│   ├── ui/
│   ├── shared/              # Branded IDs, Result, errors, RequestContext
│   ├── auth/                # AuthN/Z contracts (RBAC/ABAC, OIDC/session ports)
│   ├── database/            # Prisma schema & DB ports
│   ├── security/            # Crypto, CSRF helpers, MFA extension ports
│   ├── cache/               # CachePort / Redis session cache contracts
│   ├── events/              # Domain event bus (in-process; Kafka later)
│   ├── ai/                  # LLM providers, orchestrator, agent registry, streaming
│   ├── conversations/       # Conversation / message entities & store ports
│   ├── prompts/             # Versioned prompt templates & rendering
│   ├── memory/              # Conversation / user / session / agent memory ports
│   ├── planner/             # Execution plan abstraction (single/multi-agent)
│   ├── tools/               # Tool registry (interfaces + placeholders)
│   ├── mcp/                 # MCP gateway, connector registry, resilience
│   ├── connector-sdk/       # Connector contract (auth, tools, lifecycle)
│   ├── connectors/          # Vendor connectors (Keka, …)
│   ├── policies/            # Execution policies (RBAC, confirmation, rate limits)
│   ├── confirmations/       # Confirmation tokens / store
│   ├── workflows/           # Workflow engine ports
│   ├── integrations/        # Connector registry ports
│   ├── telemetry/           # Structured logging, PII redaction, OTel hooks
│   └── config/              # Zod-validated environment config
├── docs/                    # Architecture source of truth
├── infra/                   # Cloud / IaC
├── docker/                  # Local compose & Dockerfiles
├── scripts/                 # Developer & CI scripts
├── tests/                   # Cross-cutting e2e / contract suites
├── .cursor/rules/           # Cursor enforcement (points to docs)
├── .github/workflows/
└── README.md
```

**Why this shape**

| Choice | Rationale |
|--------|-----------|
| Separate `admin` app | Different auth surface, bundle, and blast radius from employee chat UI |
| Separate `mcp-gateway` | Credentials and tool allowlists never sit inside the LLM worker process |
| `workers` app | Horizontal scale for jobs/agents without scaling the API |
| Shared `packages/*` | Microservice-ready libraries; apps stay thin composition roots |

MCP **servers** (per vendor) live under `packages/` or a future `mcp-servers/` workspace as connectors mature — agents always talk to them through `apps/mcp-gateway`.

**Feature folder (inside `apps/api`):**

```
src/
├── modules/
│   ├── identity/
│   ├── tenancy/
│   ├── chat/
│   ├── agents/
│   ├── knowledge/
│   ├── workflows/
│   ├── notifications/
│   ├── admin/
│   └── ess-leave/           # example domain feature
│       ├── presentation/    # controllers, DTOs
│       ├── application/     # use cases
│       ├── domain/          # entities, ports
│       └── infrastructure/  # prisma repos, mcp adapters
├── shared/
└── main.ts
```

Each module must be extractable: own Nest module, own DB schema namespace/tables, own events.

---

## 5. Cross-Cutting Concerns

| Concern | Approach |
|---------|----------|
| AuthN | Entra OIDC → JWT + Redis session |
| AuthZ | RBAC + ABAC policy engine (central) |
| Tenancy | `tenant_id` on rows; middleware sets TenantContext |
| Config | Env + DB feature flags; Zod-validated at boot |
| Validation | DTO validation at edges; domain invariants inside |
| Errors | Typed domain/application errors → problem+json |
| Events | Outbox pattern for reliable domain event publish |
| Idempotency | Idempotency keys on mutating APIs & tool calls |

---

## 6. Request Flows

### 6.1 Chat → Agent → Tool

```
User message
  → API (auth, tenant, rate limit)
  → Chat Application (persist message)
  → Orchestrator Agent (plan)
  → Domain Agent (ESS/IT/…)
  → Policy check (RBAC/ABAC + confirmation)
  → MCP Tool invocation
  → Persist tool result + audit + cost
  → Stream response to client
  → Emit domain events (Notification, Analytics)
```

### 6.2 Knowledge Query

```
User question
  → Knowledge Agent
  → Embed query
  → Vector search WITH ACL filters
  → Rerank / ground
  → Answer + citations
  → Audit retrieval set (doc IDs only; no raw PII leakage)
```

---

## 7. Multi-Tenancy Model

- **Shared application**, **isolated data** (row-level tenancy).
- Optional later: schema-per-tenant or DB-per-tenant for regulated customers.
- All queries go through tenant-scoped repositories; never accept `tenant_id` from client body without verifying against session.

---

## 8. Microservice Extraction Path

When a module outgrows the monolith:

1. Extract module’s DB tables / schema  
2. Replace in-process port with HTTP/gRPC or message bus adapter  
3. Keep domain + application packages stable  
4. MCP servers already independent — no change  

Do **not** premature-split before M8 metrics justify it.

---

## 9. Technology Mapping

| Layer | Tech |
|-------|------|
| Web | Next.js, React, TypeScript, Tailwind, Shadcn, React Query, Zustand |
| API | NestJS, TypeScript |
| ORM | Prisma |
| DB | PostgreSQL + pgvector |
| Cache / sessions / queues | Redis + BullMQ |
| Realtime | WebSockets (Nest gateway) |
| AI | OpenAI, LangGraph, LangChain, MCP, RAG |
| Auth | Entra ID, OAuth2, OIDC, JWT |
| Deploy | Docker, Azure, GitHub Actions |

---

## 10. Potential Issues & Mitigations

| Issue | Mitigation |
|-------|------------|
| Chatty agent ↔ tool loops | Max steps, budgets, plan validation |
| Distributed complexity early | Modular monolith first |
| Prisma coupling | Repositories hide Prisma; no Prisma in Domain |
| Frontend BFF bloat | Keep Next server actions thin; prefer API use cases |
| Event dual-write | Transactional outbox |

---

## 11. Architecture Decision Records (ADRs)

Store ADRs under `docs/adr/` as decisions harden. Required ADRs before M3:

- ADR-001: NestJS modular monolith  
- ADR-002: LangGraph as agent runtime  
- ADR-003: MCP as integration contract  
- ADR-004: Row-level multi-tenancy  

---

## 12. Related Documents

`AI_AGENTS.md` · `MCP.md` · `DATABASE.md` · `INTEGRATIONS.md` · `WORKFLOWS.md` · `SECURITY.md` · `API_STANDARDS.md`
