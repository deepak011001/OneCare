import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import type { KnowledgeSourceConfig, SyncMode } from '@onecare/knowledge-platform';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { KnowledgePlatformService } from '../application/knowledge-platform.service';

@Controller('v1/knowledge-platform')
export class KnowledgePlatformController {
  constructor(private readonly platform: KnowledgePlatformService) {}

  @Get('connectors')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async connectors(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.platform.listConnectors(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('sources')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async sources(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.platform.listSources(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Put('sources')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async upsertSource(@Req() req: AuthenticatedRequest, @Body() body: KnowledgeSourceConfig) {
    return {
      data: await this.platform.upsertSource(req.requestContext!, body),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('sync')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async sync(
    @Req() req: AuthenticatedRequest,
    @Body() body: { sourceId?: string; mode?: SyncMode },
  ) {
    return {
      data: await this.platform.sync(req.requestContext!, {
        sourceId: body.sourceId ?? '',
        ...(body.mode ? { mode: body.mode } : {}),
      }),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('jobs')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async jobs(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.platform.listJobs(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('jobs/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async job(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return {
      data: await this.platform.getJob(req.requestContext!, id),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('documents')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async documents(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.platform.listDocuments(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('diagnostics/search')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async diagnostics(@Req() req: AuthenticatedRequest, @Query('q') q: string) {
    return {
      data: await this.platform.diagnostics(req.requestContext!, q ?? ''),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('index/health')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  async indexHealth(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.platform.indexHealth(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}
