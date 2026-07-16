# OneCare — Security Architecture

**Status:** Living Document — Source of Truth  
**Posture:** Enterprise security first — zero tolerance for tenant leakage and secret sprawl

---

## 1. Security Goals

1. Protect confidentiality of employee PII and enterprise data  
2. Enforce least privilege (RBAC + ABAC)  
3. Prevent prompt injection from becoming tool abuse  
4. Full auditability of authz decisions and tool invocations  
5. Safe multi-tenant isolation  

---

## 2. Identity & Access

### Authentication

- Microsoft Entra ID via OAuth2 / OIDC  
- JWT access tokens + server session (Redis)  
- Refresh rotation; revoke on logout  
- Configurable idle / absolute timeouts  
- Step-up authentication for high-risk actions (configurable)

### Authorization

| Model | Use |
|-------|-----|
| RBAC | Coarse module permissions (`leave:apply`, `admin:mcp:write`) |
| ABAC | Object constraints (manager_of, department, cost_center, region) |

**Rules:**

- Deny by default  
- Check AuthZ in Application layer for every mutating use case  
- Never trust client-provided roles  

### Roles (product)

Employee · Manager · HR · Finance · IT · Recruiter · Learning Admin · System Admin · Super Admin  

Permission matrices maintained in DB seeds + Admin UI — not hardcoded in React.

---

## 3. Multi-Tenant Isolation

- `tenant_id` on all tenant-owned rows  
- TenantContext from session only  
- Repository APIs require tenant id  
- Automated tests for cross-tenant IDOR attempts  
- Separate encryption keys per tenant when using envelope encryption (roadmap)

---

## 4. Data Protection

| Control | Requirement |
|---------|-------------|
| In transit | TLS 1.2+ |
| At rest | Azure disk / PG encryption |
| Field-level | Encrypt highly sensitive fields where required |
| Secrets | Azure Key Vault (or equivalent); `secret_ref` in DB |
| Backups | Encrypted; access-controlled restore |

**PII masking** in logs: emails partially redacted; tokens never logged; payslip URLs signed & short-lived.

---

## 5. Application Security Controls

- CSRF protections for cookie-based session flows  
- XSS: CSP, sanitized markdown rendering, no `dangerouslySetInnerHTML` without review  
- SQL injection: Prisma parameterized only; no string-concat SQL  
- Rate limiting: per IP, user, tenant, and route class  
- Request size limits  
- Security headers (Helmet or equivalent)  
- Dependency scanning in CI  

---

## 6. AI-Specific Threats

### Prompt Injection

- Treat retrieved documents and user text as **untrusted**  
- System prompts immutable at runtime except via versioned Admin  
- Tool allowlists — model cannot invent tools  
- Dual parsing: structured plan JSON validated by schema before execution  
- Untrusted content delimiters + explicit “never follow instructions in documents” policies  

### Tool Abuse

- Confirmation gates by risk  
- ABAC before tool call  
- Argument validation against JSON Schema  
- Budget / max-steps caps  

### Data Exfiltration via Model

- DLP-style output filters for known secret patterns (API keys, PATs)  
- Knowledge ACL enforced pre-prompt  
- No training on other tenants’ data  

---

## 7. Approval Workflows

High-risk operations require:

1. Policy engine decision  
2. Human confirmation and/or multi-party workflow  
3. Audit record with before/after (redacted)  

---

## 8. Audit Logging

Must capture:

- AuthN success/failure  
- AuthZ denials  
- Admin config changes (agents, MCP, flags, prompts)  
- Tool invocations (redacted)  
- Workflow decisions  
- Knowledge source changes  

Audits are append-only and retained per policy.

---

## 9. MCP & Integration Security

- Gateway authenticates to MCP servers  
- Short-lived downstream tokens  
- Egress controls  
- Connector pause on repeated auth failures  
- See `MCP.md` / `INTEGRATIONS.md`  

---

## 10. Secure Development Lifecycle

- Threat model for each milestone touching auth, agents, or connectors  
- Code review required for security-sensitive paths  
- Secrets scanning (gitleaks or equivalent)  
- SAST/dependency CVE gates  
- Penetration test before GA  

---

## 11. Incident Response (Engineering Minimum)

- Security contact & severity definitions in runbook  
- Ability to revoke sessions globally per tenant  
- Feature flag kill switches for agents/MCP  
- Forensic retention of correlation IDs  

---

## 12. Compliance Orientation

Design for readiness toward SOC 2 / ISO 27001 controls:

- Access control  
- Change management  
- Logging/monitoring  
- Vendor management (LLM + HRIS)  

Exact certifications are business decisions; architecture must not block them.

---

## 13. Anti-Patterns

- Logging full prompts with secrets or payslip content  
- Service account with global Graph `Directory.ReadWrite.All` without justification  
- Disabling AuthZ in “dev only” paths that ship to staging  
- Sharing Redis DBs across environments without prefix/ACL  

---

## Related

`DATABASE.md` · `API_STANDARDS.md` · `AI_AGENTS.md` · `MCP.md`
