# OneCare — Feature Flags

**Status:** Living Document  
**Package:** `@onecare/feature-flags`  
**Related:** [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) · [`DATABASE.md`](./DATABASE.md)

---

## 1. Purpose

Gate capabilities, preview features, and **kill switches** without embedding business logic in flag evaluations.

---

## 2. Resolution order

`user` → `tenant` → `system` → caller default

Lookup keys match DB helper `featureFlagLookupKey(scope, key, id?)`.

---

## 3. Platform keys

| Key | Default | Meaning |
|-----|---------|---------|
| `agents.employee.enabled` | on | Employee agent available |
| `capability.ess.leave.enabled` | on | Leave capability |
| `capability.ess.attendance.enabled` | on | Attendance capability |
| `capability.ess.knowledge.enabled` | on | Knowledge capability |
| `knowledge.platform.enabled` | on | Enterprise Knowledge Platform engine |
| `ai.cross_orchestration.enabled` | on | Cross-capability orchestrator |
| `mcp.execute.enabled` | on | MCP execute path |
| `preview.streaming.v2` | on | Preview gate (no behavior change yet) |
| `killswitch.ai.chat` | off | When **enabled**, chat is killed |
| `killswitch.mcp.execute` | off | When **enabled**, MCP execute is killed |

Kill switch semantics: `isKillSwitchOpen` returns **true** when traffic is allowed.

---

## 4. Storage

- Runtime: `InMemoryFeatureFlagService` (boot defaults)  
- Schema: `feature_flags` table already exists for future Prisma-backed evaluator  

---

## 5. Rules

1. Flags never contain secrets.  
2. Missing flag ⇒ safe default (capabilities ON, killswitches OFF).  
3. Do not use flags to invent new product behavior in M5.5 — only gates.
