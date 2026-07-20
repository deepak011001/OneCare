# OneCare — Observability

**Status:** Living Document  
**Related:** [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`OPERATIONS.md`](./OPERATIONS.md)

---

## 1. Correlation model

Every request carries:

| Field | Source |
|-------|--------|
| `requestId` | Middleware |
| `correlationId` | Middleware / client |
| `tenantId` / `userId` / `sessionId` | Auth context |
| `conversationId` | AI chat |
| `capabilityId` / `executionGraphId` | Cross orchestration diagnostics |
| `connectorId` / `toolName` | MCP execute |

Structured JSON logs via `createSafeLogger` include these fields when provided. PII/secrets are redacted.

---

## 2. OpenTelemetry interfaces

`@onecare/telemetry` exposes vendor-neutral ports:

- `TracerPort` / `NoOpTracer`  
- `MetricsPort` / `InMemoryMetrics`  
- `PlatformMetrics` — request latency, retries, token/cost hooks  
- `TRACE_ATTR.*` — standard attribute keys  

Wire `@opentelemetry/api` later without Domain imports.

---

## 3. Metrics (current)

| Metric | Meaning |
|--------|---------|
| `onecare.request.count` | Request outcomes |
| `onecare.request.latency_ms` | Latency histogram |
| `onecare.request.retries` | Retry count |
| `onecare.ai.prompt_tokens` / `completion_tokens` | Token usage hooks |
| `onecare.ai.cost_usd` | Estimated cost |
| MCP metrics | Existing `@onecare/telemetry` MCP helpers |

---

## 4. Logging rules

Never log: tokens, passwords, cookies, Authorization headers, salaries/payslips, raw connector secrets.  
Prefer IDs over emails; emails are masked when present.

---

## 5. Dashboards (target)

1. API golden signals (latency, errors, saturation)  
2. MCP connector health + circuit opens  
3. AI stream duration + token/cost  
4. Auth failure rate + rate-limit hits
