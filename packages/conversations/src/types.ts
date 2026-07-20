import type { TenantId, UserId } from '@onecare/shared';
import type { ConversationId, MessageId } from './ids';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export type StreamingStatus = 'idle' | 'streaming' | 'completed' | 'cancelled' | 'error';

export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface ToolResult {
  readonly toolCallId: string;
  readonly name: string;
  readonly ok: boolean;
  readonly data?: unknown;
  readonly errorMessage?: string;
}

export interface MessageMetadata {
  readonly agentId?: string;
  readonly model?: string;
  readonly planId?: string;
  readonly latencyMs?: number;
  readonly tokenUsage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  readonly [key: string]: unknown;
}

export interface ConversationMessage {
  readonly id: MessageId;
  readonly conversationId: ConversationId;
  readonly role: MessageRole;
  readonly content: string;
  readonly createdAt: Date;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolResults?: readonly ToolResult[];
  readonly metadata?: MessageMetadata;
}

export type UserMessage = ConversationMessage & { readonly role: 'user' };
export type AssistantMessage = ConversationMessage & { readonly role: 'assistant' };

export interface StreamingState {
  readonly status: StreamingStatus;
  readonly buffer: string;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly errorMessage?: string;
}

export interface Conversation {
  readonly id: ConversationId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly title: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly messages: readonly ConversationMessage[];
  readonly streaming: StreamingState;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CreateConversationInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly title?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface AppendMessageInput {
  readonly conversationId: ConversationId;
  readonly tenantId: TenantId;
  readonly role: MessageRole;
  readonly content: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly toolResults?: readonly ToolResult[];
  readonly metadata?: MessageMetadata;
}
