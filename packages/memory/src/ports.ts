import type { MemoryRecord, MemoryScope } from './types';

export interface MemoryPort {
  load(scope: MemoryScope, key: string): Promise<MemoryRecord | null>;
  save(scope: MemoryScope, key: string, value: unknown): Promise<MemoryRecord>;
  summarize(scope: MemoryScope, key: string): Promise<MemoryRecord | null>;
  forget(scope: MemoryScope, key: string): Promise<void>;
  list(scope: MemoryScope): Promise<readonly MemoryRecord[]>;
}

export type ConversationMemoryPort = MemoryPort;
export type UserMemoryPort = MemoryPort;
export type SessionMemoryPort = MemoryPort;
export type AgentMemoryPort = MemoryPort;
