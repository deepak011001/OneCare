import type { RequestContext } from '@onecare/shared';
import {
  asConversationId,
  type Conversation,
  type ConversationStorePort,
} from '@onecare/conversations';
import type { MemoryFacade } from '@onecare/memory';
import type { ExecutionPlan, PlannerPort } from '@onecare/planner';
import type { PromptRegistryPort } from '@onecare/prompts';
import type { ToolRegistryPort, ToolExecutorPort } from '@onecare/tools';
import type { AgentRegistryPort } from '../agents/registry';
import { estimateCostUsd, type AiObservabilityPort, type AiObservation } from '../observability';
import type { LlmProviderPort } from '../providers/types';
import type { StreamEvent } from '../streaming/types';
import type { ChatRequest, ChatResult, OrchestratorPort, PlanRequest } from './types';

export interface MasterOrchestratorDeps {
  readonly conversations: ConversationStorePort;
  readonly memory: MemoryFacade;
  readonly planner: PlannerPort;
  readonly agents: AgentRegistryPort;
  readonly tools: ToolRegistryPort;
  readonly prompts: PromptRegistryPort;
  readonly llm: LlmProviderPort;
  readonly observability: AiObservabilityPort;
  readonly toolExecutor?: ToolExecutorPort;
  readonly resolveConfirmationApproved?: (
    tenantId: string,
    userId: string,
    confirmationId: string,
  ) => Promise<boolean>;
}

/**
 * Master Orchestrator — runtime only.
 * No domain business logic, no MCP calls, no vendor SDKs.
 */
export class MasterOrchestrator implements OrchestratorPort {
  constructor(private readonly deps: MasterOrchestratorDeps) {}

  async listConversations(tenantId: string, userId: string): Promise<readonly Conversation[]> {
    return this.deps.conversations.listByUser(tenantId, userId);
  }

  async getConversation(tenantId: string, conversationId: ReturnType<typeof asConversationId>) {
    return this.deps.conversations.get(tenantId, conversationId);
  }

  async plan(input: PlanRequest): Promise<ExecutionPlan> {
    return this.deps.planner.plan({
      message: input.message,
      context: {
        tenantId: String(input.context.tenantId),
        userId: String(input.context.userId),
        roles: input.context.roles,
        permissions: input.context.permissions,
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
      },
    });
  }

  async chat(input: ChatRequest): Promise<ChatResult> {
    const events: StreamEvent[] = [];
    return this.chatStream(input, (event) => events.push(event));
  }

