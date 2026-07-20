import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AgentsAdminService } from './application/agents-admin.service';
import { AgentsAdminController } from './presentation/agents-admin.controller';

@Module({
  imports: [AiModule],
  controllers: [AgentsAdminController],
  providers: [AgentsAdminService],
  exports: [AgentsAdminService],
})
export class AgentsModule {}
