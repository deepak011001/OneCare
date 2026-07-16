# OneCare — Product Requirements Document (PRD)

**Product:** OneCare  
**Tagline:** One Place. Every Answer.  
**Status:** Living Document — Source of Truth  
**Related:** `BRD.md`, `ROADMAP.md`, `UI_GUIDELINES.md`

---

## 1. Product Vision

OneCare is the **Enterprise AI Employee Operating System**: one place where every employee gets answers and completed work across HR, IT, Finance, Knowledge, and more — via natural language, governed agents, and MCP tools.

---

## 2. Product Principles

1. **Outcomes over chat** — Success is completed work, not conversational cleverness.
2. **Agents over monolith** — Domain agents; never a single mega-prompt.
3. **Tools over embedded logic** — Enterprise systems expose MCP tools.
4. **Permissions are non-negotiable** — RBAC + ABAC on every action and retrieval.
5. **Observable by default** — Every plan, tool call, and cost is auditable.
6. **Configurable everything** — No hardcoding of tenants, prompts, models, or connectors.

---

## 3. User Roles

| Role | Capabilities (summary) |
|------|------------------------|
| Employee | ESS intents, knowledge Q&A, personal notifications |
| Manager | ESS + MSS approvals, team views |
| HR | HR cases, policies, employee lifecycle (scoped) |
| Finance | Finance intents, expense/policy (scoped) |
| IT | Helpdesk, identity/access requests (scoped) |
| Recruiter | Recruitment-scoped intents |
| Learning Admin | Learning admin intents |
| System Admin | Tenant config, users, roles, MCP, knowledge, flags |
| Super Admin | Cross-tenant / platform operations |

Exact permission matrices live in Admin + `SECURITY.md`.

---

## 4. Core Modules (Product Surface)

| Module | User Value |
|--------|------------|
| Employee Self Service (ESS) | Leave, profile, payslip, attendance, requests |
| Manager Self Service (MSS) | Approvals, team leave/attendance |
| HR | Cases, policies, lifecycle support |
| Payroll | Payslips, salary history (read; mutations gated) |
| Attendance | Clock in/out, history, exceptions |
| Recruitment | Hiring FAQs / status (scoped) |
| Learning | Courses, assignments, completions |
| Knowledge | Permission-aware RAG over enterprise content |
| Helpdesk | IT tickets, status, resets |
| Travel | Policy Q&A, booking intents (phased) |
| Finance | Expenses, invoices (phased) |
| Analytics | Adoption, resolution, cost, latency |
| Admin Portal | Users, roles, agents, MCP, knowledge, prompts, flags |
| Notification Center | In-app, email, Teams/Slack (phased) |
| Workflow Engine | Multi-step + human approval |
| AI Agent Platform | Orchestration, memory, evaluation |

---

## 5. Primary User Journeys

### 5.1 Employee — Apply Leave

1. User: “I need leave tomorrow.”
2. Orchestrator classifies → ESS / Attendance / Leave path.
3. Agent gathers missing slots (type, dates, reason) via structured forms when needed.
4. MCP `applyLeave` invoked with tenant credentials + user identity.
5. Confirmation + audit + notification to manager if required.

### 5.2 Manager — Approve Leave

1. User: “Approve Rahul’s leave.”
2. ABAC: user must be manager of Rahul (or delegated approver).
3. MCP approval tool + workflow state update.
4. Notify employee; write audit log.

### 5.3 Knowledge — Policy Question

1. User: “What is our travel policy?”
2. Knowledge Agent retrieves with ACL filters.
3. Answer with citations; no tool mutation.

### 5.4 IT — Password Reset

1. User: “Reset my password.”
2. IT Agent plans; may require step-up auth / confirmation.
3. Graph / IdP MCP tool; never log secrets.
4. Result + security audit event.

---

## 6. Functional Requirements

### 6.1 Authentication & Session

- Microsoft Entra ID SSO (OAuth2 / OIDC)
- JWT + server-side session management
- Role binding and attribute claims for ABAC
- Secure logout, token refresh, idle timeout (configurable)

### 6.2 Conversational / Agentic UX

- Streaming responses (WebSocket or SSE)
- Visible **execution plan** for multi-step work (progressive disclosure)
- Confirmation gates for mutating / high-risk actions
- Attachments (where allowed), citations for knowledge
- Feedback (thumbs, comment) → eval / fine-tune backlog

### 6.3 Admin Portal

- Manage users, roles, permissions
- Manage agents (enable/disable, model, temperature, tools allowlist)
- Manage MCP servers (register, health, secrets via vault refs)
- Manage knowledge sources and sync schedules
- Manage prompts (versioned)
- Feature flags, LLM settings, cost monitoring
- Audit logs and feedback review

### 6.4 Memory

| Memory Type | Purpose |
|-------------|---------|
| Conversation | Thread context within retention window |
| User | Preferences, frequent actions, profile hints |
| Enterprise | Org facts allowed for all (non-sensitive) |
| Recent Tasks | Resume / status of prior executions |

Memory must respect retention, PII, and tenant isolation.

### 6.5 Notifications

- In-app notification center
- Email (SMTP / Graph)
- Channel adapters (Teams, Slack) via MCP — phased

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Scalability | Horizontal scale of API, workers, agents; per-tenant isolation of data |
| Performance | p95 chat first-token < 2s; tool round-trips instrumented |
| Availability | Target 99.9% for control plane (tiered SLAs later) |
| Security | See `SECURITY.md` |
| Observability | Logs, metrics, traces, agent/tool/prompt/cost logs |
| Accessibility | WCAG 2.2 AA for web UI |
| i18n | Architecture ready; English first |
| Multi-tenancy | Shared app, isolated data (row-level tenant_id + policies) |

---

## 8. UI Modules (Product Screens)

1. Landing Page  
2. Microsoft Login  
3. Dashboard  
4. Chat Interface (primary work surface)  
5. Employee Portal  
6. Manager Portal  
7. Admin Portal  
8. Knowledge Center  
9. Analytics  
10. Settings / Profile  
11. Notifications  

Design constraints: `UI_GUIDELINES.md`.

---

## 9. Acceptance Criteria (Platform-Level)

- [ ] User can SSO via Entra and land in Chat with correct role context
- [ ] Mutating tool calls require confirmation when risk ≥ medium
- [ ] All tool invocations write audit + cost + latency records
- [ ] Knowledge answers never return docs the user cannot access
- [ ] Feature flags can disable any agent or MCP server per tenant without deploy
- [ ] No secrets in source, logs, or client payloads

---

## 10. Explicit Non-Goals (Product)

- Replacing systems of record
- Unsupervised bulk payroll mutations
- Training customer models on other tenants’ data
