# OneCare — Agent Registry

**Related:** [`AGENT_FRAMEWORK.md`](./AGENT_FRAMEWORK.md)

## Operations

- `register` / `unregister`
- `get` / `list` / `listEnabled`
- `findByRole` / `findByCapability`
- `enable` / `disable`
- `setTenantOverride` / `isEnabledForTenant`
- `health` (per agent or all)

## Versioning

`EnterpriseAgent.version` is metadata on each registration. Replacing a registration updates the in-memory version; durable version history is a future ops concern.

## Runtime bridge

`toRuntimeRegisteredAgent` projects framework agents into the AI Runtime `RegisteredAgent` shape used by Master Orchestrator — no orchestrator redesign.
