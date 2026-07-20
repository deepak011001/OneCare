import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  type AuthPrincipal,
  type OidcPort,
  type SessionPort,
  type TokenPort,
  RbacPermissionChecker,
} from '@onecare/auth';
import type { OneCareEnv } from '@onecare/config';
import type { PrismaClient } from '@onecare/database';
import { DOMAIN_EVENTS, type EventBusPort } from '@onecare/events';
import type { MfaChallengePort } from '@onecare/security';
import {
  AUDIT_ACTIONS,
  DomainError,
  UnauthorizedError,
  asTenantId,
  asUserId,
} from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';

export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly tokenType: 'Bearer';
}

export interface DeviceContext {
  readonly ip?: string;
  readonly userAgent?: string;
  readonly deviceName?: string;
  readonly browser?: string;
  readonly platform?: string;
}

@Injectable()
export class IdentityService {
  private readonly permissionChecker = new RbacPermissionChecker();

  constructor(
    @Inject(APP_TOKENS.PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv,
    @Inject(APP_TOKENS.TOKEN_PORT) private readonly tokens: TokenPort,
    @Inject(APP_TOKENS.SESSION_PORT) private readonly sessions: SessionPort,
    @Inject(APP_TOKENS.OIDC_PORT) private readonly oidc: OidcPort,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(APP_TOKENS.EVENT_BUS) private readonly events: EventBusPort,
    @Inject(APP_TOKENS.MFA_PORT) private readonly mfa: MfaChallengePort,
  ) {}

  async beginEntraLogin(input: {
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<{ authorizationUrl: string; state: string }> {
    if (this.env.AUTH_MODE !== 'entra') {
      throw new DomainError('AUTH_MODE_INVALID', 'Entra login requires AUTH_MODE=entra');
    }
    const state = randomBytes(16).toString('base64url');
    const nonce = randomBytes(16).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');

    // Store PKCE verifier in audit metadata is wrong — use a short-lived DB-less approach via state encoding
    // Production: Redis. For M1 we embed signed state package in opaque state map via cache in controller.
    const authorizationUrl = await this.oidc.getAuthorizationUrl({
      state: `${state}.${verifier}.${nonce}`,
      nonce,
      codeChallenge: challenge,
    });

    await this.audit.write({
      action: AUDIT_ACTIONS.USER_LOGIN,
      result: 'success',
      resource: 'auth',
      resourceId: 'entra.begin',
      correlationId: input.correlationId,
      requestId: input.requestId,
      metadata: { phase: 'authorize' },
    });

    return { authorizationUrl, state: `${state}.${verifier}.${nonce}` };
  }

  async completeEntraCallback(input: {
    readonly code: string;
    readonly codeVerifier: string;
    readonly device: DeviceContext;
    readonly correlationId: string;
    readonly requestId: string;
    readonly rememberMe?: boolean;
  }): Promise<{ tokens: AuthTokens; principal: AuthPrincipal }> {
    const profile = await this.oidc.exchangeCode({
      code: input.code,
      codeVerifier: input.codeVerifier,
    });

    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        status: 'active',
        OR: [{ entraOid: profile.subject }, { email: profile.email.toLowerCase() }],
      },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
        attributes: true,
      },
    });

    if (!user) {
      await this.audit.write({
        action: AUDIT_ACTIONS.USER_LOGIN,
        result: 'failure',
        resource: 'auth',
        correlationId: input.correlationId,
        requestId: input.requestId,
        ip: input.device.ip,
        userAgent: input.device.userAgent,
        metadata: { reason: 'user_not_provisioned', email: profile.email },
      });
      throw new UnauthorizedError('User is not provisioned in OneCare');
    }

    if (!user.entraOid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { entraOid: profile.subject, lastLoginAt: new Date() },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    return this.issueSessionForUser(
      user.id,
      input.device,
      input.correlationId,
      input.requestId,
      input.rememberMe ?? false,
    );
  }

