import { Controller, Get, Inject, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import type { PrismaClient } from '@onecare/database';
import { NotFoundError } from '@onecare/shared';
import {
  CurrentPrincipal,
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import type { RequestWithContext } from '../../../shared/presentation/correlation.middleware';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuthPrincipal } from '@onecare/auth';

@Controller('v1/tenants')
export class TenantsController {
  constructor(@Inject(APP_TOKENS.PRISMA) private readonly prisma: PrismaClient) {}

  @Get('current')
  @RequirePermissions(PERMISSIONS.TENANT_READ)
  async current(
    @Req() req: AuthenticatedRequest & RequestWithContext,
    @CurrentPrincipal() principal: AuthPrincipal,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: principal.tenantId, deletedAt: null },
    });
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    return {
      data: {
        id: tenant.id,
        slug: tenant.slug,
        displayName: tenant.displayName,
        domain: tenant.domain,
        status: tenant.status,
        branding: tenant.brandingJson,
        settings: tenant.settingsJson,
        defaultLanguage: tenant.defaultLanguage,
        defaultTimezone: tenant.defaultTimezone,
        license: tenant.licenseJson,
        createdAt: tenant.createdAt,
      },
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}
