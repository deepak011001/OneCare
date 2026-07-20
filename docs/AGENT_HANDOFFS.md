# OneCare — Agent Handoffs & Collaboration

**Related:** [`AGENT_FRAMEWORK.md`](./AGENT_FRAMEWORK.md)

## Handoff

`AgentHandoffPayload` transfers:

- from / to agent ids  
- reason  
- full `AgentContext`  
- execution state  
- pending clarifications / confirmations  
- timestamp  

`InMemoryAgentHandoffBus.transfer` returns `handoffId` + `auditId` and emits telemetry. Same-agent handoff fails with `HandoffFailedError`.

Examples (contracts only): Employee → Manager, Employee → HR, HR → IT.

## Collaboration

`requestCollaboration` validates target agent access and records a collaboration intent. No business answers are produced here — Manager/HR/Knowledge business flows stay in later milestones / capabilities.
