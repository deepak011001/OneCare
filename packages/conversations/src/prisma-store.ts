import type { PrismaClient } from '@onecare/database';
import { asTenantId, asUserId } from '@onecare/shared';
import type {
  AppendMessageInput,
  Conversation,
  ConversationMessage,
  CreateConversationInput,
  ListConversationsInput,
  StreamingState,
} from './types';
import type { ConversationStorePort } from './store';
import { asConversationId, asMessageId, type ConversationId } from './ids';

const idleStreaming = (): StreamingState => ({ status: 'idle', buffer: '' });

type PrismaConversationRow = {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  summary: string | null;
  metadataJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  messages?: Array<{
    id: string;
    conversationId: string;
    role: string;
    content: string;
    metadataJson: unknown;
    createdAt: Date;
  }>;
};

/**
 * PostgreSQL-backed conversation store — tenant isolated, soft-delete aware.
 * Streaming state remains ephemeral (in-memory overlay) for SSE continuity.
 */
export class PrismaConversationStore implements ConversationStorePort {
  private readonly streaming = new Map<string, StreamingState>();

  constructor(private readonly prisma: PrismaClient) {}

  private key(tenantId: string, id: string): string {
    return `${tenantId}:${id}`;
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    const row = await this.prisma.conversation.create({
      data: {
        tenantId: String(input.tenantId),
        userId: String(input.userId),
        title: input.title ?? 'New conversation',
        metadataJson: (input.metadata ?? {}) as object,
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return this.map(row);
  }

  async get(tenantId: string, conversationId: ConversationId): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findFirst({
      where: {
        id: String(conversationId),
        tenantId,
        deletedAt: null,
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    return row ? this.map(row) : null;
  }

  async listByUser(tenantId: string, userId: string): Promise<readonly Conversation[]> {
    const result = await this.list({ tenantId, userId, limit: 100 });
    return result.items;
  }

  async list(input: ListConversationsInput): Promise<{
    readonly items: readonly Conversation[];
    readonly nextCursor?: string;
  }> {
    const limit = Math.min(input.limit ?? 50, 100);
    const rows = await this.prisma.conversation.findMany({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        deletedAt: null,
        ...(input.cursor ? { updatedAt: { lt: new Date(input.cursor) } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((row) => this.map(row));
    const last = page[page.length - 1];
    return {
      items,
      ...(hasMore && last ? { nextCursor: last.updatedAt.toISOString() } : {}),
    };
  }

  async appendMessage(input: AppendMessageInput): Promise<Conversation> {
    const existing = await this.get(String(input.tenantId), input.conversationId);
    if (!existing) {
      throw new Error(`Conversation not found: ${input.conversationId}`);
    }
    await this.prisma.conversationMessage.create({
      data: {
        conversationId: String(input.conversationId),
        tenantId: String(input.tenantId),
        role: input.role,
        content: input.content,
        metadataJson: {
          ...(input.metadata ?? {}),
          ...(input.toolCalls ? { toolCalls: input.toolCalls } : {}),
          ...(input.toolResults ? { toolResults: input.toolResults } : {}),
        } as object,
      },
    });
    await this.prisma.conversation.update({
      where: { id: String(input.conversationId) },
      data: { updatedAt: new Date(), version: { increment: 1 } },
    });
    const updated = await this.get(String(input.tenantId), input.conversationId);
    if (!updated) throw new Error(`Conversation not found: ${input.conversationId}`);
    return updated;
  }

  async updateStreaming(
    tenantId: string,
    conversationId: ConversationId,
    streaming: StreamingState,
  ): Promise<Conversation> {
    this.streaming.set(this.key(tenantId, String(conversationId)), streaming);
    const existing = await this.get(tenantId, conversationId);
    if (!existing) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    return { ...existing, streaming };
  }

  async updateTitle(
    tenantId: string,
    conversationId: ConversationId,
    title: string,
  ): Promise<Conversation> {
    await this.prisma.conversation.updateMany({
      where: { id: String(conversationId), tenantId, deletedAt: null },
      data: { title, version: { increment: 1 } },
    });
    const updated = await this.get(tenantId, conversationId);
    if (!updated) throw new Error(`Conversation not found: ${conversationId}`);
    return updated;
  }

  async softDelete(tenantId: string, conversationId: ConversationId): Promise<void> {
    await this.prisma.conversation.updateMany({
      where: { id: String(conversationId), tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    this.streaming.delete(this.key(tenantId, String(conversationId)));
  }

  async updateSummary(
    tenantId: string,
    conversationId: ConversationId,
    summary: string,
  ): Promise<Conversation> {
    await this.prisma.conversation.updateMany({
      where: { id: String(conversationId), tenantId, deletedAt: null },
      data: { summary, version: { increment: 1 } },
    });
    const updated = await this.get(tenantId, conversationId);
    if (!updated) throw new Error(`Conversation not found: ${conversationId}`);
    return updated;
  }

  private map(row: PrismaConversationRow): Conversation {
    const streaming = this.streaming.get(this.key(row.tenantId, row.id)) ?? idleStreaming();
    const messages: ConversationMessage[] = (row.messages ?? []).map((m) => {
      const meta =
        m.metadataJson && typeof m.metadataJson === 'object'
          ? (m.metadataJson as Record<string, unknown>)
          : {};
      const toolCalls = meta['toolCalls'] as ConversationMessage['toolCalls'] | undefined;
      const toolResults = meta['toolResults'] as ConversationMessage['toolResults'] | undefined;
      const metadata = Object.fromEntries(
        Object.entries(meta).filter(([k]) => k !== 'toolCalls' && k !== 'toolResults'),
      );
      return {
        id: asMessageId(m.id),
        conversationId: asConversationId(m.conversationId),
        role: m.role as ConversationMessage['role'],
        content: m.content,
        createdAt: m.createdAt,
        ...(toolCalls ? { toolCalls } : {}),
        ...(toolResults ? { toolResults } : {}),
        ...(Object.keys(metadata).length ? { metadata } : {}),
      };
    });

    return {
      id: asConversationId(row.id),
      tenantId: asTenantId(row.tenantId),
      userId: asUserId(row.userId),
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      messages,
      streaming,
      metadata: {
        ...((row.metadataJson as Record<string, unknown>) ?? {}),
        ...(row.summary ? { summary: row.summary } : {}),
      },
    };
  }
}
