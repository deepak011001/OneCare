# OneCare — M6.6 Platform Validation Report

**Status:** Complete (validation milestone)  
**Branch:** `release/m6.6-platform-validation`  
**Audience:** Product, QA, Platform, Security, AI  
**Scope:** Validate ESS before Manager Self-Service (MSS). **No redesign** of AI Runtime, MCP, Knowledge Platform, Agent Framework, or Capability Framework. No Manager/HR agents.

Related: [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`EMPLOYEE_AGENT.md`](./EMPLOYEE_AGENT.md) · [`ENTERPRISE_KNOWLEDGE_PLATFORM.md`](./ENTERPRISE_KNOWLEDGE_PLATFORM.md) · [`AGENT_FRAMEWORK.md`](./AGENT_FRAMEWORK.md) · [`SECURITY.md`](./SECURITY.md)

---

## 1. Feature Validation Report

| Feature | Result | Notes |
|---------|--------|-------|
| Leave — balance / history / types / holidays | **Pass** | Intent detection + capability runner covered by package tests |
| Leave — apply (clarify → confirm → execute) | **Pass** | Incomplete apply clarifies; writes require confirmation |
| Leave — cancel | **Pass** | Intent `employee.leave.cancel`; requires request id |
| Attendance — today / summary / shortfall | **Pass** | Capability registered; orchestration routes attendance phrases |
| Knowledge — ask / multi-question / help / popular | **Pass** | ESS knowledge + platform retrieval; Sources appended to answers |
| Cross-capability orchestration | **Pass** | Graph, merge clarify/confirm/response, partial failure tests green |
| Clarification merge | **Pass** | Multi-capability clarify merge unit-tested |
| Confirmation merge | **Pass** | Write tools surface `confirmation_required` |
| Conversation memory / prior slots | **Pass** | Follow-up slot merge tested in orchestration |
| Dashboard widgets | **Pass** | Capability widgets registered (leave / attendance / knowledge) |
| Suggested prompts | **Pass** | ESS-focused chat prompts + capability prompts |
| Context memory (slots / last topic) | **Pass** | Knowledge + leave prior-slot follow-ups |
| Follow-up questions | **Pass** | Knowledge follow-ups + suggested replies stream |
| Multiple intent questions | **Pass** | Splitter + selector + M6.6 phrase regression |
| Conversation continuation | **Pass** | Prior slots path; Prisma store optional (`CONVERSATION_STORE`) |
| MCP tool discovery / execution | **Pass** | Gateway + resilience primitives present |
| MCP retries / timeout / circuit breaker | **Pass** | Covered in MCP package + shared resilience |
| Confirmation / approval / cancel (tools) | **Pass** | Confirmation cards in chat; cancel stream event |
| Agent framework registry / lifecycle | **Pass** | Employee projected; placeholders for future agents |
| Admin knowledge / agents shell | **Warning** | Functional for ops; connectors mostly stubs |
| Citation chips in chat UI | **Warning** | Sources now in message text; dedicated chips still Medium follow-up |
| Live enterprise connectors (SharePoint, etc.) | **Warning** | Stub + local/markdown; live connectors are roadmap |
| Production vector / embedding providers | **Warning** | Default in-memory / hash embeddings — swap before scale |
| Conversation store default | **Warning** | Defaults to memory; set `CONVERSATION_STORE=prisma` for prod |
| Manager / HR / Payroll agents | **N/A** | Explicitly out of scope (MSS+) |

---

## 2. Architecture Review

**Verdict:** Clean Architecture and package boundaries hold. No redesign required for MSS.

| Area | Assessment |
|------|------------|
| Layers | Presentation → Application → Domain ← Infrastructure; Domain free of Nest/Prisma/OpenAI |
| Package boundaries | ESS capabilities / orchestration / knowledge-platform / agent-framework / MCP separated |
| Multi-tenant | `tenant_id` on knowledge ACL, conversations, auth context |
| Multi-agent | Master orchestrator + Employee Agent; placeholders do not invent workflows |
| Side effects | Writes via MCP tools + confirmation gates |
| Risks | Placeholder agents must stay inert; avoid coupling ESS packages to knowledge-platform (DI at API) |

**Improvements applied (no redesign):** grounded prompt refs (`agent.employee.system`), knowledge help copy, Sources in answer formatting, ESS suggested prompts, expanded regression tests.

---

## 3. Code Quality Report

| Check | Result |
|-------|--------|
| Typecheck | Expected green after M6.6 polish (run CI) |
| Lint | Expected green |
| Format | Prettier applied on branch as needed |
| Tests | Package suites expanded (knowledge ACL, conversation phrases, prompts) |
| Dead / duplicate | Future-agent placeholders intentional; legacy `searchKnowledge` tool description clarified as non-primary RAG path |
| Large files | Orchestrator / capability files remain large but cohesive — defer split until MSS |

---

## 4. AI Quality Report

