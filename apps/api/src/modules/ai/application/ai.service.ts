import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '@onecare/events';
import { DOMAIN_EVENTS } from '@onecare/events';
import type { AiRuntime, ChatResult, OrchestratorPort, StreamEvent } from '@onecare/ai';
import { asConversationId } from '@onecare/conversations';
import type { ExecutionPlan } from '@onecare/planner';
import type { RequestContext } from '@onecare/shared';
import { AUDIT_ACTIONS, NotFoundError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';
import { AI_TOKENS } from '../ai.tokens';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_TOKENS.RUNTIME) private readonly runtime: AiRuntime,
    @Inject(AI_TOKENS.ORCHESTRATOR) private readonly orchestrator: OrchestratorPort,
    @Inject(APP_TOKENS.EVENT_BUS) private readonly events: EventBusPort,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  listAgents() {
    return this.runtime.agents.listEnabled();
  }

  listTools() {
    return this.runtime.tools.list();
  }

  listModels() {
    return this.runtime.providers.listModels();
  }

  getOrchestrationDiagnostics() {
    return this.runtime.getLastOrchestrationDiagnostics();
  }

  async auditOrchestrationDiagnostics(context: RequestContext) {
    await this.audit.write({
      tenantId: String(context.tenantId),
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action: AUDIT_ACTIONS.AI_ORCHESTRATION,
      resource: 'ai.orchestration.diagnostics',
      result: 'success',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
    });
  }

  listConversations(context: RequestContext) {
    return this.orchestrator.listConversations(String(context.tenantId), String(context.userId));
  }

  async getConversation(context: RequestContext, conversationId: string) {
    const conversation = await this.orchestrator.getConversation(
      String(context.tenantId),
      asConversationId(conversationId),
    );
    if (!conversation) {
      throw new NotFoundError('Conversation');
    }
    return conversation;
  }

  async plan(
    message: string,
    context: RequestContext,
    conversationId?: string,
  ): Promise<ExecutionPlan> {
    const plan = await this.orchestrator.plan({
      message,
      context,
      ...(conversationId ? { conversationId } : {}),
    });
    await this.events.publish({
      name: DOMAIN_EVENTS.AI_PLAN_CREATED,
      occurredAt: new Date(),
      tenantId: String(context.tenantId),
      correlationId: String(context.correlationId),
      payload: { planId: plan.id, mode: plan.mode, steps: plan.steps.length },
    });
    await this.audit.write({
      tenantId: String(context.tenantId),
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action: AUDIT_ACTIONS.AI_PLAN,
      resource: 'ai.plan',
      resourceId: plan.id,
      result: 'success',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
    });
    return plan;
  }

  async chat(input: {
    message: string;
    context: RequestContext;
    conversationId?: string;
    approvedToolConfirmations?: Readonly<Record<string, string>>;
  }): Promise<ChatResult> {
    await this.events.publish({
      name: DOMAIN_EVENTS.AI_CHAT_STARTED,
      occurredAt: new Date(),
      tenantId: String(input.context.tenantId),
      correlationId: String(input.context.correlationId),
      payload: { conversationId: input.conversationId ?? null },
    });

    const result = await this.orchestrator.chat({
      message: input.message,
      context: input.context,
      ...(input.conversationId ? { conversationId: input.conversationId } : {}),
      ...(input.approvedToolConfirmations
        ? { approvedToolConfirmations: input.approvedToolConfirmations }
        : {}),
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.AI_STREAM_COMPLETED,
      occurredAt: new Date(),
      tenantId: String(input.context.tenantId),
      correlationId: String(input.context.correlationId),
      payload: {
        conversationId: String(result.conversation.id),
        planId: result.plan.id,
        latencyMs: result.observation.latencyMs,
      },
    });

    await this.audit.write({
      tenantId: String(input.context.tenantId),
      userId: String(input.context.userId),
      sessionId: String(input.context.sessionId),
      action: AUDIT_ACTIONS.AI_CHAT,
      resource: 'ai.chat',
      resourceId: String(result.conversation.id),
      result: 'success',
      correlationId: String(input.context.correlationId),
      requestId: String(input.context.requestId),
      metadata: {
        planId: result.plan.id,
        model: result.observation.model,
        totalTokens: result.observation.totalTokens,
      },
    });

    return result;
  }

  async chatStream(
    input: {
      message: string;
      context: RequestContext;
      conversationId?: string;
      approvedToolConfirmations?: Readonly<Record<string, string>>;
    },
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<ChatResult> {
    await this.events.publish({
      name: DOMAIN_EVENTS.AI_CHAT_STARTED,
      occurredAt: new Date(),
      tenantId: String(input.context.tenantId),
      correlationId: String(input.context.correlationId),
      payload: { conversationId: input.conversationId ?? null, stream: true },
    });

    const result = await this.orchestrator.chatStream(
      {
        message: input.message,
        context: input.context,
        stream: true,
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        ...(input.approvedToolConfirmations
          ? { approvedToolConfirmations: input.approvedToolConfirmations }
          : {}),
      },
      onEvent,
      signal,
    );

    await this.audit.write({
      tenantId: String(input.context.tenantId),
      userId: String(input.context.userId),
      sessionId: String(input.context.sessionId),
      action: AUDIT_ACTIONS.AI_STREAM,
      resource: 'ai.chat',
      resourceId: String(result.conversation.id),
      result: 'success',
      correlationId: String(input.context.correlationId),
      requestId: String(input.context.requestId),
      metadata: {
        planId: result.plan.id,
        model: result.observation.model,
        totalTokens: result.observation.totalTokens,
      },
    });

    return result;
  }
}
