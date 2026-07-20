export class AgentFrameworkError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AgentFrameworkError';
    this.code = code;
  }
}

export class AgentUnavailableError extends AgentFrameworkError {
  constructor(agentId: string, detail?: string) {
    super('AGENT_UNAVAILABLE', detail ?? `Agent unavailable: ${agentId}`);
    this.name = 'AgentUnavailableError';
  }
}

export class AgentNotAuthorizedError extends AgentFrameworkError {
  constructor(agentId: string, detail?: string) {
    super('AGENT_NOT_AUTHORIZED', detail ?? `Not authorized for agent: ${agentId}`);
    this.name = 'AgentNotAuthorizedError';
  }
}

export class CapabilityUnavailableError extends AgentFrameworkError {
  constructor(capabilityId: string) {
    super('CAPABILITY_UNAVAILABLE', `Capability unavailable: ${capabilityId}`);
    this.name = 'CapabilityUnavailableError';
  }
}

export class HandoffFailedError extends AgentFrameworkError {
  constructor(detail: string) {
    super('HANDOFF_FAILED', detail);
    this.name = 'HandoffFailedError';
  }
}

export class LifecycleError extends AgentFrameworkError {
  constructor(phase: string, detail: string) {
    super('LIFECYCLE_ERROR', `${phase}: ${detail}`);
    this.name = 'LifecycleError';
  }
}

export class ContextError extends AgentFrameworkError {
  constructor(detail: string) {
    super('CONTEXT_ERROR', detail);
    this.name = 'ContextError';
  }
}
