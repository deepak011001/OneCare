import { Module } from '@nestjs/common';
import { createAiRuntime } from '@onecare/ai';
import { createMcpPlatform, type McpPlatform } from '@onecare/mcp';
import { AI_TOKENS } from './ai.tokens';
import { AiService } from './application/ai.service';
import { AiController } from './presentation/ai.controller';
import { MCP_TOKENS } from '../mcp/mcp.tokens';

@Module({
  controllers: [AiController],
  providers: [
    {
      provide: AI_TOKENS.RUNTIME,
      useFactory: async (platform: McpPlatform) =>
        createAiRuntime({
          providerId: 'mock',
          integration: {
            gateway: platform.gateway,
            confirmations: platform.confirmations,
            policies: platform.policies,
          },
        }),
      inject: [MCP_TOKENS.PLATFORM],
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
