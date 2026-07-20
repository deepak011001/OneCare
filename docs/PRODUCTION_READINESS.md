# OneCare — Production Readiness (M5.5)

**Status:** Living Document  
**Audience:** Platform engineers, SRE, security reviewers  
**Related:** [`OPERATIONS.md`](./OPERATIONS.md) · [`OBSERVABILITY.md`](./OBSERVABILITY.md) · [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) · [`FEATURE_FLAGS.md`](./FEATURE_FLAGS.md) · [`PROMPT_MANAGEMENT.md`](./PROMPT_MANAGEMENT.md) · [`SECURITY.md`](./SECURITY.md)

---

## 1. Purpose

M5.5 hardens the existing platform for enterprise deployment **without changing employee-facing behavior**. No new business capabilities (Payroll, Profile, Manager, RAG) are introduced.

Focus areas: reliability, security, observability, logging, errors, retries, performance, configuration, CI, and documentation.

---

## 2. Guarantees

| Guarantee | How |
|-----------|-----|
| Behavior parity | Feature flags default ON for shipped capabilities; kill switches default OFF |
| Tenant isolation | Conversation persistence and health checks keep `tenant_id` scoping |
| No secrets in logs | `@onecare/telemetry` PII/secret redaction |
| Fail closed on boot | Zod `loadEnv()` rejects unsafe production config |
| Graceful degradation | Health dependencies report `degraded` / `skipped`; readiness fails only on DB |

---

## 3. Health model

| Endpoint | Meaning |
|----------|---------|
| `GET /v1/health` · `/v1/health/live` | Liveness |
| `GET /v1/ready` · `/v1/health/ready` | Readiness (DB required) |
| `GET /v1/health/dependencies` | Deep checks: DB, Redis, MCP, AI runtime, capability registry, flags |

---

## 4. Error model

All API errors map to RFC7807-style **Problem Details** via `toProblemDetails()` (`@onecare/shared`):

- Categories: business, validation, authn/z, connector, timeout, AI, tool, planner, capability, network, rate_limit, unknown  
- Fields: `type`, `title`, `status`, `detail`, `code`, `category`, `retryable`, `correlationId`, `requestId`

---

## 5. Resilience

Shared primitives in `@onecare/shared` (`withRetry`, `CircuitBreaker`, `Bulkhead`, `withTimeout`) and connector SDK timeouts/retries. MCP gateway retains its circuit breaker / retry path.

---

## 6. Conversations

- Port: `ConversationStorePort`  
- Default: in-memory (unchanged local/dev behavior)  
- Production path: `PrismaConversationStore` + `conversations` / `conversation_messages` tables (soft delete, pagination, summaries)  
- Config: `CONVERSATION_STORE=memory|prisma`

---

## 7. Exit criteria checklist

- [x] Structured logging + PII masking  
- [x] Standardized errors  
- [x] Retry / circuit / bulkhead primitives  
- [x] Expanded health  
- [x] Feature flag port + kill switches  
- [x] Production env validation  
- [x] Conversation persistence schema  
- [x] CI quality gates expanded  
- [x] Docs set for ops / obs / testing / flags / prompts  

---

## 8. Remaining risks

See [`OPERATIONS.md`](./OPERATIONS.md) § Remaining production risks.
