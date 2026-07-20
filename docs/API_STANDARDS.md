# OneCare — API Standards

**Status:** Living Document — Source of Truth  
**Applies to:** NestJS HTTP/WS APIs and any public BFF endpoints

---

## 1. Goals

Consistency, security, evolvability, and clear contracts for web, agents, and future microservices.

---

## 2. Style

- **REST** for resource APIs (JSON)  
- **RPC-style** allowed for agent actions under `/v1/agents/...` when resources are awkward  
- **WebSocket** (or SSE) for chat streaming  
- Version prefix: `/v1/...`  

---

## 3. URL Conventions

```
GET    /v1/health
GET    /v1/health/live
GET    /v1/ready
GET    /v1/health/ready
GET    /v1/health/dependencies
GET    /v1/auth/login
POST   /v1/auth/login
GET    /v1/auth/callback
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/auth/me
GET    /v1/users/me
GET    /v1/tenants/current
GET    /v1/roles
GET    /v1/permissions
GET    /v1/ai/agents
GET    /v1/ai/tools
GET    /v1/ai/models
GET    /v1/ai/conversations
POST   /v1/ai/chat
POST   /v1/ai/plan
GET    /v1/me
GET    /v1/conversations
```

- Plural nouns for collections  
- kebab-case path segments if multi-word  
- No trailing slashes  
- No verbs in paths except well-known actions (`/decision`, `/confirm`)  

---

## 4. Headers

| Header | Required | Purpose |
|--------|----------|---------|
| `Authorization` | Yes (except public) | Bearer JWT |
| `X-Correlation-Id` | Recommended | Trace; server generates if missing |
| `Idempotency-Key` | Mutating POSTs | Deduplicate |
| `Content-Type` | Yes for body | `application/json` |
| `Accept` | Optional | `application/json` |

Tenant is derived from **token/session**, never from a client-supplied `X-Tenant-Id` unless Super Admin tooling with explicit checks.

---

## 5. Request / Response

### Success envelope (preferred)

```json
{
  "data": {},
  "meta": {
    "correlationId": "…",
    "requestId": "…"
  }
}
```

### Lists

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 135,
    "correlationId": "…"
  }
}
```

### Errors — Problem Details (RFC 7807-inspired)

```json
{
  "type": "https://onecare.local/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "detail": "endDate must be on or after startDate",
  "instance": "/v1/…",
  "correlationId": "…",
  "errors": [
    { "field": "endDate", "code": "DATE_ORDER", "message": "…" }
  ]
}
```

Map domain errors → stable `code` + HTTP status. Never leak stack traces or SQL.

---

## 6. Status Codes

| Code | When |
|------|------|
| 200 | OK |
| 201 | Created |
| 202 | Accepted (async) |
| 204 | No content |
| 400 | Validation |
| 401 | Unauthenticated |
| 403 | Forbidden (AuthZ) |
| 404 | Not found (no cross-tenant leakage) |
| 409 | Conflict |
| 422 | Semantic domain rule failure |
| 429 | Rate limited |
| 500 | Unexpected |
| 503 | Dependency down |

Use **404** instead of 403 when revealing existence would be a tenancy leak (policy-dependent; default safe 404 for cross-tenant IDs).

---

## 7. Validation

- Zod or class-validator at the edge  
- `additionalProperties` rejected for external payloads where feasible  
- Max body size limits  
- File upload allowlists + antivirus scanning path (when enabled)  

---

## 8. Pagination, Filtering, Sorting

- Cursor pagination preferred for large feeds; offset OK for admin tables  
- Explicit allowlisted `sort=` fields  
- Filters as query params; never raw SQL fragments  

---

## 9. AuthZ

- Declare required permissions on controllers (`@RequirePermissions('leave:apply')`)  
- ABAC checks in Application layer for object-level rules  
- Admin routes under `/v1/admin/**` with elevated permissions  

---

## 10. Chat Streaming

WebSocket events (example):

```json
{ "type": "message.delta", "conversationId": "…", "delta": "…" }
{ "type": "plan.updated", "plan": [] }
{ "type": "confirmation.required", "toolCallId": "…", "risk": "medium" }
{ "type": "tool.started", "name": "applyLeave" }
{ "type": "tool.finished", "name": "applyLeave", "ok": true }
{ "type": "message.completed", "messageId": "…" }
{ "type": "error", "code": "…", "message": "…" }
```

All events include `correlationId`.

---

## 11. Idempotency

- Required for payments-like and leave apply/cancel  
- Store hash of request body; conflict if same key different body  
- Return original result on replay  

---

## 12. Versioning & Deprecation

- Additive changes preferred  
- Deprecate with `Sunset` / docs; minimum support window documented  
- Breaking change → `/v2`  

---

## 13. Documentation

- OpenAPI generated from Nest decorators  
- Publish internal Swagger for Admin/dev  
- Contract tests for critical flows  

---

## 14. Anti-Patterns

- Business logic in controllers  
- Returning Prisma entities directly  
- Silent 200 with error strings in body  
- Unbounded list endpoints  

---

## Related

`CODING_GUIDELINES.md` · `SECURITY.md` · `ARCHITECTURE.md`
