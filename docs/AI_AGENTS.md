# OneCare — AI Agents Platform

**Status:** Living Document — Source of Truth  
**Rule:** Never use one monolithic AI. Multi-agent by design.

---

## 1. Design Goals

- **Separation of concerns** — each agent owns a domain capability set  
- **Independent extensibility** — add tools/prompts without touching others  
- **Governed execution** — plans, confirmations, budgets, audit  
- **Eval-ready** — golden datasets per agent  
- **Config-driven** — models, temperatures, tool allowlists, feature flags per tenant  

---

## 2. Agent Catalog

| Agent | Responsibility | Typical Tools (MCP) |
|-------|----------------|---------------------|
| Master Orchestrator | Intent classification, planning, routing, synthesis | (meta) agent invocation, memory read |
| ESS Agent | Employee self-service | leave, profile, attendance (read) |
| MSS Agent | Manager actions | approvals, team leave/attendance |
| HR Agent | HR cases & policies | HRIS tools, knowledge handoff |
| Payroll Agent | Payslips, salary history | payroll MCP |
| Attendance Agent | Clock in/out, history | attendance MCP |
| IT Agent | Tickets, resets, access | ServiceNow/Jira/Graph |
| Finance Agent | Expenses, invoices (phased) | finance MCP |
| Knowledge Agent | RAG Q&A with citations | vector search, doc fetch |
| Recruitment Agent | Hiring-scoped intents | ATS MCP |
| Learning Agent | LMS intents | learning MCP |
| Analytics Agent | Metrics narratives (read-only) | analytics APIs |
| Notification Agent | Fan-out messages | email, Teams, Slack MCP |
| Workflow Agent | Long-running process steps | workflow engine ports |

Additional specialized agents may be added; register in Admin + config.

---

## 3. Orchestration Pattern

```
                 ┌─────────────────────┐
 User message →  │ Master Orchestrator │
                 └──────────┬──────────┘
                            │ plan: [steps...]
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   Domain Agent A    Domain Agent B    Knowledge Agent
          │                 │                 │
          ▼                 ▼                 ▼
      MCP Tools         MCP Tools        Retriever
          └─────────────────┼─────────────────┘
                            ▼
                   Synthesize + Stream
```

**Orchestrator responsibilities:**

1. Load tenant/user context + memory  
2. Classify intent(s); detect multi-intent  
3. Produce an **execution plan** (structured JSON)  
4. Delegate to domain agents with scoped context  
5. Enforce global policies (risk, budget, PII)  
6. Merge results into a user-facing outcome  

**Orchestrator must not** call enterprise APIs directly — only via domain agents / tools.

---

## 4. Agent Contract (Required Shape)

Every agent implements:

```typescript
interface AgentContext {
  tenantId: string;
  userId: string;
  roles: string[];
  attributes: Record<string, unknown>; // ABAC
  conversationId: string;
  traceId: string;
  memory: AgentMemorySlice;
  featureFlags: Record<string, boolean>;
}

interface AgentPlanStep {
  id: string;
  action: string;
  tool?: string;
  args?: Record<string, unknown>;
  requiresConfirmation: boolean;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

interface AgentResult {
  status: 'completed' | 'needs_input' | 'needs_confirmation' | 'failed' | 'delegated';
  message: string;          // user-safe
  data?: unknown;           // structured payload for UI
  citations?: Citation[];
  toolCalls?: ToolCallLog[];
  nextQuestions?: string[];
}
```

Agents are registered:

```typescript
interface AgentDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  allowedTools: string[];      // MCP tool names
  allowedModels: string[];
  systemPromptRef: string;     // versioned prompt ID
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  enabled: boolean;
}
```

---

## 5. Runtime (Orchestrator + Typed State)

Preferred long-term: **LangGraph** (or equivalent) state machine per conversation turn.

**M3 status:** A provider-independent **Master Orchestrator** implements the same node sequence without embedding LangGraph/OpenAI SDKs in Domain packages:

`load conversation → plan → select agent → render prompts → stream LLM → update memory → observe`

**State (minimum):**

- messages  
- plan  
- activeAgent  
- toolResults  
- riskFlags  
- tokenUsage / cost  
- awaitingConfirmation  

**Nodes:** classify → plan → route → act → confirm → synthesize → persist  

LangGraph may wrap this orchestrator later via an Infrastructure adapter (ADR). Do not mix two runtimes inside one agent without an ADR.

---

## 6. Memory Architecture

| Type | Store | Scope | Notes |
|------|-------|-------|-------|
| Conversation | PostgreSQL | thread | Retention policy per tenant |
| User | PostgreSQL | user | Preferences, frequent actions |
| Enterprise | PostgreSQL / RAG | tenant | Non-sensitive org facts |
| Working (short-term) | Redis | session/run | Ephemeral plan state |
| Vector memory | pgvector | tenant + ACL | Knowledge chunks |

**Rules:**

- Never store secrets or raw payslip binaries in memory tables  
- PII fields marked and maskable in logs  
- Memory writes go through Application use cases (not free-form LLM writes to DB)

---

## 7. Confirmation & Risk Policy

| Risk | Examples | Default UX |
|------|----------|------------|
| low | leaveBalance, policy Q&A | Auto-execute |
| medium | applyLeave, createTicket | Confirm |
| high | password reset, access grant | Confirm + step-up if configured |
| critical | bulk deletes, payroll write | Block unless Workflow approval |

Policy is **config**, not hardcoded in prompts.

---

## 8. Prompt Management

- Prompts stored versioned (`prompt_id`, `version`, `content`, `hash`)  
- Agents reference prompt by ID + pinned version or “active”  
- Changes via Admin with audit; rollback supported  
- No production prompt edits only in Git without tenant override path  

---

## 9. Evaluation & Quality

Per agent:

- Golden conversation set  
- Tool-call expectation tests  
- RAG faithfulness / citation checks (Knowledge)  
- Regression gate in CI for critical agents (ESS, Orchestrator)

---

## 10. Cost & Latency Controls

- Per-tenant and per-user budgets  
- Model routing (cheap classifier → stronger executor)  
- Max tool iterations  
- Cache embeddings and frequent policy answers (with invalidation)

---

## 11. Extending with a New Agent

1. Define domain + tools in `MCP.md` style contract  
2. Add `AgentDefinition` + prompts  
3. Implement graph node / handler in agents module  
4. Register route rules in Orchestrator config  
5. Feature flag default **off**  
6. Tests + eval set  
7. Admin enablement  

---

## 12. Anti-Patterns

- One mega system prompt for all domains  
- Letting the LLM invent tool names not in allowlist  
- Silent mutating tool calls  
- Sharing raw tool credentials with the model  
- Cross-tenant memory retrieval  

---

## Related

`MCP.md` · `WORKFLOWS.md` · `SECURITY.md` · `ARCHITECTURE.md`
