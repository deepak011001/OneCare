# OneCare — Employee Capability Framework

**Status:** Living Document — Source of Truth  
**Audience:** Cursor agents, ESS feature authors  
**Related:** [`EMPLOYEE_AGENT.md`](./EMPLOYEE_AGENT.md) · [`AI_AGENTS.md`](./AI_AGENTS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`MCP.md`](./MCP.md)

---

## 1. Purpose

Standardize how every **Employee Agent** capability is built.

Leave (`@onecare/ess-leave`) is the reference implementation. Future capabilities (Attendance, Payroll, Profile, IT, …) implement the same contract and register themselves — they do **not** fork orchestrator or MCP logic.

```
User → Master Orchestrator → Employee Agent
         → Capability Registry
              → EmployeeCapability (interface)
                   → Leave | Attendance | Payroll | …
                        → Tool Registry → MCP Gateway → Connector
```

---

## 2. Package

| Package | Role |
|---------|------|
| `@onecare/ess-capability` | Interface, registry, entities, validation, clarification, confirmation draft, response helpers, telemetry, runner |
| `@onecare/ess-leave` | Leave capability implementing the interface |

---

## 3. Capability Interface

Every capability exposes:

| Member | Responsibility |
|--------|----------------|
| `id`, `name`, `version`, `description` | Identity |
| `supportedIntents`, `supportedEntities`, `supportedTools` | Discovery |
| `requiredPermissions`, `priority`, `enabled` | AuthZ / ordering |
| `canHandle()` | Routing |
| `extractEntities()` | Slot filling (reuse framework extractors) |
| `validate()` | Domain + shared validators |
| `clarify()` | Missing / ambiguous slots |
| `buildExecutionPlan()` | Tool name + args (no vendor calls) |
| `buildConfirmation()` | Summary + risk for existing confirmation UX |
| `execute()` | Via injected Tool port → Tool Registry / MCP |
| `formatResponse()` | Structured `CapabilityResponse` |
| `dashboardWidgets()` | Dashboard registration |
| `suggestedPrompts()` | Chat starters / follow-ups |
| `helpExamples()` | `/help`, command palette |
| `telemetry()` | Metrics descriptor |

**Never** call Keka (or any vendor) from a capability. Side effects only through Tool Registry → MCP.

---

## 4. Registry

`CapabilityRegistry`:

- `register` / `unregister`
- Priority sort + enable/disable (+ tenant override hooks)
- `findByIntent` / `resolveForMessage`
- Aggregate `allDashboardWidgets`, `allSuggestedPrompts`, `allHelp`

Composition root: `createEmployeeCapabilityRegistry(options, extras)` in `@onecare/ess-leave` (registers Leave; pass Attendance and future capabilities as `extras`).

API surface:

- `GET /v1/employee/capabilities`
- `GET /v1/employee/capabilities/widgets`
- `GET /v1/employee/capabilities/prompts`
- `GET /v1/employee/capabilities/help`

---

## 5. Shared Pipelines

### Entities

Declare `EntityDeclaration`s (`date`, `relativeDate`, `leaveType`, `reason`, `ticket`, `amount`, …).  
Use `extractDeclaredEntities` + `CommonEntities` instead of one-off parsers when possible.

### Validation

`ValidationPipeline` with reusable validators: required fields, permissions, tool availability, plus capability business validators.

### Clarification

`ClarificationEngine` asks questions from declarations / `missingSlots()`. Capabilities declare requirements; the framework phrases questions.

### Confirmation

`buildConfirmationDraft()` — capabilities supply summary + risk; existing confirmation store/UX renders and gates writes.

### Response

`textResponse` / `CapabilityResponse` blocks: text, suggestions, table, timeline, card, quick actions, tool results (charts reserved).

### Runner

`CapabilityRunner.run(capability, input)` executes the shared lifecycle and emits telemetry events.

### Telemetry

Events: handled, validation_failed, clarification, confirmation, tool, failure.

---

## 6. Adding a New Capability (checklist)

1. Create `packages/ess-<domain>` depending on `@onecare/ess-capability`.
2. Implement `EmployeeCapability`.
3. Register in `createEmployeeCapabilityRegistry()`.
4. Add planner routes for `employee.<domain>.*` intents (router only).
5. Expose MCP tools via connector — not inside the capability.
6. Add tests + update `EMPLOYEE_AGENT.md` intent table.
7. Do **not** modify AI Runtime architecture or MCP Gateway architecture.

---

## 7. Leave Migration

`LeaveCapability` implements `EmployeeCapability`.  
`process()` remains the Slice 1 orchestrator entrypoint with **unchanged** clarify / validate / confirm / tool-plan behavior. Date utilities live in the framework and are re-exported from `@onecare/ess-leave`.

---

## 8. Success Bar for Future Slices

A new ESS capability is “done” when it:

- Implements the interface and self-registers  
- Uses shared entity / validation / clarification / confirmation helpers  
- Executes only via Tool Registry  
- Exposes widgets, prompts, and help metadata  
- Keeps Leave and existing chat/dashboard green
