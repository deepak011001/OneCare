# OneCare — Business Requirements Document (BRD)

**Product:** OneCare  
**Tagline:** One Place. Every Answer.  
**Document Type:** Business Requirements  
**Status:** Living Document — Source of Truth  
**Audience:** Product, Engineering, Security, Leadership

---

## 1. Executive Summary

OneCare is an **Enterprise Agentic AI Platform** — an AI Employee Operating System — that enables employees, managers, HR, Finance, IT, and leadership to complete everyday enterprise operations through natural language.

OneCare is **not** a chatbot and **not** only an HR assistant. Users ask OneCare; the platform understands intent, plans execution, invokes enterprise tools via MCP, runs workflows, and returns a completed outcome.

**Comparable products:** Leena AI, Moveworks, Microsoft Copilot, ServiceNow AI, Glean.

---

## 2. Problem Statement

Enterprise employees interact with dozens of systems daily (HRIS, payroll, ITSM, email, knowledge bases, finance, LMS). This creates:

| Pain | Impact |
|------|--------|
| Tool sprawl | Context switching, lost productivity |
| Tribal knowledge | Policies hard to find; inconsistent answers |
| Slow service desks | Ticket queues for routine requests |
| Fragmented approvals | Managers bounce between portals |
| Poor automation ROI | Point integrations that do not scale |
| Shadow IT / AI risk | Uncontrolled LLM usage with no audit trail |

---

## 3. Business Goals

1. **Single conversational entry point** for enterprise work across domains.
2. **Measurable deflection** of Tier-1 HR/IT/Finance requests via autonomous resolution.
3. **Governed AI** with RBAC/ABAC, audit, PII controls, and approval workflows.
4. **Extensible integration fabric** (MCP-first) so every system exposes tools, not embedded business logic.
5. **Multi-tenant SaaS** capable of serving thousands of organizations securely.
6. **Time-to-value** measured in weeks for new connectors and agents, not quarters.

---

## 4. Success Metrics (KPIs)

| Metric | Target (Year 1) |
|--------|-----------------|
| Autonomous resolution rate (no human handoff) | ≥ 60% of eligible intents |
| Median time-to-resolution (automated) | < 30 seconds |
| Knowledge answer accuracy (human-rated) | ≥ 90% |
| CSAT / thumbs-up on AI outcomes | ≥ 4.2 / 5 |
| Integration time for standard MCP connector | < 2 engineer-weeks |
| Security: critical findings open > 30 days | 0 |
| Tenant isolation incidents | 0 |

---

## 5. Stakeholders & Personas

| Persona | Primary Needs |
|---------|---------------|
| Employee | Leave, payslip, password, policy Q&A, tickets, bookings |
| Manager | Approvals, team leave/attendance, coaching insights |
| HR | Policies, cases, lifecycle events, compliance |
| Finance | Expense, invoices, policy checks |
| IT | Access, tickets, resets, asset requests |
| Recruiter | Requisition status, candidate FAQs (scoped) |
| Learning Admin | Course assignment, completion queries |
| System Admin | Users, roles, connectors, feature flags |
| Super Admin | Tenant ops, billing, global config, LLM cost |
| Leadership | Analytics, adoption, cost, risk posture |

---

## 6. In Scope (Business)

- Multi-agent AI orchestration for enterprise intents
- Employee / Manager / Admin experiences
- Knowledge (RAG) with permission-aware retrieval
- Workflow engine for multi-step and approval flows
- MCP-based enterprise integrations
- Notification center
- Observability, audit, cost monitoring
- Multi-tenancy, SSO (Microsoft Entra ID)

## 7. Out of Scope (Initial Releases)

- Replacing core systems of record (Keka, SAP, ServiceNow, etc.)
- Fully autonomous high-risk financial postings without approval
- Consumer / B2C use cases
- On-device offline AI as primary runtime

---

## 8. Business Constraints

- Enterprise security and compliance first (see `SECURITY.md`)
- No hardcoded secrets, tenants, or vendor credentials
- Every capability must be configurable per tenant
- Modules must be separable into microservices later
- Milestone-based delivery; each milestone production-compilable

---

## 9. Assumptions

- Customers primarily use Microsoft Entra ID for identity
- Systems of record remain authoritative; OneCare orchestrates
- LLMs are consumable via approved providers (OpenAI and configurable)
- Network egress to MCP servers and enterprise APIs is allowed under customer policy

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Hallucinated actions | Tool-only execution; confirmations for mutating ops; dry-run modes |
| Permission leakage in RAG | Document ACL indexing + query-time filters |
| Cost runaway | Budgets, rate limits, model routing, cost dashboards |
| Integration fragility | Circuit breakers, retries, contract tests, versioned tools |
| Over-coupling | Clean Architecture + feature modules + MCP boundaries |

---

## 11. Related Documents

- `PRD.md` — Product requirements  
- `ARCHITECTURE.md` — System architecture  
- `ROADMAP.md` — Milestones  
- `SECURITY.md` — Security requirements  
