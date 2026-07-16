export interface OidcUserProfile {
  readonly subject: string;
  readonly email: string;
  readonly displayName: string;
  readonly tenantHint?: string;
}

export interface OidcPort {
  getAuthorizationUrl(input: {
    readonly state: string;
    readonly nonce: string;
    readonly codeChallenge: string;
  }): Promise<string>;

  exchangeCode(input: {
    readonly code: string;
    readonly codeVerifier: string;
  }): Promise<OidcUserProfile>;
}

export interface AccessTokenClaims {
  readonly sub: string;
  readonly tid: string;
  readonly sid: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly orgId?: string;
  readonly deptId?: string;
}

export interface TokenPort {
  signAccessToken(claims: AccessTokenClaims, ttlSeconds: number): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims>;
}

export interface SessionDeviceInfo {
  readonly deviceName?: string;
  readonly browser?: string;
  readonly platform?: string;
  readonly ip?: string;
  readonly userAgent?: string;
}

export interface CreateSessionInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly rememberMe: boolean;
  readonly device: SessionDeviceInfo;
  readonly mfaStatus: 'not_required' | 'pending' | 'completed';
}

export interface SessionRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly absoluteExpiresAt: Date;
  readonly idleExpiresAt: Date;
  readonly lastActivityAt: Date;
  readonly revokedAt: Date | null;
  readonly rememberMe: boolean;
  readonly mfaStatus: string;
}

export interface RefreshTokenRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly familyId: string;
  readonly rotationCount: number;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly reuseDetected: boolean;
  readonly compromisedAt: Date | null;
}

export interface SessionPort {
  createSession(input: CreateSessionInput): Promise<{
    session: SessionRecord;
    refreshToken: string;
  }>;
  touchSession(sessionId: string): Promise<SessionRecord | null>;
  getSession(sessionId: string): Promise<SessionRecord | null>;
  revokeSession(sessionId: string): Promise<void>;
  rotateRefreshToken(rawRefreshToken: string): Promise<{
    session: SessionRecord;
    refreshToken: string;
    reuseDetected: boolean;
  }>;
  revokeRefreshFamily(familyId: string): Promise<void>;
}
