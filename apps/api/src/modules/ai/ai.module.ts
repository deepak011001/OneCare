import { Module } from '@nestjs/common';
import { createAiRuntime } from '@onecare/ai';
import { AI_TOKENS } from './ai.tokens';
import { AiService } from './application/ai.service';
import { AiController } from './presentation/ai.controller';

@Module({
  controllers: [AiController],
  providers: [
    {
      provide: AI_TOKENS.RUNTIME,
      // M3: only the mock provider executes. Stub providers remain listable.
      useFactory: () => createAiRuntime({ providerId: 'mock' }),
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
