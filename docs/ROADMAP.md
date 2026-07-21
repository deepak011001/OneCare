# OneCare — Product Roadmap

**Status:** Living Document — Source of Truth  
**Principle:** Never generate everything at once. Each milestone must compile, deploy, and be production-ready for its scope.

---

## 1. Delivery Principles

1. **Milestone = shippable** — builds, tests, migrations, docs for that slice.
2. **Vertical slices** — prefer end-to-end thin paths over horizontal stubs.
3. **Architecture before features** — foundations (auth, tenancy, observability) early.
4. **Agents last-mile** — MCP + domain contracts before fancy multi-agent demos.
5. **No demo architecture** — every milestone uses production patterns.

---

## 2. Milestone Map

```
M0 Foundations
 → M1 Identity & Tenancy
 → M2 Platform Shell (API + Web)
 → M3 Agent Runtime + Orchestrator
 → M4 Enterprise MCP Platform
 → M5 Employee Agent (Leave first) → Attendance / Payroll later
 → M6 Knowledge / RAG
 → M7 Workflows & Approvals (MSS)
 → M8 Admin Portal
 → M9 Observability & Hardening
 → M10 Additional Domains, Scale & Packaging
```

---

## 3. Milestone Details

### M0 — Repository Foundations

**Outcome:** Monorepo (or polyrepo contract) ready for enterprise development.

- `/docs` complete (this pack)
- `.cursor/rules` enforcing docs
- Monorepo scaffold: `apps/*`, `packages/*`, `infra`, `docker`, `scripts`, `tests`
- ESLint, Prettier, TypeScript strict
- Docker Compose: PostgreSQL (pgvector) + Redis
- CI skeleton (GitHub Actions): lint, typecheck, test
- ADR template / changelog convention

**Exit criteria:** `docs` + tooling mergeable; apps/packages scaffolded and typecheck clean.

---

### M1 — Identity, Tenancy, Security Baseline

**Outcome:** Authenticated multi-tenant control plane.

- Entra ID OIDC login (`AUTH_MODE=entra`) + development login (`AUTH_MODE=development`, non-production only)
- JWT access tokens + refresh rotation/revocation (Postgres + Redis session cache)
- Tenant / Organization / Department / User models with `tenant_id` isolation
- RBAC roles seeded (Employee → Super Admin) with string permissions
- ABAC attribute hooks (`user_attributes`) + MFA port extension point
- Structured audit logs + in-process domain events
- Security middleware: Helmet, CORS, rate limiting, CSRF strategy, correlation IDs, exception filter
- Secrets via env / Key Vault pattern (no hardcoded secrets)

**Exit criteria:** Login → tenant-scoped “whoami” API; audit on auth events; typecheck/lint/tests green.

**Status:** Implemented in codebase (apply migration + seed when Docker/Postgres available).

---

### M2 — Platform Shell

**Outcome:** Usable product shell without full AI.

- Next.js app shell: Landing, Login, Dashboard, Settings, permission-aware navigation
- React Query + Zustand (auth/ui only)
- Tailwind + shadcn-style primitives; light/dark/system theme
- Typed API client with Bearer auth + refresh retry against M1 `/v1` APIs
- Placeholder routes for AI / ESS / MSS / Knowledge / Admin (no business logic)
- Accessibility baseline + error pages (401/403/404/500/offline/maintenance)

**Exit criteria:** Authenticated user navigates shell routes; dashboard loads `/v1/auth/me` + `/v1/tenants/current`.

**Status:** Implemented in `apps/web`.

---

### M3 — Agent Runtime + Master Orchestrator

**Outcome:** Multi-agent platform that plans and routes (tools mocked OK).

- Agent registry (config-driven) with placeholder domain agents
- Master Orchestrator: intent → plan → domain agent → mock LLM stream
- Provider-independent LLM ports (Mock executes; OpenAI/Azure/Anthropic stubs)
- Conversation + user/session/agent memory ports (in-memory adapters)
- Prompt versioning framework (templates, variables, validation)
- Tool registry interfaces (placeholders only — no MCP/business implementations)
- Streaming abstractions (SSE now; WebSocket-shaped controller reserved)
- Cost/latency/token observation hooks (in-memory)
- Web `/app/ai` chat workspace with mock streaming

**Exit criteria:** Chat returns a plan + mock streamed response with audit/events; typecheck/lint/tests green.

**Status:** Implemented in codebase (M3). Postgres-backed conversation persistence and LangGraph wiring deferred to keep runtime provider-agnostic without vendor lock-in in Domain.

---

### M4 — Enterprise MCP Platform & Connector Framework

**Outcome:** Production MCP gateway, connector SDK, Keka leave tools, confirmation + policy engine.

- `@onecare/connector-sdk`, `@onecare/connectors`, `@onecare/policies`, `@onecare/confirmations`
- MCP gateway: registry, discovery, execute, retry, circuit breaker, telemetry
- Keka connector (stub + optional REST): `leaveBalance`, `applyLeave`, `cancelLeave`, `leaveHistory`
- API: `/v1/mcp/*`; AI tool registry wired to gateway; confirmation UX in `/app/ai`

