# OneCare — Operations

**Status:** Living Document  
**Related:** [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`OBSERVABILITY.md`](./OBSERVABILITY.md)

---

## 1. Runtime topology

| Process | Role | Default port |
|---------|------|--------------|
| `apps/api` | Nest modular monolith | 3001 |
| `apps/web` | Employee shell | 3000 |
| `apps/admin` | Admin shell | 3002 |
| `apps/mcp-gateway` | MCP edge | 3003 |
| PostgreSQL | System of record | 5432 |
| Redis | Cache / rate limit | 6379 |

---

## 2. Boot sequence

1. `loadEnv()` — fail fast on invalid / unsafe production config  
2. Prisma client connect  
3. Redis cache (or in-memory in `NODE_ENV=test`)  
4. Feature flags bootstrap  
5. MCP platform + AI runtime composition root  
6. Listen + liveness OK  

---

## 3. Health probes (K8s-ready)

- **livenessProbe:** `GET /v1/health/live`  
- **readinessProbe:** `GET /v1/health/ready` (503 when DB down)  
- **Optional deep:** `GET /v1/health/dependencies`

---

## 4. Incident playbooks (short)

| Symptom | First checks |
|---------|----------------|
| Chat 5xx | `/v1/health/dependencies`, API logs by `correlationId`, MCP health |
| Auth failures | `AUTH_MODE`, cookie secure flags, session table, rate limits |
| Tool timeouts | Connector health, circuit breaker state, `CONNECTOR_*` env |
| Redis down | Rate limiting / cache degraded; API may continue with care |

---

## 5. Retention

- Conversations: `CONVERSATION_RETENTION_DAYS` (default 365) — archive jobs future  
- Audit logs: retain per tenant policy (DB indexes on `tenant_id, created_at`)  
- Soft-deleted conversations: `deleted_at` set; physical purge is a future job  

---

## 6. Remaining production risks

1. Conversation store defaults to **memory** until operators set `CONVERSATION_STORE=prisma` and migrate.  
2. OTEL exporter is optional — metrics are in-process until OTLP is configured.  
3. Feature flags are in-memory at boot; DB-backed evaluator is next.  
4. `pnpm audit` / gitleaks in CI are non-blocking until policy tightens.  
5. No multi-region active-active yet (M10).
