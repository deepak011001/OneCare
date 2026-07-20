import { randomUUID } from 'node:crypto';
import type {
  Conversation,
  AppendMessageInput,
  CreateConversationInput,
  ListConversationsInput,
  StreamingState,
} from './types';
import { asConversationId, asMessageId, type ConversationId } from './ids';

export interface ConversationStorePort {
  create(input: CreateConversationInput): Promise<Conversation>;
  get(tenantId: string, conversationId: ConversationId): Promise<Conversation | null>;
  listByUser(tenantId: string, userId: string): Promise<readonly Conversation[]>;
  list?(input: ListConversationsInput): Promise<{
    readonly items: readonly Conversation[];
    readonly nextCursor?: string;
  }>;
  appendMessage(input: AppendMessageInput): Promise<Conversation>;
  updateStreaming(
    tenantId: string,
    conversationId: ConversationId,
    streaming: StreamingState,
  ): Promise<Conversation>;
  updateTitle(
    tenantId: string,
    conversationId: ConversationId,
    title: string,
  ): Promise<Conversation>;
  softDelete?(tenantId: string, conversationId: ConversationId): Promise<void>;
  updateSummary?(
    tenantId: string,
    conversationId: ConversationId,
    summary: string,
  ): Promise<Conversation>;
}


const idleStreaming = (): StreamingState => ({ status: 'idle', buffer: '' });

export class InMemoryConversationStore implements ConversationStorePort {
  private readonly byId = new Map<string, Conversation>();

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    const now = new Date();
    const conversation: Conversation = {
      id: asConversationId(randomUUID()),
      tenantId: input.tenantId,
      userId: input.userId,
      title: input.title ?? 'New conversation',
      createdAt: now,
      updatedAt: now,
      messages: [],
      streaming: idleStreaming(),
      metadata: input.metadata ?? {},
    };
    this.byId.set(this.key(String(input.tenantId), String(conversation.id)), conversation);
    return conversation;
  }

  async get(tenantId: string, conversationId: ConversationId): Promise<Conversation | null> {
    return this.byId.get(this.key(tenantId, String(conversationId))) ?? null;
  }

  async listByUser(tenantId: string, userId: string): Promise<readonly Conversation[]> {
    return [...this.byId.values()]
      .filter((c) => String(c.tenantId) === tenantId && String(c.userId) === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async appendMessage(input: AppendMessageInput): Promise<Conversation> {
    const existing = await this.get(String(input.tenantId), input.conversationId);
    if (!existing) {
      throw new Error(`Conversation not found: ${input.conversationId}`);
    }
    const message = {
      id: asMessageId(randomUUID()),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      createdAt: new Date(),
      ...(input.toolCalls ? { toolCalls: input.toolCalls } : {}),
      ...(input.toolResults ? { toolResults: input.toolResults } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
    };
    const updated: Conversation = {
      ...existing,
      updatedAt: new Date(),
      messages: [...existing.messages, message],
    };
    this.byId.set(this.key(String(input.tenantId), String(input.conversationId)), updated);
    return updated;
  }

  async updateStreaming(
    tenantId: string,
    conversationId: ConversationId,
    streaming: StreamingState,
  ): Promise<Conversation> {
    const existing = await this.get(tenantId, conversationId);
    if (!existing) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const updated: Conversation = { ...existing, streaming, updatedAt: new Date() };
    this.byId.set(this.key(tenantId, String(conversationId)), updated);
    return updated;
  }

  async updateTitle(
    tenantId: string,
    conversationId: ConversationId,
    title: string,
  ): Promise<Conversation> {
    const existing = await this.get(tenantId, conversationId);
    if (!existing) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const updated: Conversation = { ...existing, title, updatedAt: new Date() };
    this.byId.set(this.key(tenantId, String(conversationId)), updated);
    return updated;
  }

  async softDelete(tenantId: string, conversationId: ConversationId): Promise<void> {
    this.byId.delete(this.key(tenantId, String(conversationId)));
  }

  async updateSummary(
    tenantId: string,
    conversationId: ConversationId,
    summary: string,
  ): Promise<Conversation> {
    const existing = await this.get(tenantId, conversationId);
    if (!existing) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const updated: Conversation = {
      ...existing,
      metadata: { ...existing.metadata, summary },
      updatedAt: new Date(),
    };
    this.byId.set(this.key(tenantId, String(conversationId)), updated);
    return updated;
  }

  async list(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly limit?: number;
    readonly cursor?: string;
  }): Promise<{ readonly items: readonly Conversation[]; readonly nextCursor?: string }> {
    const all = await this.listByUser(input.tenantId, input.userId);
    const limit = Math.min(input.limit ?? 50, 100);
    const start = input.cursor
      ? all.findIndex((c) => c.updatedAt.toISOString() === input.cursor) + 1
      : 0;
    const slice = all.slice(Math.max(0, start), Math.max(0, start) + limit + 1);
    const hasMore = slice.length > limit;
    const items = hasMore ? slice.slice(0, limit) : slice;
    const last = items[items.length - 1];
    return {
      items,
      ...(hasMore && last ? { nextCursor: last.updatedAt.toISOString() } : {}),
    };
  }
}
