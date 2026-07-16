import { Inject, Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';
import type { AccessTokenClaims, TokenPort } from '@onecare/auth';
import type { OneCareEnv } from '@onecare/config';
import { UnauthorizedError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';

@Injectable()
export class JoseTokenService implements TokenPort {
  private readonly secret: Uint8Array;

  constructor(@Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv) {
    this.secret = new TextEncoder().encode(env.SESSION_SECRET);
  }

  async signAccessToken(claims: AccessTokenClaims, ttlSeconds: number): Promise<string> {
    const builder = new SignJWT({
      tid: claims.tid,
      sid: claims.sid,
      email: claims.email,
      roles: claims.roles,
      permissions: claims.permissions,
      ...(claims.orgId ? { orgId: claims.orgId } : {}),
      ...(claims.deptId ? { deptId: claims.deptId } : {}),
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuer(this.env.JWT_ISSUER)
      .setAudience(this.env.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${ttlSeconds}s`);

    return builder.sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.env.JWT_ISSUER,
        audience: this.env.JWT_AUDIENCE,
      });

      if (!payload.sub || typeof payload.tid !== 'string' || typeof payload.sid !== 'string') {
        throw new UnauthorizedError('Invalid access token claims');
      }

      return {
        sub: payload.sub,
        tid: payload.tid,
        sid: payload.sid,
        email: typeof payload.email === 'string' ? payload.email : '',
        roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions.map(String) : [],
        ...(typeof payload.orgId === 'string' ? { orgId: payload.orgId } : {}),
        ...(typeof payload.deptId === 'string' ? { deptId: payload.deptId } : {}),
      };
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }
}
