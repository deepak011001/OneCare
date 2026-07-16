import { Controller, Get, Inject, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import type { PrismaClient } from '@onecare/database';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import type { RequestWithContext } from '../../../shared/presentation/correlation.middleware';
import { APP_TOKENS } from '../../../shared/tokens';

@Controller('v1')
export class RbacController {
  constructor(@Inject(APP_TOKENS.PRISMA) private readonly prisma: PrismaClient) {}

  @Get('roles')
  @RequirePermissions(PERMISSIONS.RBAC_ROLE_READ)
  async listRoles(@Req() req: AuthenticatedRequest & RequestWithContext) {
    const tenantId = req.principal!.tenantId;
    const roles = await this.prisma.role.findMany({
      where: {
        deletedAt: null,
        OR: [{ tenantId: null, isSystem: true }, { tenantId }],
      },
      orderBy: { code: 'asc' },
    });

    return {
      data: roles.map((role) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        tenantId: role.tenantId,
      })),
      meta: {
        correlationId: req.correlationId,
        requestId: req.requestId,
        total: roles.length,
      },
    };
  }

  @Get('permissions')
  @RequirePermissions(PERMISSIONS.RBAC_PERMISSION_READ)
  async listPermissions(@Req() req: AuthenticatedRequest & RequestWithContext) {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    return {
      data: permissions.map((permission) => ({
        id: permission.id,
        code: permission.code,
        module: permission.module,
        description: permission.description,
      })),
      meta: {
        correlationId: req.correlationId,
        requestId: req.requestId,
        total: permissions.length,
      },
    };
  }
}
