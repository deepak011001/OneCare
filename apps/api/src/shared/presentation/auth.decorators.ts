import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AuthPrincipal } from '@onecare/auth';
import type { RequestContext } from '@onecare/shared';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export type AuthenticatedRequest = {
  principal?: AuthPrincipal;
  requestContext?: RequestContext;
  correlationId: string;
  requestId: string;
  traceId: string;
  cookies?: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.principal) {
      throw new Error('Principal missing — AuthGuard required');
    }
    return request.principal;
  },
);

export const CurrentContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.requestContext) {
      throw new Error('RequestContext missing — AuthGuard required');
    }
    return request.requestContext;
  },
);
