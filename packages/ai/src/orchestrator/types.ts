import type { RequestContext } from '@onecare/shared';
import type { Conversation, ConversationId } from '@onecare/conversations';
import type { ExecutionPlan } from '@onecare/planner';
import type { StreamEvent } from '../streaming/types';
import type { AiObservation } from '../observability';

export interface ChatRequest {
  readonly message: string;
  readonly conversationId?: string;
  readonly context: RequestContext;
  readonly stream?: boolean;
  /** Approved confirmation IDs keyed by tool name (after user confirms in UI). */
  readonly approvedToolConfirmations?: Readonly<Record<string, string>>;
}

export interface PlanRequest {
  readonly message: string;
  readonly conversationId?: string;
  readonly context: RequestContext;
}

export interface ChatResult {
  readonly conversation: Conversation;
  readonly plan: ExecutionPlan;
  readonly assistantMessage: string;
  readonly observation: AiObservation;
}

export interface OrchestratorPort {
  plan(input: PlanRequest): Promise<ExecutionPlan>;
  chat(input: ChatRequest): Promise<ChatResult>;
  chatStream(
    input: ChatRequest,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<ChatResult>;
  listConversations(tenantId: string, userId: string): Promise<readonly Conversation[]>;
  getConversation(tenantId: string, conversationId: ConversationId): Promise<Conversation | null>;
}
