import { Module } from '@nestjs/common';
import { KnowledgeService } from './application/knowledge.service';
import { KnowledgeController } from './presentation/knowledge.controller';

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
