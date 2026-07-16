# OneCare — Integrations

**Status:** Living Document — Source of Truth  
**Rule:** Prefer MCP tools as the agent-facing contract. Lower-level protocols live behind adapters.

---

## 1. Integration Strategy

```
Agents / Workflows
        │
        ▼
 MCP Client Gateway  ←── primary AI boundary
        │
        ▼
 MCP Servers (per system)
        │
        ▼
 Protocol Adapters (REST, GraphQL, SOAP, …)
        │
        ▼
 External Systems
```

**Do not** call vendor REST APIs directly from Nest controllers or LangGraph nodes. Always go through ports → MCP or Integration Application services.

---

## 2. Supported Protocols & Patterns

| Protocol / Pattern | Use When | Notes |
|--------------------|----------|-------|
| REST | Most SaaS APIs | Default adapter |
| GraphQL | Graph-like APIs (e.g., some GitHub) | Typed operations |
| SOAP | Legacy ERP/HR | WSDL clients isolated |
| SMTP / IMAP / POP3 | Email send/receive | Prefer Graph where Entra-centric |
| Webhooks | Inbound events | Signed, idempotent handlers |
| Kafka | High-volume streams | Optional enterprise bus |
| RabbitMQ | Work queues | Prefer BullMQ internally unless customer bus |
| Azure Service Bus | Azure-centric customers | Adapter pack |
| SCIM | User provisioning | Inbound/outbound |
| LDAP | Directory sync (legacy) | Read-heavy |
| SAML | SSO alternative | Beside OIDC |
| OAuth2 / OIDC | Auth to vendors | Token vault |
| FTP / SFTP | Batch files | Scheduled workers |
| CSV / Excel import | Bulk loads | Validated pipelines |
| DB connectors | Rare; last resort | Read replicas only; careful tenancy |
| Playwright / browser automation | No API available | Fragile; quarantine + strong monitoring |

---

## 3. Connector Lifecycle

1. **Contract** — tool schemas in `MCP.md` style  
2. **Stub server** — deterministic local MCP for CI  
3. **Adapter** — real vendor implementation  
4. **Contract tests** — stub ↔ adapter behavioral parity  
5. **Tenant config** — endpoint, secret_ref, field mappings  
6. **Health checks** — periodic `tools/list` + auth probe  
7. **Feature flag** — enable per tenant  

---

## 4. Inbound Integrations

### Webhooks

- Verify signatures (HMAC / vendor scheme)  
- Tenant resolution via path or app id mapping  
- Idempotency keys stored in Redis/DB  
- Enqueue to BullMQ; acknowledge quickly  

### SCIM

- Provision/deprovision users into OneCare tenant  
- Map groups → roles carefully (explicit mapping table)  

### Email ingress (optional)

- Prefer Graph subscriptions over IMAP polling  

---

## 5. Outbound Integrations

- Central HTTP client: timeouts, retries, circuit breaker, tracing headers  
- OAuth token refresh in Infrastructure with locked refresh (avoid stampedes)  
- Rate-limit awareness per vendor  

---

## 6. Microsoft Ecosystem (Priority)

| System | Purpose |
|--------|---------|
| Entra ID | SSO, users, groups |
| Microsoft Graph | Mail, calendar, Teams, users |
| SharePoint / OneDrive | Knowledge sources |
| Outlook | Notifications / meeting intents |

Use official Graph permissions least-privilege; admin consent documented.

---

## 7. HR / IT / Work Systems (Priority)

| System | Domains |
|--------|---------|
| Keka (or customer HRIS) | Leave, attendance, employees |
| ServiceNow / Jira | ITSM tickets |
| Slack / Teams | Notifications, optional chat surface |
| SAP / Oracle | Finance / ERP (later) |
| Salesforce | CRM (later) |
| Confluence / Wiki | Knowledge |
| Google Workspace | Alt productivity suite |

---

## 8. Knowledge Ingestion Connectors

See also Knowledge section in `PRD.md` / `DATABASE.md`.

Pipeline:

```
Source connector → fetch → extract text → chunk → embed → index ACL → store
```

Supported sources (phased): SharePoint, Confluence, PDF, Word, Excel, PowerPoint, OneDrive, Google Drive, Wiki, FAQs, Policies.

---

## 9. Mapping & Transformation

- Field mapping config per tenant (employeeId ↔ email ↔ vendorId)  
- Transformations in adapter layer, unit-tested  
- Never ask the LLM to invent employee IDs for tool calls when directory lookup exists  

---

## 10. Failure Modes

| Mode | Handling |
|------|----------|
| Vendor 5xx | Retry with backoff; circuit open |
| Auth failure | Alert admin; pause connector |
| Partial batch | Checkpoint cursors |
| Schema drift | Contract test fail → block deploy |

---

## 11. Security

- Secrets in vault; rotate  
- Egress allowlists where required  
- PII minimization in payloads and logs  
- Dual-control for destructive connectors  

Details: `SECURITY.md`.

---

## 12. Anti-Patterns

- Copy-pasting Axios calls into every feature module  
- Embedding vendor SDK types into Domain layer  
- Using browser automation when a stable API exists  
- Synchronous long imports on API request threads  

---

## Related

`MCP.md` · `ARCHITECTURE.md` · `SECURITY.md` · `WORKFLOWS.md`