**Exit criteria:** Tool execution E2E for leave reads; write tools gated by confirmation; lint/typecheck/tests green.

**Status:** Implemented in codebase (M4 integration platform slice).

---

### M4 (legacy doc) — First Domain Slice: Leave via MCP

**Outcome:** Real business value — apply/balance leave.

- ESS Agent (leave intents)
- MCP Leave server (Keka or stub with identical contract)
- Tools: `applyLeave`, `cancelLeave`, `leaveBalance`
- Confirmation UX for apply/cancel
- Notifications (in-app + email optional)
- Integration tests against MCP contract

**Exit criteria:** Employee can check balance and apply leave end-to-end in a tenant.

**Note:** ESS leave UI and multi-turn capability delivered in M5 Slice 1 (`@onecare/ess-leave`).

### M5 — Employee Agent (ESS Leave Capability)

**Outcome:** Production Employee Agent leave capability on top of M3 runtime + M4 MCP — no architecture rewrite.

- `@onecare/ess-leave`: intents, relative dates, entities, validation, clarification, confirmation summaries
- Tools via Tool Registry → MCP → Keka: `leaveBalance`, `leaveHistory`, `applyLeave`, `cancelLeave`, `leaveTypes`, `holidayCalendar`
- Leave dashboard APIs + web widgets / history / holidays
- Chat: multi-turn clarify, confirmation cards, suggested replies
- Contract: [`EMPLOYEE_AGENT.md`](./EMPLOYEE_AGENT.md)

**Exit criteria:** Employee can check balance, clarify apply/cancel, confirm writes, and see leave widgets; lint/typecheck/tests green.

**Status:** Slice 1 (Leave) + Framework + Attendance + Slice 3 (Knowledge) + Slice 4 (Cross Capability Orchestration) on M5 release line.

### M5 Slice 3 — Employee Knowledge Capability

**Outcome:** Enterprise knowledge intelligence on the Employee Capability Framework — **not** production RAG.

- `@onecare/ess-knowledge`: hierarchical classification, multi-intent, entities, clarification, structured answers + attribution
- `KnowledgeRetrievalPort` + stub store (markdown/JSON/memory); swappable for M6 engines
- APIs `/v1/knowledge/*`, dashboard widgets, help system
- Contract: [`KNOWLEDGE_CAPABILITY.md`](./KNOWLEDGE_CAPABILITY.md)

**Exit criteria:** Natural-language policy/how-to questions answer with sources (or explicit no-source); follow-ups and multi-question prompts work; lint/typecheck/tests green.

### M5 Slice 4 — Cross Capability Orchestration

**Outcome:** One AI that coordinates unlimited ESS capabilities in a single conversation.

- `@onecare/ess-orchestration`: intent split, registry selection, execution graph, merged clarify/confirm/respond
- Master Orchestrator bridge; admin diagnostics `GET /v1/ai/orchestration/diagnostics`
- Chat progress + merged confirmation UX (no capability leakage)
- Contract: [`CROSS_CAPABILITY_ORCHESTRATION.md`](./CROSS_CAPABILITY_ORCHESTRATION.md)

**Exit criteria:** Multi-intent leave+attendance+knowledge turns work with parallel reads, sequential writes, partial failure, and merged responses; framework/MCP/planner unchanged; lint/typecheck/tests green.

### M5.5 — Production Readiness & Platform Hardening

**Outcome:** Enterprise-grade reliability/security/ops **without** new business capabilities.

- Health live/ready/dependencies; structured logs + PII redaction; Problem Details errors  
- Shared retry/circuit/bulkhead; connector timeouts; feature flags + kill switches  
- Conversation persistence schema + store port; AI prompt/safety/token hooks  
- CI gates expanded; docs: PRODUCTION_READINESS, OPERATIONS, OBSERVABILITY, TESTING_STRATEGY, FEATURE_FLAGS, PROMPT_MANAGEMENT  
- Contract: [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md)

**Exit criteria:** Typecheck/lint/tests green; no Employee feature regressions; production env validation rejects unsafe defaults.

---

### M6 — Knowledge Platform (Enterprise RAG)

**Outcome:** Permission-aware answers with citations via production `KnowledgeRetrievalPort`.

**Status:** Implemented on main line (`@onecare/knowledge-platform`).

- Connector abstraction (SharePoint/Confluence/Drive/Notion stubs + local file types)
- Ingestion (full/incremental/manual, fingerprint, soft-delete, checkpoints)
- Normalize · metadata · ACL · chunk · embed · vector · hybrid · rerank
- Admin APIs `/v1/knowledge-platform/*` + admin shell pages
- Docs: ENTERPRISE_KNOWLEDGE_PLATFORM + RAG/ACL/ingestion/search/citation/ops
- Contract: [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md)

**Exit criteria:** “What is our travel/leave policy?” returns grounded answers from permitted docs; typecheck/lint/tests green; Employee Agent / AI Runtime / MCP unchanged in design.

**Follow-ups:** Live SharePoint connector, pgvector/Azure AI Search adapters, BullMQ sync workers, citation chips in chat UI.

### M6.5 — Enterprise Agent Framework