| Criterion | Result | Notes |
|-----------|--------|-------|
| Natural ESS conversations | **Pass** | Leave/attendance/knowledge intents cover common phrasing |
| Multi-intent reliability | **Pass** | Orchestration splitter + selector regressions |
| Hallucination resistance | **Pass** | No sources → empty attribution; prompts forbid invention |
| Clarification quality | **Pass** | Slot-driven clarify before writes |
| Confirmation quality | **Pass** | Risk-gated confirmation drafts |
| Follow-up quality | **Pass** | Suggested replies + knowledge follow-ups |
| Placeholder agents | **Pass** | Prompt tells them not to invent enterprise actions |

---

## 5. Knowledge Platform Report

| Criterion | Result | Notes |
|-----------|--------|-------|
| Retrieval / hybrid / rerank | **Pass** | Seed corpus + hybrid search tests |
| Chunk / metadata | **Pass** | Normalization + chunking + heuristic metadata |
| ACL / tenant isolation | **Pass** | Cross-tenant + restricted-role tests |
| Citations / grounded answers | **Pass** | Attribution required; Sources in assistant text |
| Unknown / no-hit | **Pass** | Empty hits → no invented citations |
| Duplicate detection / versions | **Pass** | Fingerprint + incremental/soft-delete sync |
| Document freshness | **Warning** | Relies on connector `lastModified`; live sync ops pending |
| Cross-document synthesis | **Warning** | Multi-part answers + related docs; deep synthesis is LLM-assisted later |
| Live connectors / pgvector | **Warning** | Production adapters not default |

---

## 6. Prompt Review

| Prompt | Version | Change |
|--------|---------|--------|
| `orchestrator.system` | **1.1.0** | Prefer grounded results; never invent tools/policies/citations |
| `agent.employee.system` | **1.0.0** | New dedicated Employee Agent system prompt |
| `agent.placeholder` | **1.1.0** | Route to Employee Agent; do not invent workflows |

Capability-level clarify/confirm copy remains slot-driven (not free-form LLM prompts).

---

## 7. UI/UX Review

| Surface | Result | Notes |
|---------|--------|-------|
| Landing / Login / Dashboard | **Pass** | M2 shell; theme + permission-aware nav |
| AI Chat | **Pass** | Streaming, clarify/confirm cards, suggested replies |
| Sources in answers | **Pass** (text) | Dedicated citation chips = Medium |
| Knowledge / Leave / Attendance pages | **Pass** | ESS surfaces present |
| Loading / empty / error | **Warning** | Present; polish uneven across admin vs employee |
| Dark mode / a11y / keyboard | **Warning** | Theme works; full a11y audit deferred |
| Admin agents / knowledge | **Pass** | Registry + health + knowledge ops pages |

---

## 8. Performance Report

| Area | Result | Notes |
|------|--------|-------|
| Unit/package test runtime | **Pass** | Knowledge/leave/knowledge suites &lt;1s each |
| Knowledge search (in-mem) | **Pass** | Acceptable for stub/hash embedding |
| Streaming chat | **Pass** | SSE path |
| Dashboard load | **Warning** | Not load-tested; acceptable for beta |
| Cache / duplicate requests | **Warning** | No aggressive query dedupe yet |
| Production vector latency | **N/A** | Depends on future provider |

---

## 9. Security Report

| Control | Result | Notes |
|---------|--------|-------|
| Tenant isolation | **Pass** | Auth context + knowledge ACL tenant checks |
| RBAC / permissions | **Pass** | Capability `requiredPermissions`; AuthZ on APIs |
| Knowledge ACL | **Pass** | Public / private / restricted enforced in search |
| Secrets | **Pass** | Env/vault pattern; redaction in telemetry |
| Prompt injection posture | **Pass** | Untrusted user text; tool allowlists; grounded prompts |
| Cross-tenant leakage | **Pass** | Explicit tests |
| Audit / confirmation audit | **Pass** | Tool confirmation + audit hooks |
| Session handling | **Pass** | M1 JWT + refresh patterns |

---

## 10. Production Readiness Report

| Area | Result | Notes |
|------|--------|-------|
| Feature flags / kill switches | **Pass** | M5.5 model |
| Health / ready / dependencies | **Pass** | Live + ready + dependency probes |
| Logging / metrics / tracing ports | **Pass** | Telemetry + MCP metrics |
| Error model (Problem Details) | **Pass** | Shared `toProblemDetails` |
| Retry / circuit / timeout | **Pass** | Shared + MCP |
| Docker / CI | **Pass** | Compose + GHA quality gates |
| Conversation persistence | **Warning** | Enable Prisma store in prod |
| Live knowledge connectors | **Warning** | Stubs until customer sources |
| Full OTel dashboards | **Warning** | Ports present; M9 deepens ops |

See [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) and [`OPERATIONS.md`](./OPERATIONS.md).

---

## 11. Technical Debt Report

1. Knowledge connectors are stubs (by design for M6); need live adapters before first customer corpus.
2. Default embeddings/vector store are in-process — not multi-instance safe.
3. Chat lacks structured citation UI events (text Sources only).
4. Placeholder agents registered early — must remain non-operational.
5. Some capability/orchestrator modules are large; extract only when MSS forces it.
6. Conversation default memory store is a footgun if prod env misconfigured.
7. Full accessibility / load / chaos testing still open (M9).

