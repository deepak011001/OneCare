import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { KnowledgeAdminApiService } from '../application/knowledge-admin-api.service';

@Controller('v1/admin/knowledge')
export class KnowledgeAdminController {
  constructor(private readonly admin: KnowledgeAdminApiService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  dashboard(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.dashboard(req.requestContext!));
  }

  @Get('health')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  health(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.health(req.requestContext!));
  }

  @Get('folders')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  folders(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.listFolders(req.requestContext!));
  }

  @Post('folders')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  createFolder(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; parentId?: string | null },
  ) {
    return this.ok(req, this.admin.createFolder(req.requestContext!, body));
  }

  @Patch('folders/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  renameFolder(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { name?: string; parentId?: string | null; archive?: boolean },
  ) {
    if (body.archive) {
      return this.ok(req, this.admin.archiveFolder(req.requestContext!, id));
    }
    if (body.parentId !== undefined) {
      return this.ok(req, this.admin.moveFolder(req.requestContext!, id, body.parentId));
    }
    return this.ok(req, this.admin.renameFolder(req.requestContext!, id, body.name ?? ''));
  }

  @Delete('folders/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  deleteFolder(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.admin.deleteFolder(req.requestContext!, id);
    return this.ok(req, { deleted: true });
  }

  @Get('documents')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  documents(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('folderId') folderId?: string,
    @Query('q') q?: string,
  ) {
    return this.ok(
      req,
      this.admin.listDocuments(req.requestContext!, {
        ...(status ? { status } : {}),
        ...(folderId !== undefined ? { folderId } : {}),
        ...(q ? { q } : {}),
      }),
    );
  }

  @Get('documents/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  document(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ok(req, this.admin.getDocument(req.requestContext!, id));
  }

  @Post('documents')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  createDocument(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      title: string;
      body: string;
      description?: string;
      summary?: string;
      folderId?: string | null;
      categoryIds?: string[];
      tagIds?: string[];
    },
  ) {
    return this.ok(req, this.admin.createDocument(req.requestContext!, body));
  }

  @Patch('documents/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  updateDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      body?: string;
      summary?: string;
      folderId?: string | null;
      categoryIds?: string[];
      tagIds?: string[];
      changeNote?: string;
    },
  ) {
    return this.ok(req, this.admin.updateDocument(req.requestContext!, id, body));
  }

  @Post('documents/:id/publish')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  publish(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ok(req, this.admin.publish(req.requestContext!, id));
  }

  @Post('documents/:id/archive')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  archive(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.ok(req, this.admin.archiveDocument(req.requestContext!, id));
  }

  @Post('documents/:id/versions/:version/restore')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  restore(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('version') version: string,
  ) {
    return this.ok(req, this.admin.restoreVersion(req.requestContext!, id, Number(version)));
  }

  @Post('documents/:id/approve-request')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  requestApproval(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { assignedTo?: string; note?: string },
  ) {
    return this.ok(req, this.admin.requestApproval(req.requestContext!, id, body));
  }

  @Get('categories')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  categories(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.listCategories(req.requestContext!));
  }

  @Post('categories')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  createCategory(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; description?: string },
  ) {
    return this.ok(req, this.admin.createCategory(req.requestContext!, body));
  }

  @Delete('categories/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  deleteCategory(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.admin.deleteCategory(req.requestContext!, id);
    return this.ok(req, { deleted: true });
  }

  @Get('tags')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  tags(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.listTags(req.requestContext!));
  }

  @Post('tags')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  createTag(@Req() req: AuthenticatedRequest, @Body() body: { name: string; color?: string }) {
    return this.ok(req, this.admin.createTag(req.requestContext!, body));
  }

  @Delete('tags/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  deleteTag(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    this.admin.deleteTag(req.requestContext!, id);
    return this.ok(req, { deleted: true });
  }

  @Get('collections')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  collections(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.listCollections(req.requestContext!));
  }

  @Post('collections')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  createCollection(
    @Req() req: AuthenticatedRequest,
    @Body() body: { name: string; description?: string; documentIds?: string[] },
  ) {
    return this.ok(req, this.admin.createCollection(req.requestContext!, body));
  }

  @Patch('collections/:id')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  updateCollection(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; documentIds?: string[] },
  ) {
    return this.ok(req, this.admin.updateCollection(req.requestContext!, id, body));
  }

  @Get('approvals')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  approvals(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    return this.ok(req, this.admin.listApprovals(req.requestContext!, status));
  }

  @Post('approvals/:id/decide')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  decide(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'rejected'; note?: string },
  ) {
    return this.ok(req, this.admin.decideApproval(req.requestContext!, id, body));
  }

  @Post('playground')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  playground(
    @Req() req: AuthenticatedRequest,
    @Body() body: { question: string; scope?: 'draft' | 'published' },
  ) {
    return this.ok(req, this.admin.playground(req.requestContext!, body));
  }

  @Get('analytics')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  analytics(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.analytics(req.requestContext!));
  }

  @Get('diagnostics/duplicates')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  duplicates(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.duplicates(req.requestContext!));
  }

  @Get('settings')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  settings(@Req() req: AuthenticatedRequest) {
    return this.ok(req, this.admin.getSettings(req.requestContext!));
  }

  @Put('settings')
  @RequirePermissions(PERMISSIONS.KNOWLEDGE_ADMIN)
  updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: Partial<{
      maxUploadBytes: number;
      requireApproval: boolean;
      defaultVisibility: 'public' | 'private' | 'restricted';
      autoExpireDays: number;
    }>,
  ) {
    return this.ok(req, this.admin.updateSettings(req.requestContext!, body));
  }

  private ok(req: AuthenticatedRequest, data: unknown) {
    return {
      data,
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}
