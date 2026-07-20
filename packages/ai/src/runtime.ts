import { InMemoryConversationStore } from '@onecare/conversations';
import { createInMemoryFacade } from '@onecare/memory';
import { HeuristicPlanner } from '@onecare/planner';
import { createDefaultPromptRegistry } from '@onecare/prompts';
import { createDefaultToolRegistry } from '@onecare/tools';
import { createDefaultAgentRegistry } from './agents/registry';
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
  readonly conversations: InMemoryConversationStore;
}

export function createAiRuntime(options?: { providerId?: LlmProviderId }): AiRuntime {
  const providers = createDefaultLlmProviderRegistry();
  const providerId = options?.providerId ?? 'mock';
  const llm = providers.get(providerId);
  const agents = createDefaultAgentRegistry();
  const tools = createDefaultToolRegistry();
  const prompts = createDefaultPromptRegistry();
  const conversations = new InMemoryConversationStore();
  const memory = createInMemoryFacade();
  const observability = new InMemoryAiObservability();
  const orchestrator = createMasterOrchestrator({
    conversations,
    memory,
    planner: new HeuristicPlanner(),
    agents,
    tools,
    prompts,
    llm,
    observability,
  });

  return {
    orchestrator,
    agents,
    tools,
    prompts,
    providers,
    observability,
    conversations,
  };
}
