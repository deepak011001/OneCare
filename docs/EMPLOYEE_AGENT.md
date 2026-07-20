# OneCare — Employee Agent Contract

**Status:** Living Document — Source of Truth for ESS Agent behavior  
**Agent ID:** `employee`  
**Display name:** EmployeeAgent (ESS)  
**Audience:** Cursor agents, product, backend, frontend  
**Related:** [`AI_AGENTS.md`](./AI_AGENTS.md) · [`MCP.md`](./MCP.md) · [`SECURITY.md`](./SECURITY.md) · [`ROADMAP.md`](./ROADMAP.md)

---

## 1. Purpose

The **Employee Agent** is the enterprise self-service (ESS) domain agent. It helps the authenticated employee complete **personal** HR/work actions through natural language — never by inventing APIs, employee IDs, or vendor-specific calls.

```
User → Master Orchestrator → Employee Agent → Tool Registry → MCP Gateway → Connector (e.g. Keka)
```

**Non-goals (do not put here):**

- Manager approvals (→ Manager / MSS Agent)
- HR case ownership (→ HR Agent)
- Knowledge / policy RAG answers (→ Knowledge Agent; Employee may *handoff*)
- Admin / tenant configuration
- Direct vendor SDK usage inside the agent

As capabilities grow from a handful of leave actions to hundreds of enterprise interactions, **this document is the contract**. Implementation must stay aligned with it; expand via ADR + catalog updates, not ad-hoc prompt edits.

---

## 2. Identity & Registration

| Field | Value |
|-------|--------|
| `id` | `employee` |
| `version` | SemVer of agent definition (start `1.0.0` for M5 leave slice) |
| `systemPromptRef` | `agent.employee` (versioned in prompt registry) |
| `enabled` | Tenant feature flag `agents.employee.enabled` (default true) |
| Planner intent family | `employee.*` |

Orchestrator routes to this agent when the primary intent is **employee self-service** for the signed-in user.

---

## 3. Supported Intents

Intents are stable strings. Add new intents in this table before shipping tools/UI.

### 3.1 Near-term (M5 leave slice)

| Intent | User meaning | Default tools | Confirmation |
|--------|--------------|---------------|--------------|
| `employee.leave.balance` | “What’s my leave balance?” | `leaveBalance` | No |
| `employee.leave.history` | “Show my leave requests” | `leaveHistory` | No |
| `employee.leave.apply` | “Apply leave …” | `applyLeave` | **Yes** |
| `employee.leave.cancel` | “Cancel my leave …” | `cancelLeave` | **Yes** |
| `employee.leave.types` | “Which leave types?” | `leaveTypes` | No |
| `employee.leave.holidays` | “What holidays…?” | `holidayCalendar` | No |
| `employee.leave.enough` | “Do I have enough sick leave?” | `leaveBalance` | No |
| `employee.leave.status` | “When is my leave approved?” | `leaveHistory` | No |

### 3.2 Planned (post-M5, same agent)

| Intent | Notes |
|--------|--------|
| `employee.attendance.status` | Today’s punch / status |
| `employee.attendance.history` | Recent attendance |
| `employee.attendance.clock_in` / `clock_out` | Write; confirm |
| `employee.profile.read` | Own profile fields only |
| `employee.payroll.payslip` | PII; confirm / mask in logs |
| `employee.payroll.salary_history` | High risk PII; confirm + policy |
| `employee.handoff.knowledge` | Delegate policy questions to Knowledge Agent |
| `employee.handoff.manager` | “Who can approve?” → explain + optional MSS handoff |

### 3.3 Explicitly out of scope

| Intent pattern | Owner |
|----------------|--------|
| `manager.*` | Manager Agent |
| `hr.case.*` | HR Agent |
| `it.*` | IT Agent |
| Approving someone else’s leave | Manager Agent |
| Changing another employee’s data | Deny / escalate |

---

## 4. Capabilities

Capabilities are coarse product claims; intents map to them for Admin / feature flags.

| Capability ID | Description | M5 |
|---------------|-------------|-----|
| `ess.leave.read` | Read balance and history for self | ✓ |
| `ess.leave.write` | Apply / cancel own leave | ✓ |
| `ess.attendance.read` | Read own attendance | Later |
| `ess.attendance.write` | Clock in/out / regularize (if allowed) | Later |
| `ess.profile.read` | Read own profile | Later |
| `ess.payroll.read` | Payslip / salary history (self) | Later |
| `ess.clarify` | Ask for missing slots before tools | ✓ |
| `ess.confirm` | Human confirmation for mutating tools | ✓ |

**Rules:**

1. Capabilities operate **only on the authenticated principal** unless a future ABAC policy explicitly allows otherwise.
2. The agent never “acts as” another employee via LLM-supplied IDs.
3. Vendor mapping (email → HRIS employee id) happens in MCP / connector identity propagation — not in prompts.

---

## 5. Required Permissions

