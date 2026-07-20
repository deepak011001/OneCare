import { Module } from '@nestjs/common';
import { createAiRuntime } from '@onecare/ai';
import type { KnowledgeRetrievalPort } from '@onecare/ess-knowledge';
import type { McpPlatform } from '@onecare/mcp';
import { AI_TOKENS } from './ai.tokens';
import { AiService } from './application/ai.service';
import { AiController } from './presentation/ai.controller';
import { MCP_TOKENS } from '../mcp/mcp.tokens';
import { APP_TOKENS } from '../../shared/tokens';
import {
  KNOWLEDGE_TENANT_HOLDER,
  type KnowledgeTenantHolder,
} from '../knowledge-platform/knowledge-platform.module';

@Module({
  controllers: [AiController],
  providers: [
    {
      provide: AI_TOKENS.RUNTIME,
      useFactory: async (
        platform: McpPlatform,
        retrieval: KnowledgeRetrievalPort,
        tenantHolder: KnowledgeTenantHolder,
      ) => {
        const bound: KnowledgeRetrievalPort = {
          engineId: retrieval.engineId,
          search: async (query) => {
            if (query.tenantId) tenantHolder.current = query.tenantId;
            return retrieval.search(query);
          },
          getById: (id) => retrieval.getById(id),
          listRelated: (id, limit) => retrieval.listRelated(id, limit),
          listPopular: (limit) => retrieval.listPopular?.(limit) ?? Promise.resolve([]),
          listCategories: () => retrieval.listCategories?.() ?? Promise.resolve([]),
        };
        return createAiRuntime({
          providerId: 'mock',
          knowledgeRetrieval: bound,
          integration: {
            gateway: platform.gateway,
            confirmations: platform.confirmations,
            policies: platform.policies,
          },
        });
      },
      inject: [MCP_TOKENS.PLATFORM, APP_TOKENS.KNOWLEDGE_RETRIEVAL, KNOWLEDGE_TENANT_HOLDER],
    },
    {
      provide: AI_TOKENS.ORCHESTRATOR,
      useFactory: (runtime: ReturnType<typeof createAiRuntime>) => runtime.orchestrator,
      inject: [AI_TOKENS.RUNTIME],
    },
    AiService,
  ],
  exports: [AiService, AI_TOKENS.RUNTIME, AI_TOKENS.ORCHESTRATOR],
})
export class AiModule {}