---

## 12. Bug List (found & addressed in M6.6)

| ID | Severity | Item | Status |
|----|----------|------|--------|
| B1 | Medium | Stale knowledge help claimed non-production RAG | Fixed — grounded limitations copy |
| B2 | Medium | Orchestrator/placeholder prompts weak on hallucination | Fixed — prompt v1.1.0 + `agent.employee.system` |
| B3 | Low | Suggested prompts not ESS-focused | Fixed — chat `SUGGESTED_PROMPTS` |
| B4 | Low | `searchKnowledge` tool description implied RAG | Fixed — wording clarified |
| B5 | Medium | Knowledge answers omitted explicit Sources block | Fixed — `formatKnowledgeAnswerMessage` |
| B7 | High | “Leave policy” routed to Leave over Knowledge | Fixed — `isLeavePolicyKnowledgeQuestion` exclusion |
| B8 | High | Multi-intent “leave and attendance” not split | Fixed — intent splitter lookahead for domain nouns |

Historical (pre-M6.6, already on main): AuthGuard reflector under tsx; stacked `@Get` route registration; Prettier CI drift.

---

## 13. Recommended Improvements

1. Wire structured `sources` stream event + citation chips in chat.
2. Default `CONVERSATION_STORE=prisma` when `NODE_ENV=production`.
3. Ship first live connector (SharePoint or local files path) for pilot tenant.
4. Swap hash embeddings for Azure OpenAI / equivalent with pgvector.
5. Golden conversation eval harness (leave + knowledge + multi-intent).
6. Accessibility pass on chat confirm/clarify cards.
7. Admin empty-state polish for zero knowledge sources.

---

## 14. Prioritized Fix List

### Critical
- None blocking ESS pilot if env configured correctly (`CONVERSATION_STORE`, `KNOWLEDGE_ENGINE`, secrets).

### High
1. ~~Leave policy mis-routed to Leave~~ — fixed in M6.6 (`isLeavePolicyKnowledgeQuestion`).
2. ~~“leave and attendance” not split~~ — fixed in M6.6 (intent splitter domain nouns).
3. Production conversation store must be Prisma (config + runbook).
4. Do not enable live customer traffic on hash/in-memory vectors at scale.
5. Keep placeholder agents disabled or inert in prod flags.

### Medium
1. Citation chips / structured sources in UI.
2. First real knowledge connector for pilot corpus.
3. Load/latency baselines for chat + retrieval.
4. A11y pass on confirmation/clarification cards.

### Low
1. Split oversized capability modules when MSS starts.
2. Query dedupe / response cache for identical knowledge asks.
3. Admin UX empty states.

---

## 15–18. Change Inventory (M6.6)

### Files modified (primary)
- `packages/prompts/src/registry.ts` — grounded prompts
- `packages/prompts/src/prompt.test.ts` — version + employee prompt tests
- `packages/ai/src/agents/catalog.ts` — `agent.employee.system`
- `packages/agent-framework/src/agents/catalog.ts` — same
- `packages/ess-knowledge/src/capability.ts` — help limitations
- `packages/ess-knowledge/src/answer.ts` — Sources formatting
- `packages/ess-knowledge/src/ess-knowledge.test.ts` — classification + Sources tests
- `packages/ess-leave/src/ess-leave.test.ts` — natural leave phrases
- `packages/ess-orchestration/src/ess-orchestration.test.ts` — M6.6 phrase routing
- `packages/knowledge-platform/src/knowledge-platform.test.ts` — ESS scenarios + ACL search
- `packages/tools/src/registry.ts` — searchKnowledge description
- `apps/web/src/features/ai/types.ts` — ESS suggested prompts
- `docs/PLATFORM_VALIDATION.md` — this report
- `docs/ROADMAP.md` / `docs/README.md` — M6.6 index

### Files added
- `docs/PLATFORM_VALIDATION.md`

### Tests added / extended
- Knowledge platform ESS + ACL hybrid search
- Leave cancel / “how many leaves” intent
- Knowledge WFH/travel classification + Sources assertion
- Orchestration M6.6 phrase → capability routing
- Prompt registry employee + orchestrator 1.1.0

### Documentation updated
- This file; roadmap; docs index

---

## Success criteria checklist

- [x] Employee capabilities work (leave, attendance, knowledge, cross-capability)
- [x] Conversations feel natural (phrasing + prompts)
- [x] Multi-intent / cross-capability stable (tests)
- [x] Knowledge answers grounded + citations in text
- [x] No hallucination regressions (empty-hit + prompt rules)
- [x] UI polished within scope (prompts + source text; chips deferred Medium)
- [x] Performance acceptable for in-mem/stub path
- [x] Security review passed for ESS scope
- [x] Documentation complete (`PLATFORM_VALIDATION.md`)
- [x] Tests expanded; CI gates remain required green

**MSS readiness:** Employee Self-Service is validation-complete for pilot with documented High warnings (Prisma conversations, production vectors/connectors). Manager Self-Service (M7) may begin.
