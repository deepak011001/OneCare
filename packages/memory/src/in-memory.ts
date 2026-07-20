import type {
  AgentMemoryPort,
  ConversationMemoryPort,
  MemoryPort,
  SessionMemoryPort,
  UserMemoryPort,
} from './ports';
import type { MemoryRecord, MemoryScope } from './types';

function scopeKey(scope: MemoryScope): string {
  return [
    scope.tenantId,
    scope.userId ?? '-',
    scope.conversationId ?? '-',
    scope.sessionId ?? '-',
    scope.agentId ?? '-',
  ].join('|');
}

export class InMemoryMemoryStore implements MemoryPort {
  private readonly data = new Map<string, Map<string, MemoryRecord>>();

  private bucket(scope: MemoryScope): Map<string, MemoryRecord> {
    const key = scopeKey(scope);
    let bucket = this.data.get(key);
    if (!bucket) {
      bucket = new Map();
      this.data.set(key, bucket);
    }
    return bucket;
  }

  async load(scope: MemoryScope, key: string): Promise<MemoryRecord | null> {
    return this.bucket(scope).get(key) ?? null;
  }

  async save(scope: MemoryScope, key: string, value: unknown): Promise<MemoryRecord> {
    const record: MemoryRecord = { key, value, updatedAt: new Date() };
    this.bucket(scope).set(key, record);
    return record;
  }

  async summarize(scope: MemoryScope, key: string): Promise<MemoryRecord | null> {
    const existing = await this.load(scope, key);
    if (!existing) return null;
    const summary =
      typeof existing.value === 'string'
        ? existing.value.slice(0, 120)
        : JSON.stringify(existing.value).slice(0, 120);
    const next: MemoryRecord = { ...existing, summary, updatedAt: new Date() };
    this.bucket(scope).set(key, next);
    return next;
  }

  async forget(scope: MemoryScope, key: string): Promise<void> {
    this.bucket(scope).delete(key);
  }

  async list(scope: MemoryScope): Promise<readonly MemoryRecord[]> {
    return [...this.bucket(scope).values()];
  }
}

export class InMemoryConversationMemory
  extends InMemoryMemoryStore
  implements ConversationMemoryPort {}
export class InMemoryUserMemory extends InMemoryMemoryStore implements UserMemoryPort {}
export class InMemorySessionMemory extends InMemoryMemoryStore implements SessionMemoryPort {}
export class InMemoryAgentMemory extends InMemoryMemoryStore implements AgentMemoryPort {}

export interface MemoryFacade {
  readonly conversation: ConversationMemoryPort;
  readonly user: UserMemoryPort;
  readonly session: SessionMemoryPort;
  readonly agent: AgentMemoryPort;
}

export function createInMemoryFacade(): MemoryFacade {
  return {
    conversation: new InMemoryConversationMemory(),
    user: new InMemoryUserMemory(),
    session: new InMemorySessionMemory(),
    agent: new InMemoryAgentMemory(),
  };
}