Authorization is Application-layer RBAC (+ future ABAC). Tool metadata `permissions[]` must be enforced by the policy engine before MCP execute.

| Intent / tool | Required permissions (string catalog) |
|---------------|----------------------------------------|
| `leaveBalance`, `leaveHistory`, `leaveTypes` | `leave.read` |
| `holidayCalendar` | `holiday.read` |
| `applyLeave` | `leave.apply`, `mcp.execute` |
| `cancelLeave` | `leave.cancel`, `mcp.execute` |
| Chat / stream | `ai.chat` |
| List MCP tools (debug/admin surfaces) | `mcp.tools.read` |

**Deny behavior:**

- Missing permission → user-safe message (“You don’t have permission to …”), audit `denied`, **no** MCP call.
- Never leak whether another tenant’s resource exists.

---

## 6. Tool Mappings

Vendor-agnostic MCP tool names only ([`MCP.md`](./MCP.md)). Connector (Keka today) is invisible to the agent.

| Intent | Tool | Side effect | Risk | Input (required) | Notes |
|--------|------|-------------|------|------------------|--------|
| `employee.leave.balance` | `leaveBalance` | read | low | `{}` | Auto-execute |
| `employee.leave.history` | `leaveHistory` | read | low | optional `fromDate`, `toDate`, `status` | Auto-execute |
| `employee.leave.types` | `leaveTypes` | read | low | `{}` | Auto-execute |
| `employee.leave.holidays` | `holidayCalendar` | read | low | optional `month` | Auto-execute |
| `employee.leave.apply` | `applyLeave` | write | medium | `startDate`, `endDate`, `leaveType`; optional `reason`, `halfDay`, `idempotencyKey` | Confirm then execute |
| `employee.leave.cancel` | `cancelLeave` | write | medium | `requestId`; optional `reason` | Confirm then execute |

**Agent responsibilities when calling tools:**

1. Fill args from conversation slots after clarification — **not** from hallucinated IDs.
2. Pass OneCare execution context (tenant, user, correlation, roles, permissions).
3. Prefer idempotency keys for apply when the client supplies or the runtime generates one.
4. Map structured tool errors to user-safe copy (see §10).

**Forbidden:**

- Calling tools outside `allowedTools` for this agent.
- Embedding Keka/SAP field names in user-facing copy as if they were product vocabulary (use neutral leave terms).

---

## 7. Conversation Flows

### 7.1 Leave balance (happy path)

```
User: What's my leave balance?
→ Orchestrator: plan agent=employee intent=employee.leave.balance tools=[leaveBalance]
→ Employee Agent: execute leaveBalance (no confirm)
→ Stream: tool completed + natural-language summary of balances
```

### 7.2 Apply leave (happy path)

```
User: Apply annual leave from 2026-08-10 to 2026-08-12
→ Clarify if leaveType / dates incomplete (§8)
→ Plan: applyLeave with confirmationRequired
→ Emit confirmation_required (summary of dates + type)
→ UI: Approve | Cancel
→ On Approve: re-run / continue with confirmation token → applyLeave
→ Stream: requestId + status (e.g. pending_approval)
```

### 7.3 Cancel leave

```
User: Cancel leave request leave-abc
→ If requestId missing: ask or offer leaveHistory first
→ Confirm cancelLeave
→ Execute → confirm cancelled status
```

### 7.4 Multi-intent

If the user asks balance **and** apply in one message:

1. Orchestrator may produce multi-step plan.
2. Employee Agent executes **reads first**, then mutating steps with confirmation.
3. Do not apply leave until confirmation succeeds.

### 7.5 Handoff

| Signal | Action |
|--------|--------|
| Policy / handbook question | Delegate / route to Knowledge Agent |
| “Approve my team’s leave” | Explain ESS cannot approve others → Manager Agent |
| System outage / connector down | Graceful error; no fake success |

---

## 8. Clarification Rules

Ask **one focused question** at a time when a required slot is missing. Do not call mutating tools with incomplete args.

| Tool | Required slots | Clarification examples |
|------|----------------|------------------------|
| `applyLeave` | `startDate`, `endDate`, `leaveType` | “Which leave type — Annual, Sick, or Casual?” / “What end date?” |
| `cancelLeave` | `requestId` | “Which request should I cancel? I can list recent leave if you want.” |
| `leaveHistory` | none required | Optional filters only if user asks |

**Ambiguity:**

- Relative dates (“next Friday”) → resolve to ISO dates in Application/runtime helpers when available; otherwise ask for an explicit date.
- Overlapping leave types → ask user to pick one type for this request.
- Multiple open requests for cancel → show short list from `leaveHistory`, then ask which `requestId`.

**Never invent:** employee numbers, manager IDs, leave type codes not present in tenant config / prior tool output.

---

## 9. Confirmation Rules

Aligned with [`AI_AGENTS.md`](./AI_AGENTS.md) risk policy and `@onecare/confirmations`.

