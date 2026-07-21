import { Module } from '@nestjs/common';
import { KnowledgeAdminApiService } from './application/knowledge-admin-api.service';
import { KnowledgeAdminController } from './presentation/knowledge-admin.controller';

@Module({
  controllers: [KnowledgeAdminController],
  providers: [KnowledgeAdminApiService],
  exports: [KnowledgeAdminApiService],
})
export class KnowledgeAdminModule {}
