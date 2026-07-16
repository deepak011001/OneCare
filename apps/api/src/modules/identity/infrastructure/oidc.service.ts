import { Inject, Injectable } from '@nestjs/common';
import type { OidcPort, OidcUserProfile } from '@onecare/auth';
import type { OneCareEnv } from '@onecare/config';
import { DomainError, UnauthorizedError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';

/**
 * Microsoft Entra ID OIDC adapter (authorization code + PKCE).
 * Uses Entra v2.0 endpoints; token validation via userinfo/openid claims from token response.
 */
@Injectable()
export class EntraOidcService implements OidcPort {
  constructor(@Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv) {}

  async getAuthorizationUrl(input: {
    readonly state: string;
    readonly nonce: string;
    readonly codeChallenge: string;
  }): Promise<string> {
    this.assertEntraConfigured();
    const params = new URLSearchParams({
      client_id: this.env.ENTRA_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: this.env.ENTRA_REDIRECT_URI!,
      response_mode: 'query',
      scope: this.env.ENTRA_SCOPES,
      state: input.state,
      nonce: input.nonce,
      code_challenge: input.codeChallenge,
      code_challenge_method: 'S256',
    });
    return `https://login.microsoftonline.com/${this.env.ENTRA_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(input: {
    readonly code: string;
    readonly codeVerifier: string;
  }): Promise<OidcUserProfile> {
    this.assertEntraConfigured();
    const body = new URLSearchParams({
      client_id: this.env.ENTRA_CLIENT_ID!,
      client_secret: this.env.ENTRA_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: this.env.ENTRA_REDIRECT_URI!,
      code_verifier: input.codeVerifier,
    });

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${this.env.ENTRA_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!tokenResponse.ok) {
      throw new UnauthorizedError('Entra token exchange failed');
    }

    const tokenJson = (await tokenResponse.json()) as {
      access_token?: string;
      id_token?: string;
    };

    if (!tokenJson.access_token) {
      throw new UnauthorizedError('Entra token response missing access_token');
    }

    const profileResponse = await fetch('https://graph.microsoft.com/oidc/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });

    if (!profileResponse.ok) {
      // Fallback: decode id_token payload without verify only for claim extraction after successful token exchange
      if (!tokenJson.id_token) {
        throw new UnauthorizedError('Unable to resolve Entra user profile');
      }
      const payload = decodeJwtPayload(tokenJson.id_token);
      return {
        subject: String(payload.sub ?? ''),
        email: String(payload.email ?? payload.preferred_username ?? ''),
        displayName: String(payload.name ?? payload.email ?? 'Entra User'),
        ...(typeof payload.tid === 'string' ? { tenantHint: payload.tid } : {}),
      };
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    if (!profile.sub || !profile.email) {
      throw new UnauthorizedError('Entra userinfo incomplete');
    }

    return {
      subject: profile.sub,
      email: profile.email,
      displayName: profile.name ?? profile.email,
    };
  }

  private assertEntraConfigured(): void {
    if (this.env.AUTH_MODE !== 'entra') {
      throw new DomainError('AUTH_MODE_INVALID', 'Entra OIDC requires AUTH_MODE=entra');
    }
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  const payload = parts[1];
  if (!payload) {
    return {};
  }
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

/** Development OIDC stub — never used in production (env guard). */
@Injectable()
export class DevelopmentOidcService implements OidcPort {
  constructor(@Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv) {}

  async getAuthorizationUrl(): Promise<string> {
    this.assertAllowed();
    return `${this.env.WEB_URL}/dev-auth-not-applicable`;
  }

  async exchangeCode(): Promise<OidcUserProfile> {
    this.assertAllowed();
    throw new DomainError(
      'DEV_AUTH_USE_LOGIN',
      'Use POST /v1/auth/login with { email } in development mode',
    );
  }

  private assertAllowed(): void {
    if (this.env.NODE_ENV === 'production' || this.env.AUTH_MODE !== 'development') {
      throw new DomainError('DEV_AUTH_FORBIDDEN', 'Development auth is not available');
    }
  }
}
