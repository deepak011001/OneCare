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
 → M4 First Domain (ESS Leave) + MCP
 → M5 Knowledge / RAG
 → M6 Workflows & Approvals (MSS)
 → M7 Admin Portal
 → M8 Observability & Hardening
 → M9 Additional Domains & Connectors
 → M10 Scale, Eval, Enterprise Packaging
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

- NestJS (or agreed backend) Clean Architecture skeleton
- Next.js app: Landing, Login, Dashboard, Chat shell, Settings
- React Query + Zustand patterns per `CODING_GUIDELINES.md`
- Shadcn UI + Tailwind; dark mode; a11y baseline
- Health checks; structured logging
- WebSocket/SSE gateway stub for chat streaming

**Exit criteria:** Authenticated user navigates all shell routes; API health green.

---

### M3 — Agent Runtime + Master Orchestrator

**Outcome:** Multi-agent platform that plans and routes (tools mocked OK).

- Agent registry (config-driven)
- Master Orchestrator: intent → plan → domain agent
- LangGraph (or chosen runtime) with typed state
- Conversation + user memory stores
- Prompt versioning table
- Tool invocation interface (MCP client abstraction)
- Confirmation policy engine (risk levels)
- Cost/latency recording hooks

**Exit criteria:** Chat returns a plan + mock tool result with full audit trail.

---

### M4 — First Domain Slice: Leave via MCP

**Outcome:** Real business value — apply/balance leave.

- ESS Agent (leave intents)
- MCP Leave server (Keka or stub with identical contract)
- Tools: `applyLeave`, `cancelLeave`, `leaveBalance`
- Confirmation UX for apply/cancel
- Notifications (in-app + email optional)
- Integration tests against MCP contract

**Exit criteria:** Employee can check balance and apply leave end-to-end in a tenant.

---

### M5 — Knowledge Platform (Enterprise RAG)

**Outcome:** Permission-aware answers with citations.

- Ingestion pipeline (PDF/Word first; SharePoint next)
- Embeddings + pgvector
- ACL metadata on chunks
- Knowledge Agent
- Admin: register source + sync job (BullMQ)
- Citation UI in chat

**Exit criteria:** “What is our travel policy?” returns grounded answer only from permitted docs.

---

### M6 — Workflows & Manager Approvals

**Outcome:** Human-in-the-loop enterprise workflows.

- Workflow engine (state machine; durable)
- MSS Agent: approve/reject leave
- Approval inbox UI
- SLA / reminder jobs
- ABAC: manager-of relationship enforced

**Exit criteria:** Manager approves leave via chat and via inbox; employee notified.

---

### M7 — Admin Portal

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

### M8 — Observability & Hardening

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

### M9 — Domain Expansion Pack

**Priority order (adjust per customer):**

1. Payroll (payslip download)  
2. Attendance (clock in/out)  
3. IT Helpdesk (create ticket, reset password)  
4. Microsoft Graph (mail/calendar/Teams)  
5. Finance / Travel (policy + requests)

Each domain: Agent + MCP tools + tests + feature flag.

---

### M10 — Enterprise Packaging

- Multi-region readiness notes
- Eval harness for agents (golden datasets)
- SCIM provisioning
- Advanced analytics
- Marketplace-style MCP connector packaging
- Performance & load test reports

---

## 4. Dependency Graph (Simplified)

```
M0 → M1 → M2 → M3 → M4
                ↘ M5
           M4 + M3 → M6 → M7 → M8 → M9 → M10
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
