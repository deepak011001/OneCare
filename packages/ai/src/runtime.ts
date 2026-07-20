import type { ConversationStorePort } from '@onecare/conversations';
import { InMemoryConversationStore } from '@onecare/conversations';
import { createInMemoryFacade } from '@onecare/memory';
import { HeuristicPlanner } from '@onecare/planner';
import { createDefaultPromptRegistry } from '@onecare/prompts';
import { asTenantId } from '@onecare/shared';
import {
  createDefaultToolRegistry,
  createMcpToolRegistry,
  McpToolExecutor,
  type ToolExecutorPort,
} from '@onecare/tools';
import type { McpGatewayService } from '@onecare/mcp';
import type { InMemoryConfirmationStore } from '@onecare/confirmations';
import type { PolicyEngine } from '@onecare/policies';
import type { CapabilityRegistry } from '@onecare/ess-capability';
import type { OrchestrationDiagnostics } from '@onecare/ess-orchestration';
import { createEmployeeCapabilityRegistry, createLeaveCapability } from '@onecare/ess-leave';
import { createAttendanceCapability } from '@onecare/ess-attendance';
import { createKnowledgeCapability, type KnowledgeRetrievalPort } from '@onecare/ess-knowledge';
import { createDefaultAgentRegistry } from './agents/registry';
import { createDefaultAiHardening, type AiHardeningPorts } from './hardening';
import { InMemoryAiObservability } from './observability';
import {
  createMasterOrchestrator,
  type MasterOrchestrator,
} from './orchestrator/master-orchestrator';
import { createDefaultLlmProviderRegistry } from './providers/registry';
import type { LlmProviderId } from './providers/types';

export interface AiRuntime {
  readonly orchestrator: MasterOrchestrator;
  readonly agents: ReturnType<typeof createDefaultAgentRegistry>;
  readonly tools: ReturnType<typeof createDefaultToolRegistry>;
  readonly prompts: ReturnType<typeof createDefaultPromptRegistry>;
  readonly providers: ReturnType<typeof createDefaultLlmProviderRegistry>;
  readonly observability: InMemoryAiObservability;
  readonly conversations: ConversationStorePort;
  readonly employeeCapabilities: CapabilityRegistry;
  readonly hardening: AiHardeningPorts;
  getLastOrchestrationDiagnostics(): OrchestrationDiagnostics | null;
}

export interface AiRuntimeIntegrationOptions {
  readonly gateway: McpGatewayService;
  readonly confirmations: InMemoryConfirmationStore;
  readonly policies: PolicyEngine;
  readonly toolExecutor?: ToolExecutorPort;
}

export interface CreateAiRuntimeOptions {
  readonly providerId?: LlmProviderId;
  readonly integration?: AiRuntimeIntegrationOptions;
  readonly conversations?: ConversationStorePort;
  readonly hardening?: AiHardeningPorts;
  /** Swap knowledge retrieval (M6 Enterprise Knowledge Platform) without redesigning agents. */
  readonly knowledgeRetrieval?: KnowledgeRetrievalPort;
}

function buildToolRegistry(integration?: AiRuntimeIntegrationOptions) {
  if (!integration) {
    return createDefaultToolRegistry();
  }
  const tools = createMcpToolRegistry(integration.gateway);
  for (const tool of createDefaultToolRegistry().list()) {
    if (!tools.get(tool.name)) {
      tools.register(tool);
    }
  }
  return tools;
}

export function createAiRuntime(options?: CreateAiRuntimeOptions): AiRuntime {
  const providers = createDefaultLlmProviderRegistry();
  const providerId = options?.providerId ?? 'mock';
  const llm = providers.get(providerId);
  const agents = createDefaultAgentRegistry();
  const tools = buildToolRegistry(options?.integration);
  const prompts = createDefaultPromptRegistry();
  const conversations = options?.conversations ?? new InMemoryConversationStore();
  const hardening = options?.hardening ?? createDefaultAiHardening();
  const memory = createInMemoryFacade();
  const observability = new InMemoryAiObservability();
  const knowledgeCapability = createKnowledgeCapability({
    ...(options?.knowledgeRetrieval ? { retrieval: options.knowledgeRetrieval } : {}),
  });
  const employeeCapabilities = createEmployeeCapabilityRegistry(undefined, [
    createAttendanceCapability(),
    knowledgeCapability,
  ]);
  const leaveCapability =
    (employeeCapabilities.get('ess.leave') as
      ReturnType<typeof createLeaveCapability> | undefined) ?? createLeaveCapability();
  const attendanceCapability =
    (employeeCapabilities.get('ess.attendance') as
      ReturnType<typeof createAttendanceCapability> | undefined) ?? createAttendanceCapability();

  let lastOrchestrationDiagnostics: OrchestrationDiagnostics | null = null;

  const toolExecutor =
    options?.integration &&
    (options.integration.toolExecutor ??
      new McpToolExecutor({
        gateway: options.integration.gateway,
        tools,
        policies: options.integration.policies,
        confirmations: options.integration.confirmations,
      }));

  const resolveConfirmationApproved = options?.integration
    ? async (tenantId: string, userId: string, confirmationId: string) => {
        const item = await options.integration!.confirmations.get(
          asTenantId(tenantId),
          confirmationId,
        );
        return item?.status === 'approved' && String(item.userId) === userId;
      }
    : undefined;

  const baseDeps = {
    conversations,
    memory,
    planner: new HeuristicPlanner(),
    agents,
    tools,
    prompts,
    llm,
    observability,
    employeeCapabilities,
    leaveCapability,
    attendanceCapability,
    knowledgeCapability,
    onOrchestrationDiagnostics: (diagnostics: OrchestrationDiagnostics) => {
      lastOrchestrationDiagnostics = diagnostics;
    },
  };

  let orchestrator: MasterOrchestrator;
  if (toolExecutor && resolveConfirmationApproved) {
    orchestrator = createMasterOrchestrator({
      ...baseDeps,
      toolExecutor,
      resolveConfirmationApproved,
    });
  } else if (toolExecutor) {
    orchestrator = createMasterOrchestrator({
      ...baseDeps,
      toolExecutor,
    });
  } else {
    orchestrator = createMasterOrchestrator(baseDeps);
  }

  return {
    orchestrator,
    agents,
    tools,
    prompts,
    providers,
    observability,
    conversations,
    employeeCapabilities,
    hardening,
    getLastOrchestrationDiagnostics: () => lastOrchestrationDiagnostics,
  };
}
