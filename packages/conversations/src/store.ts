import { randomUUID } from 'node:crypto';
import type {
  Conversation,
  AppendMessageInput,
  CreateConversationInput,
  StreamingState,
} from './types';
import { asConversationId, asMessageId, type ConversationId } from './ids';

export interface ConversationStorePort {
  create(input: CreateConversationInput): Promise<Conversation>;
  get(tenantId: string, conversationId: ConversationId): Promise<Conversation | null>;
  listByUser(tenantId: string, userId: string): Promise<readonly Conversation[]>;
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
}
