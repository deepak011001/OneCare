# OneCare — Cursor Rules (Source of Truth Guide)

**Status:** Living Document  
**Purpose:** Tell humans and Cursor how to use `/docs` and `.cursor/rules` together.

---

## 1. Hierarchy of Truth

```
docs/*.md              ← Product & architecture SOURCE OF TRUTH
        ▲
        │ referenced by
        │
.cursor/rules/*.mdc    ← Short, enforceable agent rules (pointers + must/must-not)
        ▲
        │ applied during
        │
Cursor Agent sessions  ← Implementation must comply
```

If a rule and a doc ever conflict, **update the doc first**, then tighten the rule. Do not invent standards only inside `.mdc` files.

---

## 2. Document Map — When to Read What

| Task | Read first |
|------|------------|
| Any feature work | `ARCHITECTURE.md`, `CODING_GUIDELINES.md`, `ROADMAP.md` |
| Product scope / persona | `BRD.md`, `PRD.md` |
| NestJS / APIs | `API_STANDARDS.md`, `ARCHITECTURE.md` |
| Next.js / UI | `UI_GUIDELINES.md`, `CODING_GUIDELINES.md` |
| Agents / LangGraph | `AI_AGENTS.md`, `MCP.md` |
| Employee / ESS Agent | `EMPLOYEE_AGENT.md`, `EMPLOYEE_CAPABILITY_FRAMEWORK.md`, `KNOWLEDGE_CAPABILITY.md`, `MCP.md`, `AI_AGENTS.md` |
| Prisma / schema | `DATABASE.md`, `SECURITY.md` |
| Connectors | `MCP.md`, `INTEGRATIONS.md` |
| Approvals / long-running | `WORKFLOWS.md` |
| AuthZ, PII, tenancy | `SECURITY.md` |

---

## 3. Standing Orders for Cursor (All Sessions)

1. **Architect first** — explain structure, dependencies, tradeoffs before large code generation.  
2. **Milestone discipline** — implement only the current milestone slice; no “build everything.”  
3. **Clean Architecture** — no business logic in controllers or React components.  
4. **Multi-agent** — never a monolithic AI god-prompt.  
5. **MCP tools** — enterprise side effects via MCP, not ad-hoc vendor calls in agents.  
6. **Multi-tenant** — every domain row and query is tenant-scoped.  
7. **Configurable** — no hardcoded secrets, tenant IDs, model names, or feature switches in code.  
8. **No tech debt demos** — production patterns even in early milestones.  
9. **Update docs** when architecture or contracts change.  
10. **Challenge bad requests** — propose a better approach before implementing a poor one.

---

## 4. `.cursor/rules` Files

| File | Mode | Intent |
|------|------|--------|
| `onecare-core.mdc` | alwaysApply | Identity, docs hierarchy, standing orders |
| `security.mdc` | alwaysApply | Tenancy, secrets, AuthZ, AI abuse |
| `architecture.mdc` | alwaysApply | Layers, modules, no spaghetti |
| `backend-nestjs.mdc` | `apps/api/**`, `**/*.module.ts` | Nest feature layout |
| `frontend-nextjs.mdc` | `apps/web/**` | UI and Next patterns |
| `database-prisma.mdc` | `**/schema.prisma`, `**/migrations/**` | Schema standards |
| `ai-agents.mdc` | `**/agents/**`, `**/mcp-servers/**` | Agents + MCP |
| `api-standards.mdc` | `**/controllers/**`, `**/dto/**` | HTTP contracts |

Rules stay **short**; details live in `/docs`.

---

## 5. Definition of Done (Agent Checklist)

Before finishing a coding task:

- [ ] Matches current roadmap milestone intent  
- [ ] Respects layer boundaries  
- [ ] Tenant + AuthZ considered  
- [ ] Errors typed and mapped  
- [ ] No secrets committed  
- [ ] Tests for critical path (or explicit reason deferred)  
- [ ] Relevant `docs/*` updated if behavior/architecture changed  

---

## 6. How Engineers Should Prompt Cursor

Good:

> Implement M4 leave balance tool per `docs/MCP.md` and `docs/ROADMAP.md`. Follow Clean Architecture in `apps/api` feature `ess-leave`.

Bad:

> Build the whole AI platform with all agents and integrations.

---

## 7. Changing Standards

1. Edit the relevant `docs/*.md`  
2. Adjust `.cursor/rules/*.mdc` pointers/musts if needed  
3. Note in PR: “Standards update”  
4. Add ADR under `docs/adr/` for significant decisions  

---

## Related

All files in `/docs` · `.cursor/rules/*`
