export type Brand<T, B extends string> = T & { readonly __brand: B };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;
export type AgentRunId = Brand<string, 'AgentRunId'>;

export function asTenantId(value: string): TenantId {
  return value as TenantId;
}

export function asUserId(value: string): UserId {
  return value as UserId;
}

export function asCorrelationId(value: string): CorrelationId {
  return value as CorrelationId;
}

export function asConversationId(value: string): ConversationId {
  return value as ConversationId;
}

export function asMessageId(value: string): MessageId {
  return value as MessageId;
}

export function asAgentRunId(value: string): AgentRunId {
  return value as AgentRunId;
}
