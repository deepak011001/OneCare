# OneCare — Agent Context

**Related:** [`AGENT_FRAMEWORK.md`](./AGENT_FRAMEWORK.md)

## AgentContext

Request-scoped only — **no global state**.

Includes:

- tenant / user / session / conversation / request / correlation IDs  
- roles, permissions, attributes  
- feature flags  
- memory slice  
- optional execution graph summary  
- telemetry port  
- `services` bag (knowledge, MCP, capability registry handles)

Built with `createAgentContext()`. Missing tenant/user/session → `ContextError`.
