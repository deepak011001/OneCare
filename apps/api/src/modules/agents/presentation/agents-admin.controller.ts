import { Controller, Get, Param, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { AgentsAdminService } from '../application/agents-admin.service';

@Controller('v1/agents')
export class AgentsAdminController {
  constructor(private readonly agents: AgentsAdminService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AI_AGENTS_READ)
  list(@Req() req: AuthenticatedRequest) {
    return {
      data: this.agents.list(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('health')
  @RequirePermissions(PERMISSIONS.AI_AGENTS_READ)
  async health(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.agents.health(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('capabilities')
  @RequirePermissions(PERMISSIONS.AI_AGENTS_READ)
  capabilities(@Req() req: AuthenticatedRequest) {
    return {
      data: this.agents.capabilities(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.AI_AGENTS_READ)
  get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return {
      data: this.agents.get(req.requestContext!, id),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}
