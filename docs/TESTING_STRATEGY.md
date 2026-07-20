# OneCare — Testing Strategy

**Status:** Living Document  
**Related:** [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`CODING_GUIDELINES.md`](./CODING_GUIDELINES.md)

---

## 1. Layers

| Layer | Location | Goal |
|-------|----------|------|
| Unit | `packages/*/src/**/*.test.ts` | Pure logic (errors, flags, PII, planner, capabilities) |
| Integration | `apps/api` + package tests | Nest modules, stores, MCP execute paths |
| Contract | Tool/MCP schemas | Args validation, error codes |
| Regression | M5 capability + orchestration tests | No employee feature regressions |
| Security | Authz tests, tenant filters | Isolation + RBAC |
| CI gate | `.github/workflows/ci.yml` | lint, typecheck, test, build, compose config |

---

## 2. Critical paths (must stay green)

1. Auth login / refresh / CSRF  
2. AI chat stream + confirmation  
3. Leave / Attendance / Knowledge capabilities  
4. Cross-capability orchestration  
5. MCP tool execute + confirmation store  
6. Health live / ready  

---

## 3. Failure / recovery tests

- Retry then success (`withRetry`)  
- Circuit opens after threshold  
- Bulkhead rejects excess concurrency  
- Timeout maps to retryable connector errors  
- Partial orchestration failure does not wipe sibling results  

---

## 4. Coverage guidance

Prefer high coverage on: shared errors/resilience, telemetry redaction, feature flags, conversation store, MCP gateway, capability runners.  
Do not chase 100% UI coverage at the expense of critical-path depth.

---

## 5. Local commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm --filter @onecare/ess-orchestration test
pnpm --filter @onecare/shared test
```
