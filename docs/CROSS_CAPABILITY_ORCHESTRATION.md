# OneCare — Cross Capability Orchestration

**Status:** Living Document — M5 Slice 4  
**Package:** `@onecare/ess-orchestration`  
**Related:** [`EMPLOYEE_CAPABILITY_FRAMEWORK.md`](./EMPLOYEE_CAPABILITY_FRAMEWORK.md) · [`EMPLOYEE_AGENT.md`](./EMPLOYEE_AGENT.md) · [`AI_AGENTS.md`](./AI_AGENTS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 1. Purpose

Employees ask **any combination** of questions in natural language. OneCare must feel like **one AI**, not separate Leave / Attendance / Knowledge bots.

`CrossCapabilityOrchestrator` is the Employee Agent coordination layer. It:

1. Splits multi-intent messages  
2. Selects capabilities via the **Capability Registry** only  
3. Builds an **execution graph** (parallel / sequential / dependent)  
4. Merges clarifications and confirmations  
5. Executes through capability `execute()` → Tool Registry / MCP (or knowledge retrieval)  
6. Merges responses into one enterprise answer  
7. Handles partial failure, timeouts, retries, and cancellation  

It does **not** replace the Planner, MCP, Tool Registry, or Employee Capability Framework.

---

## 2. Architecture

```
User message
  → Master Orchestrator (runtime)
  → Planner (unchanged — routes to Employee / Knowledge agents)
  → CrossCapabilityOrchestrator
       → Intent splitter
       → Capability selector (registry)
       → CapabilityRunner (per segment)
       → Execution graph
       → Parallel reads / sequential writes
       → Merge clarify | confirm | respond
  → Stream events (progress, clarification, confirmation, deltas)
```

**Non-coupling rule:** the orchestrator never imports `@onecare/ess-leave`, `ess-attendance`, or `ess-knowledge`. Future Payroll / Profile / IT plug in by registering on the Capability Registry.

---

## 3. Execution Graph

| Field | Meaning |
|-------|---------|
| `nodes[]` | One node per intent segment / capability |
| `kind` | `read` \| `write` \| `knowledge` \| `clarify` \| `unknown` |
| `mode` | `parallel` \| `sequential` \| `dependent` \| `conditional` |
| `dependsOn` | Soft deps (e.g. write after same-capability read) |
| `priority` | Write > read > knowledge bands (+ capability priority) |
| `status` | pending → running → completed / failed / timed_out / waiting_* |

Future LangGraph adapters can consume the same graph shape.

---

## 4. Planning Strategy

1. Split message into segments (`?`, `and`/`also` + question cues).  
2. Score every registered capability per segment (`canHandle` + `detectIntent` + prior slots).  
3. Pick best capability; keep alternatives for clarification/fallback.  
4. Run `CapabilityRunner` lifecycle (extract → clarify → validate → plan).  
5. Build graph with dependency detection and priority sort.

Unknown segments → unsupported guidance (no invented tools).

---

## 5. Clarification Strategy

- Collect clarifications **per capability**.  
- Merge into **one** question list with deduped missing slots and suggested replies.  
- Persist `slotsByCapability` in conversation memory (`ess.slotsByCapability`).  
- Follow-ups reuse prior slots (pronouns / “tomorrow” / “those leaves”).

---

## 6. Confirmation Strategy

- Independent **reads execute first** so multi-intent answers are not blocked by a write confirmation.  
- Writes mint confirmations via Tool / MCP executor (confirmation IDs).  
- Multiple writes → **one merged confirmation** card (approve/cancel all).  
- Resume with `approvedToolConfirmations` map.

---

## 7. Response Merge Strategy

- Concatenate completed capability responses into one clean answer.  
- Partial failures append “temporarily unavailable” without failing the whole turn.  
- Heuristic conflict codes (holiday overlap, already completed, partial failure) surface clear notices — no domain packages imported.

---

## 8. Telemetry & Audit

| Signal | Where |
|--------|--------|
| Planning / execution ms, capabilities, retries, failures, parallel groups | `OrchestrationDiagnostics` |
| Progress stream | `orchestration_progress` (employee-safe copy) |
| Admin diagnostics | `GET /v1/ai/orchestration/diagnostics` (`ai.orchestration.diagnostics`) |
| Audit | `ai.orchestration` on diagnostics read; chat audits remain on AI stream |

Employees never see capability IDs or internal graph dumps.

---

## 9. Extensibility

Register a new `EmployeeCapability` in the composition root (`createEmployeeCapabilityRegistry(..., extras)`). No orchestrator redesign required for Payroll, Profile, Benefits, Finance, IT, Learning, Recruitment, Manager, or HR domains.

---

## 10. Out of scope (this slice)

Payroll · Profile · IT · Finance · Learning · Recruitment · Manager · production RAG · replacing Planner / MCP / Framework.