  async developmentLogin(input: {
    readonly email: string;
    readonly device: DeviceContext;
    readonly correlationId: string;
    readonly requestId: string;
    readonly rememberMe?: boolean;
  }): Promise<{ tokens: AuthTokens; principal: AuthPrincipal }> {
    if (this.env.NODE_ENV === 'production' || this.env.AUTH_MODE !== 'development') {
      throw new DomainError('DEV_AUTH_FORBIDDEN', 'Development login is not available');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email: input.email.toLowerCase(),
        deletedAt: null,
        status: 'active',
      },
    });

    if (!user) {
      throw new UnauthorizedError('Unknown development user — run prisma seed');
    }

    return this.issueSessionForUser(
      user.id,
      input.device,
      input.correlationId,
      input.requestId,
      input.rememberMe ?? false,
    );
  }

  async refresh(input: {
    readonly refreshToken: string;
    readonly device: DeviceContext;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<{ tokens: AuthTokens; principal: AuthPrincipal }> {
    try {
      const rotated = await this.sessions.rotateRefreshToken(input.refreshToken);
      const principal = await this.loadPrincipal(rotated.session.userId, rotated.session.id);
      const accessToken = await this.tokens.signAccessToken(
        {
          sub: principal.userId,
          tid: principal.tenantId,
          sid: principal.sessionId,
          email: principal.email,
          roles: principal.roles,
          permissions: principal.permissions,
          ...(principal.organizationId ? { orgId: principal.organizationId } : {}),
          ...(principal.departmentId ? { deptId: principal.departmentId } : {}),
        },
        this.env.ACCESS_TOKEN_TTL_SECONDS,
      );

      await this.audit.write({
        tenantId: principal.tenantId,
        userId: principal.userId,
        sessionId: principal.sessionId,
        action: AUDIT_ACTIONS.TOKEN_REFRESH,
        resource: 'session',
        resourceId: principal.sessionId,
        result: 'success',
        ip: input.device.ip,
        userAgent: input.device.userAgent,
        correlationId: input.correlationId,
        requestId: input.requestId,
      });

      await this.events.publish({
        name: DOMAIN_EVENTS.TOKEN_REFRESHED,
        occurredAt: new Date(),
        tenantId: principal.tenantId,
        correlationId: input.correlationId,
        payload: { userId: principal.userId, sessionId: principal.sessionId },
      });

      return {
        tokens: {
          accessToken,
          refreshToken: rotated.refreshToken,
          expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
          tokenType: 'Bearer',
        },
        principal,
      };
    } catch (error) {
      await this.audit.write({
        action: AUDIT_ACTIONS.TOKEN_REUSE_DETECTED,
        result: 'failure',
        resource: 'refresh_token',
        ip: input.device.ip,
        userAgent: input.device.userAgent,
        correlationId: input.correlationId,
        requestId: input.requestId,
        metadata: { message: error instanceof Error ? error.message : 'refresh_failed' },
      });
      throw error;
    }
  }

  async logout(input: {
    readonly sessionId: string;
    readonly tenantId: string;
    readonly userId: string;
    readonly device: DeviceContext;
    readonly correlationId: string;
    readonly requestId: string;
  }): Promise<void> {
    await this.sessions.revokeSession(input.sessionId);
    await this.audit.write({
      tenantId: input.tenantId,
      userId: input.userId,
      sessionId: input.sessionId,
      action: AUDIT_ACTIONS.USER_LOGOUT,
      resource: 'session',
      resourceId: input.sessionId,
      result: 'success',
      ip: input.device.ip,
      userAgent: input.device.userAgent,
      correlationId: input.correlationId,
      requestId: input.requestId,
    });
    await this.events.publish({
      name: DOMAIN_EVENTS.USER_LOGGED_OUT,
      occurredAt: new Date(),
      tenantId: input.tenantId,
      correlationId: input.correlationId,
      payload: { userId: input.userId, sessionId: input.sessionId },
    });
  }

  async loadPrincipal(userId: string, sessionId: string): Promise<AuthPrincipal> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, status: 'active' },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        attributes: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const session = await this.sessions.getSession(sessionId);
    if (!session || session.revokedAt) {
      throw new UnauthorizedError('Session invalid');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.code)),
      ),
    ];

    const attributes = Object.fromEntries(user.attributes.map((a) => [a.key, a.valueJson]));

    const principal: AuthPrincipal = {
      userId: asUserId(user.id),
      tenantId: asTenantId(user.tenantId),
      sessionId,
      email: user.email,
      displayName: user.displayName,
      roles,
      permissions,
      attributes,
      mfaCompleted: session.mfaStatus === 'completed' || session.mfaStatus === 'not_required',
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
      ...(user.departmentId ? { departmentId: user.departmentId } : {}),
    };

    // Touch MFA extension point (no-op today)
    await this.mfa.isRequired({ tenantId: user.tenantId, userId: user.id });

    return principal;
  }

  getPermissionChecker(): RbacPermissionChecker {
    return this.permissionChecker;
  }

  private async issueSessionForUser(
    userId: string,
    device: DeviceContext,
    correlationId: string,
    requestId: string,
    rememberMe: boolean,
  ): Promise<{ tokens: AuthTokens; principal: AuthPrincipal }> {
    const user = await this.prisma.user.findFirstOrThrow({ where: { id: userId } });
    const mfaRequired = await this.mfa.isRequired({ tenantId: user.tenantId, userId });
    const created = await this.sessions.createSession({
      tenantId: user.tenantId,
      userId: user.id,
      rememberMe,
      device,
      mfaStatus: mfaRequired ? 'pending' : 'not_required',
    });

    const principal = await this.loadPrincipal(user.id, created.session.id);
    const accessToken = await this.tokens.signAccessToken(
      {
        sub: principal.userId,
        tid: principal.tenantId,
        sid: principal.sessionId,
        email: principal.email,
        roles: principal.roles,
        permissions: principal.permissions,
        ...(principal.organizationId ? { orgId: principal.organizationId } : {}),
        ...(principal.departmentId ? { deptId: principal.departmentId } : {}),
      },
      this.env.ACCESS_TOKEN_TTL_SECONDS,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.write({
      tenantId: principal.tenantId,
      userId: principal.userId,
      sessionId: principal.sessionId,
      action: AUDIT_ACTIONS.USER_LOGIN,
      resource: 'session',
      resourceId: principal.sessionId,
      result: 'success',
      ip: device.ip,
      userAgent: device.userAgent,
      correlationId,
      requestId,
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.USER_LOGGED_IN,
      occurredAt: new Date(),
      tenantId: principal.tenantId,
      correlationId,
      payload: { userId: principal.userId, sessionId: principal.sessionId },
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.SESSION_CREATED,
      occurredAt: new Date(),
      tenantId: principal.tenantId,
      correlationId,
      payload: { sessionId: principal.sessionId, userId: principal.userId },
    });

    return {
      tokens: {
        accessToken,
        refreshToken: created.refreshToken,
        expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
        tokenType: 'Bearer',
      },
      principal,
    };
  }
}
