import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionPort, TokenPort } from '@onecare/auth';
import type { OneCareEnv } from '@onecare/config';
import {
  AUDIT_ACTIONS,
  ForbiddenError,
  UnauthorizedError,
  asCorrelationId,
  asRequestId,
  asSessionId,
  asTenantId,
  asTraceId,
  asUserId,
  type RequestContext,
} from '@onecare/shared';
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';
import { IdentityService } from '../application/identity.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityService,
    @Inject(APP_TOKENS.TOKEN_PORT) private readonly tokens: TokenPort,
    @Inject(APP_TOKENS.SESSION_PORT) private readonly sessions: SessionPort,
    @Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accessToken = this.extractAccessToken(request);
    if (!accessToken) {
      throw new UnauthorizedError('Missing access token');
    }

    const claims = await this.tokens.verifyAccessToken(accessToken);
    const session = await this.sessions.touchSession(claims.sid);
    if (!session) {
      throw new UnauthorizedError('Session expired or revoked');
    }

    if (session.tenantId !== claims.tid || session.userId !== claims.sub) {
      throw new UnauthorizedError('Token/session tenant mismatch');
    }

    const principal = await this.identity.loadPrincipal(claims.sub, claims.sid);
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required?.length) {
      const checker = this.identity.getPermissionChecker();
      const allowed = required.every((permission) => checker.hasPermission(principal, permission));
      if (!allowed) {
        await this.audit.write({
          tenantId: principal.tenantId,
          userId: principal.userId,
          sessionId: principal.sessionId,
          action: AUDIT_ACTIONS.PERMISSION_DENIED,
          resource: 'permission',
          resourceId: required.join(','),
          result: 'denied',
          correlationId: request.correlationId,
          requestId: request.requestId,
        });
        throw new ForbiddenError(`Missing permissions: ${required.join(', ')}`);
      }
    }

    const requestContext: RequestContext = {
      correlationId: asCorrelationId(request.correlationId),
      requestId: asRequestId(request.requestId),
      traceId: asTraceId(request.traceId),
      tenantId: asTenantId(principal.tenantId),
      userId: asUserId(principal.userId),
      sessionId: asSessionId(principal.sessionId),
      roles: principal.roles,
      permissions: principal.permissions,
      attributes: principal.attributes,
      ...(principal.organizationId ? { organizationId: principal.organizationId } : {}),
      ...(principal.departmentId ? { departmentId: principal.departmentId } : {}),
    };

    request.principal = principal;
    request.requestContext = requestContext;
    return true;
  }

  private extractAccessToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;
    if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim();
    }
    const cookieName = this.env.AUTH_COOKIE_NAME;
    const cookieToken = request.cookies?.[cookieName];
    return cookieToken ?? null;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: IdentityService,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.principal) {
      throw new UnauthorizedError('Unauthenticated');
    }

    const checker = this.identity.getPermissionChecker();
    const allowed = required.every((permission) =>
      checker.hasPermission(request.principal!, permission),
    );
    if (!allowed) {
      await this.audit.write({
        tenantId: request.principal.tenantId,
        userId: request.principal.userId,
        sessionId: request.principal.sessionId,
        action: AUDIT_ACTIONS.PERMISSION_DENIED,
        resource: 'permission',
        resourceId: required.join(','),
        result: 'denied',
        correlationId: request.correlationId,
        requestId: request.requestId,
      });
      throw new ForbiddenError(`Missing permissions: ${required.join(', ')}`);
    }
    return true;
  }
}
