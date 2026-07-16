import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PERMISSIONS } from '@onecare/auth';
import type { OneCareEnv } from '@onecare/config';
import { isCookieSecure } from '@onecare/config';
import { DomainError } from '@onecare/shared';
import {
  CurrentPrincipal,
  Public,
  RequirePermissions,
} from '../../../shared/presentation/auth.decorators';
import type { AuthenticatedRequest } from '../../../shared/presentation/auth.decorators';
import type { RequestWithContext } from '../../../shared/presentation/correlation.middleware';
import { APP_TOKENS } from '../../../shared/tokens';
import { IdentityService } from '../application/identity.service';
import type { AuthPrincipal } from '@onecare/auth';

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly identity: IdentityService,
    @Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv,
  ) {}

  @Public()
  @Get('login')
  async loginGet(
    @Req() req: RequestWithContext & Request,
    @Query('email') email: string | undefined,
    @Query('rememberMe') rememberMe: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.env.AUTH_MODE === 'development') {
      if (!email) {
        throw new DomainError('VALIDATION', 'email query parameter is required in development mode');
      }
      const result = await this.identity.developmentLogin({
        email,
        rememberMe: rememberMe === 'true',
        device: deviceFromRequest(req),
        correlationId: req.correlationId,
        requestId: req.requestId,
      });
      this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
      return {
        data: {
          ...result.tokens,
          principal: toPrincipalDto(result.principal),
        },
        meta: { correlationId: req.correlationId, requestId: req.requestId },
      };
    }

    const began = await this.identity.beginEntraLogin({
      correlationId: req.correlationId,
      requestId: req.requestId,
    });
    res.cookie('oc_oidc_state', began.state, {
      httpOnly: true,
      secure: isCookieSecure(this.env),
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });
    return {
      data: { authorizationUrl: began.authorizationUrl },
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Public()
  @Post('login')
  async loginPost(
    @Req() req: RequestWithContext & Request,
    @Body() body: { email?: string; rememberMe?: boolean },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.env.AUTH_MODE !== 'development') {
      throw new DomainError('AUTH_MODE_INVALID', 'POST /v1/auth/login is only for AUTH_MODE=development');
    }
    if (!body.email) {
      throw new DomainError('VALIDATION', 'email is required');
    }
    const result = await this.identity.developmentLogin({
      email: body.email,
      rememberMe: body.rememberMe ?? false,
      device: deviceFromRequest(req),
      correlationId: req.correlationId,
      requestId: req.requestId,
    });
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return {
      data: {
        ...result.tokens,
        principal: toPrincipalDto(result.principal),
      },
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Public()
  @Get('callback')
  async callback(
    @Req() req: RequestWithContext & Request,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.env.AUTH_MODE !== 'entra') {
      throw new DomainError('AUTH_MODE_INVALID', 'Callback is only for AUTH_MODE=entra');
    }
    if (!code || !state) {
      throw new DomainError('VALIDATION', 'code and state are required');
    }
    const parts = state.split('.');
    const codeVerifier = parts[1];
    if (!codeVerifier) {
      throw new DomainError('VALIDATION', 'invalid OIDC state');
    }
    const result = await this.identity.completeEntraCallback({
      code,
      codeVerifier,
      device: deviceFromRequest(req),
      correlationId: req.correlationId,
      requestId: req.requestId,
    });
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.clearCookie('oc_oidc_state');
    return {
      data: {
        ...result.tokens,
        principal: toPrincipalDto(result.principal),
      },
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: RequestWithContext & Request,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = body.refreshToken ?? req.cookies?.[this.env.REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new DomainError('VALIDATION', 'refreshToken is required');
    }
    const result = await this.identity.refresh({
      refreshToken,
      device: deviceFromRequest(req),
      correlationId: req.correlationId,
      requestId: req.requestId,
    });
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return {
      data: {
        ...result.tokens,
        principal: toPrincipalDto(result.principal),
      },
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest & RequestWithContext,
    @CurrentPrincipal() principal: AuthPrincipal,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.identity.logout({
      sessionId: principal.sessionId,
      tenantId: principal.tenantId,
      userId: principal.userId,
      device: deviceFromRequest(req as unknown as Request),
      correlationId: req.correlationId,
      requestId: req.requestId,
    });
    this.clearAuthCookies(res);
    return {
      data: { ok: true },
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('me')
  me(@Req() req: AuthenticatedRequest & RequestWithContext, @CurrentPrincipal() principal: AuthPrincipal) {
    return {
      data: toPrincipalDto(principal),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const secure = isCookieSecure(this.env);
    res.cookie(this.env.AUTH_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: this.env.ACCESS_TOKEN_TTL_SECONDS * 1000,
    });
    res.cookie(this.env.REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: this.env.REFRESH_TOKEN_TTL_SECONDS * 1000,
      path: '/v1/auth',
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(this.env.AUTH_COOKIE_NAME);
    res.clearCookie(this.env.REFRESH_COOKIE_NAME, { path: '/v1/auth' });
  }
}

@Controller('v1/users')
export class UsersController {
  @Get('me')
  @RequirePermissions(PERMISSIONS.EMPLOYEE_READ)
  me(@Req() req: AuthenticatedRequest & RequestWithContext, @CurrentPrincipal() principal: AuthPrincipal) {
    return {
      data: toPrincipalDto(principal),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}

function toPrincipalDto(principal: AuthPrincipal) {
  return {
    userId: principal.userId,
    tenantId: principal.tenantId,
    sessionId: principal.sessionId,
    email: principal.email,
    displayName: principal.displayName,
    roles: principal.roles,
    permissions: principal.permissions,
    organizationId: principal.organizationId ?? null,
    departmentId: principal.departmentId ?? null,
    mfaCompleted: principal.mfaCompleted,
    attributes: principal.attributes,
  };
}

function deviceFromRequest(req: Request) {
  const ua = req.header('user-agent') ?? undefined;
  const platform = req.header('sec-ch-ua-platform') ?? undefined;
  const deviceName = req.header('x-device-name') ?? undefined;
  return {
    ...(req.ip !== undefined ? { ip: req.ip } : {}),
    ...(ua !== undefined ? { userAgent: ua, browser: ua } : {}),
    ...(platform !== undefined ? { platform } : {}),
    ...(deviceName !== undefined ? { deviceName } : {}),
  };
}
