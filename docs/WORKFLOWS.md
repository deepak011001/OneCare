# OneCare — Workflows

**Status:** Living Document — Source of Truth  
**Module:** Workflow Engine + Workflow Agent

---

## 1. Purpose

Enterprise operations are rarely single-tool calls. Workflows provide **durable, auditable, multi-step processes** with human approvals, timers, and compensations.

Examples:

- Leave request → manager approval → HRIS update → notify employee  
- Access request → manager + IT approval → provision → notify  
- Expense → policy check → finance approval → ERP post  

---

## 2. Design Principles

1. **Durable execution** — survive process restarts (DB-backed state)  
2. **Explicit graphs** — versioned workflow definitions, not ad-hoc chat history  
3. **Human tasks as first-class** — assignees, due dates, escalation  
4. **Idempotent steps** — safe retries  
5. **Separation** — Workflow Engine owns state; MCP tools own side effects  
6. **Observable** — every transition audited  

---

## 3. Architecture

```
Chat / API / Scheduler / Webhook
            │
            ▼
   Workflow Application Service
            │
            ▼
   Workflow Engine (state machine)
       │         │         │
       ▼         ▼         ▼
  Human Task   MCP Tool   Timer/Wait
       │         │         │
       └─────────┴─────────┘
                 │
                 ▼
         Domain Events → Notifications / Analytics
```

**Workflow Agent** translates natural language (“approve Rahul’s leave”) into engine commands after ABAC checks — it does not bypass the engine for approvals that are workflow-governed.

---

## 4. Definition Model

Workflow definitions are versioned JSON/YAML graphs:

```json
{
  "code": "leave.approval.v1",
  "version": 3,
  "start": "submit",
  "nodes": [
    { "id": "submit", "type": "task.tool", "tool": "applyLeave", "next": "await_manager" },
    { "id": "await_manager", "type": "task.human", "assignee": "manager_of_subject", "next": "branch" },
    { "id": "branch", "type": "gateway.exclusive", "routes": [
      { "when": "approved", "next": "notify_employee" },
      { "when": "rejected", "next": "notify_rejected" }
    ]},
    { "id": "notify_employee", "type": "task.agent", "agent": "notification", "end": true }
  ]
}
```

Stored in `workflow_definitions` (see `DATABASE.md`).

---

## 5. Instance Lifecycle

```
created → running → waiting (human/timer) → running → completed
                                  ↘ cancelled / failed / compensated
```

Transitions persist:

- from_state, to_state  
- actor (user/system)  
- correlation_id  
- payload diff (redacted)  

---

## 6. Human Task UX

- Manager Portal **Approval Inbox**  
- Chat shortcuts (“approve latest leave”) resolve to specific `workflow_tasks`  
- Snooze / escalate / reassign (permissions required)  
- SLA timers via BullMQ delayed jobs  

---

## 7. Correlation with Agents

| Concern | Owner |
|---------|-------|
| Intent understanding | Orchestrator / Domain Agent |
| Policy confirmation | Confirmation policy engine |
| Long-running state | Workflow Engine |
| Side effects | MCP tools |
| User messaging | Notification Agent / Chat |

Agents may **start** or **signal** workflows; they must not keep approval state only in LLM memory.

---

## 8. Compensation & Failure

- Each write step declares compensations where feasible (`cancelLeave` after failed notify is optional — product decision)  
- Failed tool calls: retry policy by error `retryable` flag  
- Poison messages: park + alert; never infinite retry  

---

## 9. Security

- Start workflow: permission `workflow:{code}:start`  
- Approve task: assignee or delegated role + ABAC  
- Admin cancel: `workflow:instance:cancel`  
- All actions audited  

---

## 10. Implementation Notes (NestJS)

- Application service: `StartWorkflow`, `SignalTask`, `AdvanceInstance`  
- Infrastructure: Prisma repositories + BullMQ schedulers  
- Outbox for events after commit  
- Deterministic handlers — no LLM inside engine core  

---

## 11. Testing

- Unit: transition table  
- Integration: leave approval happy path + rejection  
- Chaos: worker crash mid-step → resume  

---

## Related

`AI_AGENTS.md` · `MCP.md` · `DATABASE.md` · `SECURITY.md`