| Risk | Tools | UX |
|------|-------|-----|
| low | `leaveBalance`, `leaveHistory` | Auto-execute |
| medium | `applyLeave`, `cancelLeave` | Confirmation card: summary + Approve / Cancel |
| high / critical | (future payroll writes, etc.) | Confirm + optional step-up / workflow |

**Confirmation summary must include:**

- Action name (Apply leave / Cancel leave)
- Key args (dates, leave type, requestId)
- That the action affects **their** record only

**On Cancel:** do not execute; acknowledge cancellation of the pending action.  
**On Approve:** bind confirmation id to the same user + tenant; then execute once.  
**Expiry:** pending confirmations expire (default ~15 minutes); ask user to restart the action.

---

## 10. Error Handling

Prefer structured MCP / connector error codes; map to user-safe messages. Never dump stack traces or vendor payloads into chat.

| Condition | User-facing guidance | Retry? |
|-----------|----------------------|--------|
| `POLICY_DENIED` / missing permission | Explain lack of access; suggest contacting admin/HR | No |
| `CONFIRMATION_REQUIRED` | Show confirmation UI | N/A |
| `CONNECTOR_DISABLED` / circuit open | “Leave system is temporarily unavailable. Try again shortly.” | Later |
| `AUTH_SECRET_MISSING` / auth failure | “We couldn’t connect to HR. An admin may need to check the integration.” | No (ops) |
| `TIMEOUT` / network | “That took too long. Please try again.” | Yes (user) |
| `LEAVE_BALANCE_INSUFFICIENT` (when connector returns) | Explain insufficient balance; offer history/balance | No |
| Validation (bad dates) | Ask to correct dates (end ≥ start) | No |
| Unknown tool failure | Generic sorry + correlation id for support | Optional |

**Logging / audit:** every tool execution audited (`mcp.tool.execute`); redact tokens/secrets/PII in args and logs.

---

## 11. Response Style

Tone: **clear, professional, concise** — enterprise assistant, not chatbot banter.

| Do | Don’t |
|----|--------|
| Lead with the answer (“You have 12 Annual days left.”) | Open with filler (“Sure! I’d be happy to…”) |
| Use short bullets for balances / history | Dump raw JSON to the user |
| State next step when blocked (“Approve to submit”) | Pressure the user to confirm |
| Use ISO dates in tool args; human-readable dates in prose | Invent policy interpretations |
| Offer one helpful follow-up when useful | Chain five unsolicited questions |

**Streaming:** emit plan/agent/tool/confirmation events for UI; final assistant text should still stand alone if events are ignored.

**Localization:** respect user locale/timezone when formatting dates (tenant/user prefs); tool args remain ISO `YYYY-MM-DD`.

---

## 12. Memory & Context

| Store | Allowed use |
|-------|-------------|
| Conversation | Last clarified slots for in-flight apply/cancel |
| User memory | Preferences (e.g. preferred leave type) — opt-in / non-sensitive |
| Session | Active conversation id |

**Forbidden in memory:** secrets, payslip binaries, full auth tokens, other employees’ data.

---

## 13. Success Criteria

### 13.1 Contract readiness (this doc)

- [x] Intents, capabilities, permissions, tools, flows, clarification, confirmation, errors, style documented
- [x] Linked from docs index, AI agent catalog, and Cursor topic map

### 13.2 M5 leave slice (implementation gate)

Employee Agent is **done for leave** only when:

1. Orchestrator routes leave balance / apply / cancel / history to `employee`.
2. `leaveBalance` and `leaveHistory` execute via MCP without confirmation and return accurate stub/live data.
3. `applyLeave` / `cancelLeave` require confirmation UX; Approve executes; Cancel does not.
4. Clarification prevents tool calls with missing required slots.
5. Permission denials are user-safe and audited.
6. Planner remains free of leave business rules (rules live in Application / policies / this contract).
7. Eval set: ≥ N golden dialogues (balance, apply happy path, apply clarify, cancel, deny permission, connector down).
8. Typecheck / lint / tests green; no credentials in prompts or logs.

### 13.3 Scale readiness (later)

- New ESS intents added only with updates to this document + tool catalog + permissions.
- Capability flags allow progressive rollout per tenant.
- Eval gates expand per capability family (attendance, payroll, …).

---

## 14. Anti-Patterns

- Monolithic “do everything HR” prompts that bypass Manager/HR/Knowledge agents  
- Hardcoding Keka URLs or schemas in the agent layer  
- Skipping confirmation for write tools “because the demo is slow”  
- Trusting client-supplied `tenantId` / target employee id  
- Treating connector errors as model hallucinations to “fix” with another wrong tool call  

---

## 15. Change Control

1. Update this contract (intents + tools + permissions).  
2. Update [`MCP.md`](./MCP.md) tool schemas if contracts change.  
3. Update agent registry / prompt version / policy config.  
4. Add golden evals.  
5. Ship behind tenant feature flag when risk warrants.

**Document owner:** Platform AI + ESS domain.  
**Reviewers:** Security (for new write/PII tools), Integrations (for new connectors).
