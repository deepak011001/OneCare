import { Global, Inject, Module, OnModuleInit } from '@nestjs/common';
import type { OneCareEnv } from '@onecare/config';
import {
  createEnterpriseKnowledgePlatform,
  createTenantAwareKnowledgeRetrieval,
  type EnterpriseKnowledgePlatform,
} from '@onecare/knowledge-platform';
import { createStubKnowledgeStore, type KnowledgeRetrievalPort } from '@onecare/ess-knowledge';
import { APP_TOKENS } from '../../shared/tokens';
import { KnowledgePlatformService } from './application/knowledge-platform.service';
import { KnowledgePlatformController } from './presentation/knowledge-platform.controller';

export const KNOWLEDGE_TENANT_HOLDER = 'KNOWLEDGE_TENANT_HOLDER';

export type KnowledgeTenantHolder = { current: string };

@Global()
@Module({
  controllers: [KnowledgePlatformController],
  providers: [
    {
      provide: KNOWLEDGE_TENANT_HOLDER,
      useValue: { current: 'default' } satisfies KnowledgeTenantHolder,
    },
    {
      provide: APP_TOKENS.KNOWLEDGE_PLATFORM,
      useFactory: async (env: OneCareEnv): Promise<EnterpriseKnowledgePlatform | null> => {
        if (env.KNOWLEDGE_ENGINE === 'stub') {
          return null;
        }
        return createEnterpriseKnowledgePlatform({
          tenantId: 'default',
          seedStubCorpus: true,
        });
      },
      inject: [APP_TOKENS.ENV],
    },
    {
      provide: APP_TOKENS.KNOWLEDGE_RETRIEVAL,
      useFactory: (
        platform: EnterpriseKnowledgePlatform | null,
        holder: KnowledgeTenantHolder,
        env: OneCareEnv,
      ): KnowledgeRetrievalPort => {
        if (!platform || env.KNOWLEDGE_ENGINE === 'stub') {
          return createStubKnowledgeStore();
        }
        return createTenantAwareKnowledgeRetrieval(platform, () => holder.current);
      },
      inject: [APP_TOKENS.KNOWLEDGE_PLATFORM, KNOWLEDGE_TENANT_HOLDER, APP_TOKENS.ENV],
    },
    KnowledgePlatformService,
  ],
  exports: [
    APP_TOKENS.KNOWLEDGE_PLATFORM,
    APP_TOKENS.KNOWLEDGE_RETRIEVAL,
    KNOWLEDGE_TENANT_HOLDER,
    KnowledgePlatformService,
  ],
})
export class KnowledgePlatformModule implements OnModuleInit {
  constructor(
    @Inject(APP_TOKENS.KNOWLEDGE_PLATFORM)
    private readonly platform: EnterpriseKnowledgePlatform | null,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.platform) {
      await this.platform.ensureTenantCorpus('default');
    }
  }
}
