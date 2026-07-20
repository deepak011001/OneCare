# OneCare — Enterprise Agent Framework (M6.5)

**Status:** Living Document — Source of Truth  
**Package:** `@onecare/agent-framework`  
**Related:** [`AGENT_REGISTRY.md`](./AGENT_REGISTRY.md) · [`AGENT_LIFECYCLE.md`](./AGENT_LIFECYCLE.md) · [`AGENT_CONTEXT.md`](./AGENT_CONTEXT.md) · [`AGENT_HANDOFFS.md`](./AGENT_HANDOFFS.md) · [`AI_AGENTS.md`](./AI_AGENTS.md) · [`EMPLOYEE_AGENT.md`](./EMPLOYEE_AGENT.md)

---

## 1. Purpose

Reusable **Enterprise Agent Framework** for every current and future OneCare agent (Employee, Manager, HR, IT, Finance, Learning, Recruitment, Legal, Compliance, …).

Does **not** redesign AI Runtime, MCP, Knowledge Platform, Employee Capability Framework, or Cross Capability Orchestration.

```
Admin / Runtime
    → EnterpriseAgentRegistry
         → EnterpriseAgent (metadata + lifecycle)
              → AgentContext (request-scoped)
              → Memory / Handoff / Approval / Collaboration ports
```

Employee Agent is **migrated** onto this framework; Master Orchestrator still consumes the existing `RegisteredAgent` projection.

---

## 2. Package

`@onecare/agent-framework`

| Concern | Module |
|---------|--------|
| Model | `EnterpriseAgent`, `AgentMetadata` |
| Registry | `InMemoryEnterpriseAgentRegistry` |
| Lifecycle | hooks + `runLifecyclePhase` |
| Context | `createAgentContext` |
| Memory | `AgentMemoryPort` / `InMemoryAgentMemory` |
| Handoff | `InMemoryAgentHandoffBus` |
| Collaboration | `requestCollaboration` |
| Approvals | `InMemoryApprovalStore` |
| Permissions | `assertAgentAccess` |
| Telemetry | `InMemoryAgentTelemetry` |
| Errors | `AgentUnavailable`, `AgentNotAuthorized`, … |

---

## 3. Composition

```ts
const platform = createEnterpriseAgentPlatform();
// AI Runtime:
createDefaultAgentRegistry(platform); // projects to RegisteredAgent
```

---

## 4. Admin APIs

| Method | Path | Permission |
|--------|------|------------|
| GET | `/v1/agents` | `ai.agents.read` |
| GET | `/v1/agents/:id` | `ai.agents.read` |
| GET | `/v1/agents/health` | `ai.agents.read` |
| GET | `/v1/agents/capabilities` | `ai.agents.read` |

---

## 5. Success (M6.5)

✓ Framework package · registry · lifecycle · context · memory · handoff · approvals · Employee migrated · admin APIs/UI · tests · lint/typecheck
