import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { KnowledgeService } from '../application/knowledge.service';

@Controller('v1/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_SEARCH)
  async dashboard(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.knowledge.getDashboard(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('search')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_SEARCH)
  async search(
    @Req() req: AuthenticatedRequest,
    @Query('q') q: string,
    @Query('domain') domain?: string,
    @Query('category') category?: string,
  ) {
    return {
      data: await this.knowledge.search(req.requestContext!, {
        q: q ?? '',
        ...(domain ? { domain } : {}),
        ...(category ? { category } : {}),
      }),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('ask')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_SEARCH)
  async ask(@Req() req: AuthenticatedRequest, @Body() body: { message?: string }) {
    return {
      data: await this.knowledge.ask(req.requestContext!, body.message ?? ''),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('popular')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_SEARCH)
  async popular(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.knowledge.getPopular(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('categories')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_SEARCH)
  async categories(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.knowledge.getCategories(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('help')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_SEARCH)
  async help(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.knowledge.getHelp(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('documents/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_SEARCH)
  async document(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return {
      data: await this.knowledge.getDocument(req.requestContext!, id),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}