**Outcome:** Reusable agent foundation; Employee Agent migrated; future agents onboard with minimal code.

**Status:** Implemented (`@onecare/agent-framework`).

- Agent model, registry, lifecycle, context, memory, handoff, collaboration, approval abstractions
- Employee Agent registered via framework; AI Runtime catalog projected from framework
- Admin APIs `/v1/agents*` + admin shell pages
- Docs: AGENT_FRAMEWORK, AGENT_LIFECYCLE, AGENT_REGISTRY, AGENT_CONTEXT, AGENT_HANDOFFS
- Contract: [`AGENT_FRAMEWORK.md`](./AGENT_FRAMEWORK.md)

**Exit criteria:** Employee behavior unchanged; lint/typecheck/tests green; AI Runtime / MCP / Knowledge / Capability Framework / Orchestration not redesigned.

### M6.6 — Platform Validation, QA, UX & Production Verification

**Outcome:** ESS production-ready validation before MSS — audit, fix polish issues, expand regression tests, document Pass/Warning/Fail. **No new business capabilities; no redesign.**

**Status:** Complete — see [`PLATFORM_VALIDATION.md`](./PLATFORM_VALIDATION.md).

- Full platform audit (architecture, packages, security, UX, AI/RAG, MCP, prod readiness)
- Prompt grounding (`orchestrator.system` 1.1.0, `agent.employee.system`)
- Knowledge Sources in assistant text; ESS suggested prompts
- Expanded conversation / ACL / routing / prompt tests
- Prioritized Critical/High/Medium/Low fix list for MSS prep

**Exit criteria:** Feature matrix documented; typecheck/lint/tests green; Employee capabilities + cross-orchestration + grounded knowledge validated; MSS unblocked with known High warnings accepted.

### M6.8 — Enterprise Knowledge Administration Portal

**Outcome:** HR admins manage knowledge through UI — library, documents, taxonomy, approvals, versions, AI playground, analytics — without redesigning Knowledge Platform / AI Runtime.

**Status:** Implemented (`@onecare/knowledge-admin` + `/v1/admin/knowledge` + admin Knowledge Workspace).

- Nested folders, documents, categories, tags, collections
- Draft → review → approve → publish + version history
- Draft-scoped AI playground (no invented answers)
- Analytics / health / duplicate diagnostics
- Docs: KNOWLEDGE_ADMINISTRATION + library/document/publishing/playground/analytics

**Exit criteria:** Admin can author and publish knowledge via UI; playground validates drafts; lint/typecheck/tests green; Knowledge Platform retrieval unchanged.

---

### M7 — Workflows & Manager Approvals

**Outcome:** Human-in-the-loop enterprise workflows.

- Workflow engine (state machine; durable)
- MSS Agent: approve/reject leave
- Approval inbox UI
- SLA / reminder jobs
- ABAC: manager-of relationship enforced

**Exit criteria:** Manager approves leave via chat and via inbox; employee notified.

---

### M8 — Admin Portal

**Outcome:** Tenant operators can configure without deploys.

- Users / roles / permissions UI
- Agents enablement + model settings
- MCP server registration + health
- Knowledge sources
- Prompt versions
- Feature flags
- Cost dashboard (basic)
- Audit log viewer

**Exit criteria:** Admin can disable an agent and register an MCP server live.

---

### M9 — Observability & Hardening

**Outcome:** Production operations readiness.

- OpenTelemetry traces across API → agent → tool
- Metrics: latency, errors, tokens, cost
- Circuit breaker + retry policies
- Rate limiting, CSRF, security headers
- PII masking in logs
- Prompt injection defenses
- Chaos / failure playbooks (docs)

**Exit criteria:** Dashboards + alerts defined; security checklist signed off for beta.

---

### M10 — Domain Expansion, Scale & Packaging

**Priority order (adjust per customer):**

1. Payroll (payslip download)  
2. Attendance (clock in/out)  
3. IT Helpdesk (create ticket, reset password)  
4. Microsoft Graph (mail/calendar/Teams)  
5. Finance / Travel (policy + requests)

Each domain: Agent + MCP tools + tests + feature flag.

Also:

- Multi-region readiness notes
- Eval harness for agents (golden datasets)
- SCIM provisioning
- Advanced analytics
- Marketplace-style MCP connector packaging
- Performance & load test reports

---

## 4. Dependency Graph (Simplified)

```
M0 → M1 → M2 → M3 → M4 → M5 (Employee Leave)
                ↘ M6 (Knowledge)
           M4 + M3 → M7 → M8 → M9 → M10
```

---

## 5. What “Done” Means Per Milestone

- Typecheck + lint + unit tests pass in CI  
- Migrations applied forward-only  
- Feature behind flag if incomplete  
- Docs updated (`docs/*` + ADR if architectural)  
- No secrets committed  
- Observability hooks present for new paths  

---

## 6. Anti-Patterns to Reject

- Building all agents before first MCP tool works  
- UI-only demos with hardcoded responses as “architecture”  
- Shared DB tables without `tenant_id`  
- Business logic inside Next.js API routes long-term (use Application layer)  
