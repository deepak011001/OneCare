# OneCare — Prompt Management

**Status:** Living Document  
**Package:** `@onecare/prompts`  
**Related:** [`AI_AGENTS.md`](./AI_AGENTS.md) · [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md)

---

## 1. Principles

- Prompts are **versioned data**, not scattered string literals in agents.  
- Registry validates variables and content hash.  
- No provider-specific prompt SDKs in Domain.

---

## 2. Registry contract

`PromptRegistryPort`:

- `register` / `get(id, version?)` / `render` / `list`  
- Active version selected when version omitted  

Default seeds: `orchestrator.system`, `agent.placeholder`, plus agent-specific refs from catalogs.

---

## 3. Hardening hooks (`@onecare/ai` hardening)

| Hook | Role |
|------|------|
| `PromptTelemetryPort` | Record render id/version/hash (no-op default) |
| `TokenBudgetPort` | Budget gate before LLM calls |
| `ContextGuardPort` | Truncate oversized context |
| `SafetyHookPort` | Future moderation / injection defenses (allow-all default) |

Defaults preserve current behavior.

---

## 4. Debugging / replay

- Conversation messages persist role + metadata (`planId`, `model`, tokens) when using Prisma store.  
- Correlate with `conversationId` + `correlationId` in logs.  
- Prompt hash on templates supports drift detection across environments.

---

## 5. Operational rules

1. Never put secrets or raw PII into prompt templates.  
2. Bump SemVer on template changes; keep prior version for rollback.  
3. Tenant overrides (future) go through feature flags / config — not code forks.
