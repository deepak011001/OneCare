# OneCare — Database Design

**Status:** Living Document — Source of Truth  
**Stack:** PostgreSQL · Prisma ORM · pgvector · Redis (non-relational)

---

## 1. Design Principles

1. **Normalize properly** — avoid duplicate source-of-truth fields  
2. **Multi-tenant first** — every tenant-owned row includes `tenant_id`  
3. **Soft deletes** — `deleted_at` where recovery/audit matters  
4. **Audit fields** — `created_at`, `updated_at`, `created_by`, `updated_by`  
5. **Versioning** — prompts, policies, workflow definitions are versioned  
6. **No secrets in DB** — store secret *references* (Key Vault URI), not raw keys  
7. **Repositories only** — Prisma stays in Infrastructure  

---

## 2. Cross-Cutting Columns

Standard mixin for tenant entities:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → tenants; indexed |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `created_by` | UUID NULL | user id |
| `updated_by` | UUID NULL | |
| `deleted_at` | timestamptz NULL | soft delete |

Composite indexes typically: `(tenant_id, …)` leading.

---

## 3. Core Schemas (Logical)

### 3.1 Tenancy & Identity

```
tenants
  id, slug, display_name, domain, status, branding_json, settings_json,
  default_language, default_timezone, license_json, entra_tenant_id, version, audit fields

organizations
  id, tenant_id, code, name, status, version, audit fields

departments
  id, tenant_id, organization_id, code, name, status, version, audit fields

users
  id, tenant_id, organization_id, department_id, manager_id, entra_oid, email,
  display_name, employee_code, preferred_language, time_zone, locale,
  profile_photo_url, status, last_login_at, version, audit fields

roles
  id, tenant_id NULL, code, name, is_system, version, audit fields

user_roles
  id, user_id, role_id, tenant_id

permissions
  id, code, module, description

role_permissions
  role_id, permission_id

user_attributes
  user_id, tenant_id, key, value_json   # ABAC hooks

sessions
  id, user_id, tenant_id, device_name, browser, platform, ip, user_agent,
  remember_me, mfa_status, absolute_expires_at, idle_expires_at,
  last_activity_at, revoked_at

refresh_tokens
  id, session_id, token_hash, family_id, rotation_count, reuse_detected,
  compromised_at, expires_at, revoked_at, rotated_from_id

audit_logs
  id, tenant_id, user_id, session_id, action, resource, resource_id, result,
  ip, user_agent, request_id, correlation_id, metadata_json, created_at

feature_flags
  id, lookup_key, key, scope (system|tenant|user), tenant_id, user_id, enabled, value_json
```

Platform-level roles may use `tenant_id NULL` for system templates; tenant clones or binds as needed.

### 3.2 Audit & Security

```
audit_logs
  id, tenant_id, actor_user_id, action, resource_type, resource_id,
  ip, user_agent, correlation_id, metadata_json, created_at
```

Append-only; no updates/deletes (except legal retention jobs).

### 3.3 Chat & Memory

```
conversations
  id, tenant_id, user_id, title, status, …

messages
  id, conversation_id, tenant_id, role, content, content_redacted,
  token_count, created_at

agent_runs
  id, tenant_id, conversation_id, orchestrator_plan_json, status,
  model, prompt_version, started_at, ended_at, cost_usd, …

tool_invocations
  id, agent_run_id, tenant_id, tool_name, mcp_server_id,
  args_redacted_json, result_redacted_json, status, latency_ms, …

user_memories
  id, tenant_id, user_id, key, value_json, sensitivity, expires_at

enterprise_memories
  id, tenant_id, key, value_json, …
```

### 3.4 Agents & Prompts

```
agents
  id, tenant_id NULL, code, name, description, enabled_default

tenant_agent_configs
  tenant_id, agent_id, enabled, model, temperature, tool_allowlist_json, budget_json

prompts
  id, tenant_id NULL, code, description

prompt_versions
  id, prompt_id, version, content, hash, status, created_by, created_at
```

### 3.5 MCP Registry

```
mcp_servers
  id, tenant_id, name, transport, endpoint, secret_ref, status, version

mcp_tools
  id, mcp_server_id, name, side_effect, risk, input_schema_json, output_schema_json
```

### 3.6 Knowledge / RAG

```
knowledge_sources
  id, tenant_id, type, name, config_json, secret_ref, sync_cron, status

knowledge_documents
  id, tenant_id, source_id, external_id, title, uri, mime, checksum,
  acl_json, indexed_at, status

knowledge_chunks
  id, tenant_id, document_id, chunk_index, content, embedding vector(n),
  token_count, acl_json, metadata_json
```

- Use **pgvector** HNSW/IVFFlat indexes  
- Always filter by `tenant_id` + ACL overlap in queries  
- Embedding dimension fixed per model; store model id on source/chunk metadata  

### 3.7 Workflows

```
workflow_definitions
  id, tenant_id, code, version, graph_json, status

workflow_instances
  id, tenant_id, definition_id, status, subject_type, subject_id,
  context_json, started_by, …

workflow_tasks
  id, instance_id, tenant_id, assignee_user_id, task_type, status,
  due_at, payload_json, …
```

### 3.8 Notifications & Feature Flags

```
notifications
  id, tenant_id, user_id, channel, title, body, status, read_at, …

feature_flags
  id, tenant_id NULL, key, description

feature_flag_overrides
  flag_id, tenant_id, value_json, …
```

### 3.9 Cost & Observability Aids

```
llm_usage_daily
  tenant_id, day, model, input_tokens, output_tokens, cost_usd, request_count
```

Prefer metrics backends for high-cardinality; keep rollups in DB for Admin UI.

---

## 4. Redis Usage (Not PostgreSQL)

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `session:{id}` | Session payload | idle/absolute timeout |
| `ratelimit:{tenant}:{user}:{route}` | Rate limits | window |
| `agent:run:{id}:state` | Working memory | short |
| `idempotency:{tenant}:{key}` | Mutating API/tool dedupe | 24h typical |
| BullMQ keys | Queues | managed by BullMQ |

---

## 5. Prisma Guidelines

- One Prisma schema (or multi-file Prisma) owned by `apps/api` initially  
- Enums for statuses  
- UUID `@id @default(uuid())`  
- Soft delete: default queries filter `deleted_at: null` via repository helpers  
- Migrations forward-only; never edit applied migrations  
- Seed scripts for system roles/permissions/agents  

---

## 6. Multi-Tenancy Enforcement

1. Middleware binds `TenantContext` from session  
2. Repository methods **require** `tenantId` argument  
3. Raw SQL must include `tenant_id` predicates  
4. Integration tests attempt cross-tenant reads — must fail  

---

## 7. Data Retention

Configurable per tenant:

- Conversation retention  
- Audit retention (usually longer)  
- Knowledge tombstones vs hard delete  
- GDPR/CCPA erasure workflows (user data) without destroying audit integrity (hash actor ids if required)

---

## 8. Potential Issues

| Issue | Mitigation |
|-------|------------|
| Huge `messages` table | Partition by time / tenant later; archive cold threads |
| Vector recall without ACL | Mandatory ACL filter in repository |
| Embedding model change | Reindex jobs; version embeddings |
| Over-fetching JSON blobs | Narrow columns; TOAST awareness |

---

## Related

`SECURITY.md` · `ARCHITECTURE.md` · `AI_AGENTS.md` · `WORKFLOWS.md`
