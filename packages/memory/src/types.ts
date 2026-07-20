export interface MemoryRecord {
  readonly key: string;
  readonly value: unknown;
  readonly updatedAt: Date;
  readonly summary?: string;
}

export interface MemoryScope {
  readonly tenantId: string;
  readonly userId?: string;
  readonly conversationId?: string;
  readonly sessionId?: string;
  readonly agentId?: string;
}
