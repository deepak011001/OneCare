# OneCare — Model Context Protocol (MCP)

**Status:** Living Document — Source of Truth  
**Rule:** Every enterprise system becomes an MCP Server. Integrations expose **tools**, not business logic.

---

## 1. Why MCP

| Benefit | Explanation |
|---------|-------------|
| Contract stability | Agents depend on tool schemas, not vendor SDKs |
| Swappability | Replace Keka with SAP SuccessFactors behind same tools |
| Security boundary | Credentials stay in MCP server; agents get least-privilege tokens |
| Independent deploy | Each connector versions and scales alone |
| Microservice-ready | MCP servers are already separate processes |

---

## 2. Architecture

```
┌──────────────┐     MCP (stdio/HTTP/SSE)     ┌─────────────────┐
│ Agent Worker │ ───────────────────────────▶ │ MCP Server      │
│ (client)     │ ◀─────────────────────────── │ (Leave/Graph/…) │
└──────────────┘      tools/list, tools/call  └────────┬────────┘
                                                       │
                                                       ▼
                                              External System API
```

OneCare hosts an **MCP Client Gateway** (`apps/mcp-gateway`, `@onecare/mcp`) that:

- Resolves tenant → connector registrations  
- Injects auth material from secret store (`secret_ref` / env — never from LLM)  
- Enforces tool allowlists + `@onecare/policies` execution policies  
- Supports confirmation gates via `@onecare/confirmations`  
- Logs tool calls (name, latency, status, redacted args) + audit events  
- Applies circuit breakers, timeouts, and retries  

Connectors implement `@onecare/connector-sdk` (`packages/connectors/*`). The API exposes `/v1/mcp/*` for discovery and execution; the AI runtime invokes tools through the same gateway (planner unchanged).

---

## 3. Server Packaging

```
mcp-servers/
├── leave-keka/
├── leave-stub/          # contract-compatible stub for local/dev
├── ms-graph/
├── servicenow/
├── sharepoint-knowledge/
└── _templates/mcp-server/
```

Each server:

- Own `package.json` / Dockerfile  
- Semantic versioning  
- OpenAPI or JSON Schema for tools  
- Health endpoint  
- Structured logs with correlation IDs  

---

## 4. Tool Design Standards

### 4.1 Naming

- Verb + noun, camelCase: `applyLeave`, `leaveBalance`, `createTicket`  
- No vendor names in tool IDs (`applyLeave` not `kekaApplyLeave`)  
- Vendor specifics stay inside the server implementation  

### 4.2 Schema

Every tool declares:

- `inputSchema` (JSON Schema, strict)  
- `outputSchema`  
- Idempotency behavior  
- Side-effect class: `read` | `write` | `destructive`  
- Risk hint: `low` | `medium` | `high` | `critical`  

### 4.3 Identity Propagation

Tools receive a **OneCare execution context** header/payload:

```json
{
  "tenantId": "…",
  "userId": "…",
  "userEmail": "…",
  "correlationId": "…",
  "roles": ["Employee"],
  "attributes": { "managerId": "…", "department": "…" }
}
```

MCP server maps this to vendor identity (SCIM ID, email, employee number) via tenant mapping tables — **not** via LLM guessing.

---

## 5. Canonical Tool Catalog (Initial)

### Leave

| Tool | Side Effect | Risk |
|------|-------------|------|
| `leaveBalance` | read | low |
| `applyLeave` | write | medium |
| `cancelLeave` | write | medium |
| `leaveHistory` | read | low |

### Attendance

| Tool | Side Effect | Risk |
|------|-------------|------|
| `clockIn` | write | medium |
| `clockOut` | write | medium |
| `attendanceHistory` | read | low |

### Payroll

| Tool | Side Effect | Risk |
|------|-------------|------|
| `downloadPayslip` | read | medium (PII) |
| `salaryHistory` | read | high (PII) |

### IT / Helpdesk

| Tool | Side Effect | Risk |
|------|-------------|------|
| `createTicket` | write | medium |
| `getTicketStatus` | read | low |
| `resetPassword` | write | high |

### Knowledge (if exposed as tools)

| Tool | Side Effect | Risk |
|------|-------------|------|
| `searchKnowledge` | read | low |
| `getDocumentChunk` | read | low |

Expand via ADRs; keep Admin-visible catalog.

---

## 6. Example Tool Contracts

### `applyLeave`

**Input:**

```json
{
  "type": "object",
  "required": ["startDate", "endDate", "leaveType"],
  "properties": {
    "startDate": { "type": "string", "format": "date" },
    "endDate": { "type": "string", "format": "date" },
    "leaveType": { "type": "string" },
    "reason": { "type": "string", "maxLength": 1000 },
    "idempotencyKey": { "type": "string" }
  }
}
```

**Output:**

```json
{
  "requestId": "string",
  "status": "pending_approval|approved|rejected",
  "balanceRemaining": { "type": "number" }
}
```

---

## 7. Security Requirements for MCP Servers

1. Authenticate gateway → server (mTLS or signed service tokens)  
2. Authorize user context against vendor permissions  
3. Secret material only from vault / env — never in tool args from model  
4. Redact PII in logs (payslip URLs, SSNs, passwords)  
5. Timeouts mandatory; no unbounded retries without jitter + cap  
6. Input validation reject unknown fields (prefer `additionalProperties: false`)  

---

## 8. Error Model

Return structured errors:

```json
{
  "code": "LEAVE_BALANCE_INSUFFICIENT",
  "message": "User-safe message",
  "retryable": false,
  "details": {}
}
```

Agents map codes to user guidance; never dump stack traces to UI.

---

## 9. Versioning & Compatibility

- Tool names stable; additive optional fields OK  
- Breaking changes → new tool version suffix or new server major  
- Gateway supports multiple server versions per tenant during migration  

---

## 10. Target MCP Servers (Roadmap)

Keka · Microsoft Graph · Outlook · Teams · SharePoint · Confluence · Slack · ServiceNow · Jira · GitHub · SAP · Oracle · Google Workspace · Salesforce  

Each requires: contract doc, stub, adapter, contract tests.

---

## 11. Anti-Patterns

- Putting leave approval **business rules** only inside Keka adapter with no Workflow visibility  
- Agent constructing raw REST URLs  
- One MCP server that wraps “all vendors” as a god-adapter  
- Returning HTML error pages to the agent  

---

## Related

`INTEGRATIONS.md` · `AI_AGENTS.md` · `SECURITY.md` · `API_STANDARDS.md`