  async chatStream(
    input: ChatRequest,
    onEvent: (event: StreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<ChatResult> {
    const started = Date.now();
    const conversation = await this.resolveConversation(input);
    onEvent({
      type: 'conversation',
      sequence: 0,
      data: {
        conversationId: conversation.id,
        title: conversation.title,
      },
    });

    await this.deps.conversations.appendMessage({
      conversationId: conversation.id,
      tenantId: input.context.tenantId,
      role: 'user',
      content: input.message,
    });

    if (conversation.messages.length === 0 && conversation.title === 'New conversation') {
      const title = input.message.slice(0, 60);
      await this.deps.conversations.updateTitle(
        String(input.context.tenantId),
        conversation.id,
        title,
      );
    }

    await this.deps.memory.conversation.save(
      {
        tenantId: String(input.context.tenantId),
        conversationId: String(conversation.id),
      },
      'last_user_message',
      input.message,
    );

    await this.deps.memory.user.save(
      {
        tenantId: String(input.context.tenantId),
        userId: String(input.context.userId),
      },
      'last_seen_at',
      new Date().toISOString(),
    );

    await this.deps.memory.session.save(
      {
        tenantId: String(input.context.tenantId),
        sessionId: String(input.context.sessionId),
      },
      'active_conversation_id',
      String(conversation.id),
    );

    const plan = await this.plan({
      message: input.message,
      context: input.context,
      conversationId: String(conversation.id),
    });
    onEvent({ type: 'plan', sequence: 0, data: plan });

    const primary = plan.steps[0];
    const agent = primary ? this.deps.agents.get(primary.agentId) : null;
    if (agent) {
      onEvent({
        type: 'agent',
        sequence: 0,
        data: {
          agentId: agent.id,
          name: agent.name,
          version: agent.version,
          intent: primary?.intent,
        },
      });
      await this.deps.memory.agent.save(
        {
          tenantId: String(input.context.tenantId),
          agentId: agent.id,
          userId: String(input.context.userId),
        },
        'last_intent',
        primary?.intent ?? 'unknown',
      );
    }

    const systemPrompt = this.deps.prompts.render({
      promptId: 'orchestrator.system',
      variables: { tenantId: String(input.context.tenantId) },
    });

    const agentPrompt = agent
      ? this.deps.prompts.render({
          promptId: agent.systemPromptRef,
          variables: {
            agentName: agent.name,
            agentId: agent.id,
            version: agent.version,
            capabilities: agent.capabilities.map((c) => c.id).join(', '),
          },
        })
      : null;

    const toolHints =
      primary?.toolNames
        ?.map((name) => this.deps.tools.get(name))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => `${t.name} (implemented=${t.implemented})`)
        .join(', ') ?? 'none';

    const toolResultSummaries: string[] = [];

    for (const toolName of primary?.toolNames ?? []) {
      const tool = this.deps.tools.get(toolName);
      if (!tool || !tool.implemented || !this.deps.toolExecutor) {
        onEvent({
          type: 'tool',
          sequence: 0,
          data: {
            name: toolName,
            status: 'skipped',
            reason: tool?.implemented === false ? 'placeholder_only' : 'unavailable',
          },
        });
        continue;
      }

      const confirmationId = input.approvedToolConfirmations?.[toolName];
      let confirmationApproved = false;
      if (confirmationId && this.deps.resolveConfirmationApproved) {
        confirmationApproved = await this.deps.resolveConfirmationApproved(
          String(input.context.tenantId),
          String(input.context.userId),
          confirmationId,
        );
      }

      const execution = await this.deps.toolExecutor.execute({
        toolName,
        connectorId: tool.connectorId,
        arguments: {},
        context: {
          tenantId: input.context.tenantId,
          userId: input.context.userId,
          correlationId: input.context.correlationId,
          roles: input.context.roles,
          permissions: input.context.permissions,
          attributes: input.context.attributes,
        },
        confirmationApproved,
      });

      if (execution.decision === 'confirmation_required') {
        onEvent({
          type: 'confirmation_required',
          sequence: 0,
          data: {
            toolName,
            connectorId: tool.connectorId,
            confirmationId: execution.confirmationId,
            summary: execution.errorMessage,
          },
        });
        onEvent({
          type: 'tool',
          sequence: 0,
          data: {
            name: toolName,
            status: 'pending_confirmation',
            confirmationId: execution.confirmationId,
          },
        });
        continue;
      }

      onEvent({
        type: 'tool',
        sequence: 0,
        data: {
          name: toolName,
          status: execution.ok ? 'completed' : 'failed',
          ...(execution.data !== undefined ? { result: execution.data } : {}),
          ...(execution.errorMessage ? { errorMessage: execution.errorMessage } : {}),
          latencyMs: execution.latencyMs,
        },
      });

      if (execution.ok && execution.data !== undefined) {
        toolResultSummaries.push(`${toolName}: ${JSON.stringify(execution.data)}`);
      }
    }

    const completionMessages = [
      { role: 'system' as const, content: systemPrompt.content },
      ...(agentPrompt ? [{ role: 'system' as const, content: agentPrompt.content }] : []),
      {
        role: 'system' as const,
        content: `Active plan: ${plan.summary}. Tools: ${toolHints}.${toolResultSummaries.length ? ` Tool results: ${toolResultSummaries.join(' | ')}.` : ''}`,
      },
      { role: 'user' as const, content: input.message },
    ];

    let assistantText = '';
    let model = 'mock-onecare-v1';
    let promptTokens = 0;
    let completionTokens = 0;

    await this.deps.conversations.updateStreaming(String(input.context.tenantId), conversation.id, {
      status: 'streaming',
      buffer: '',
      startedAt: new Date(),
    });

    try {
      for await (const chunk of this.deps.llm.stream({
        model,
        messages: completionMessages,
        ...(signal ? { signal } : {}),
      })) {
        if (signal?.aborted) {
          onEvent({ type: 'cancelled', sequence: 0, data: { reason: 'client_aborted' } });
          break;
        }
        if (chunk.type === 'delta' && chunk.text) {
          assistantText += chunk.text;
          onEvent({ type: 'delta', sequence: 0, data: { text: chunk.text } });
        }
        if (chunk.type === 'done') {
          model = chunk.model ?? model;
          promptTokens = chunk.usage?.promptTokens ?? promptTokens;
          completionTokens = chunk.usage?.completionTokens ?? completionTokens;
        }
        if (chunk.type === 'error') {
          throw new Error(chunk.errorMessage ?? 'LLM stream error');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      await this.deps.conversations.updateStreaming(
        String(input.context.tenantId),
        conversation.id,
        {
          status: 'error',
          buffer: assistantText,
          completedAt: new Date(),
          errorMessage: message,
        },
      );
      onEvent({ type: 'error', sequence: 0, data: { message } });
      throw error;
    }

    const latencyMs = Date.now() - started;
    const totalTokens = promptTokens + completionTokens;
    const observation: AiObservation = {
      correlationId: String(input.context.correlationId),
      tenantId: String(input.context.tenantId),
      userId: String(input.context.userId),
      conversationId: String(conversation.id),
      provider: this.deps.llm.id,
      model,
      promptId: systemPrompt.promptId,
      promptVersion: systemPrompt.version,
      latencyMs,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: estimateCostUsd(model, totalTokens),
      retries: 0,
      ...(agent ? { agentId: agent.id } : {}),
      planId: plan.id,
    };
    this.deps.observability.record(observation);

    const updated = await this.deps.conversations.appendMessage({
      conversationId: conversation.id,
      tenantId: input.context.tenantId,
      role: 'assistant',
      content: assistantText,
      metadata: {
        ...(agent ? { agentId: agent.id } : {}),
        model,
        planId: plan.id,
        latencyMs,
        tokenUsage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      },
    });

    await this.deps.conversations.updateStreaming(String(input.context.tenantId), conversation.id, {
      status: 'completed',
      buffer: assistantText,
      completedAt: new Date(),
    });

    onEvent({
      type: 'done',
      sequence: 0,
      data: {
        conversationId: conversation.id,
        observation,
        planId: plan.id,
      },
    });

    return {
      conversation: updated,
      plan,
      assistantMessage: assistantText,
      observation,
    };
  }

  private async resolveConversation(input: ChatRequest): Promise<Conversation> {
    if (input.conversationId) {
      const existing = await this.deps.conversations.get(
        String(input.context.tenantId),
        asConversationId(input.conversationId),
      );
      if (!existing) {
        throw new Error('Conversation not found');
      }
      if (String(existing.userId) !== String(input.context.userId)) {
        throw new Error('Conversation not found');
      }
      return existing;
    }
    return this.deps.conversations.create({
      tenantId: input.context.tenantId,
      userId: input.context.userId,
    });
  }
}

export function createMasterOrchestrator(deps: MasterOrchestratorDeps): MasterOrchestrator {
  return new MasterOrchestrator(deps);
}

/** Helper to build planner context from request context without leaking infra. */
export function toPlannerContext(context: RequestContext, conversationId?: string) {
  return {
    tenantId: String(context.tenantId),
    userId: String(context.userId),
    roles: context.roles,
    permissions: context.permissions,
    ...(conversationId ? { conversationId } : {}),
  };
}
