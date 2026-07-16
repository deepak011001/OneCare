import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateSessionInput,
  SessionPort,
  SessionRecord,
} from '@onecare/auth';
import type { CachePort } from '@onecare/cache';
import type { OneCareEnv } from '@onecare/config';
import type { PrismaClient } from '@onecare/database';
import { generateOpaqueToken, hashToken } from '@onecare/security';
import { UnauthorizedError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';

@Injectable()
export class PrismaSessionService implements SessionPort {
  constructor(
    @Inject(APP_TOKENS.PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv,
    @Inject(APP_TOKENS.CACHE) private readonly cache: CachePort,
  ) {}

  async createSession(input: CreateSessionInput): Promise<{ session: SessionRecord; refreshToken: string }> {
    const now = Date.now();
    const absoluteTtl = input.rememberMe
      ? this.env.SESSION_REMEMBER_ME_TTL_SECONDS
      : this.env.SESSION_ABSOLUTE_TIMEOUT_SECONDS;
    const idleTtl = this.env.SESSION_IDLE_TIMEOUT_SECONDS;
    const refreshTtl = input.rememberMe
      ? this.env.SESSION_REMEMBER_ME_TTL_SECONDS
      : this.env.REFRESH_TOKEN_TTL_SECONDS;

    const absoluteExpiresAt = new Date(now + absoluteTtl * 1000);
    const idleExpiresAt = new Date(now + idleTtl * 1000);
    const refreshExpiresAt = new Date(now + refreshTtl * 1000);
    const familyId = randomUUID();
    const rawRefresh = generateOpaqueToken();
    const tokenHash = hashToken(rawRefresh);

    const session = await this.prisma.session.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        rememberMe: input.rememberMe,
        mfaStatus: input.mfaStatus,
        absoluteExpiresAt,
        idleExpiresAt,
        lastActivityAt: new Date(),
        refreshTokens: {
          create: {
            tokenHash,
            familyId,
            rotationCount: 0,
            expiresAt: refreshExpiresAt,
          },
        },
        ...(input.device.deviceName !== undefined ? { deviceName: input.device.deviceName } : {}),
        ...(input.device.browser !== undefined ? { browser: input.device.browser } : {}),
        ...(input.device.platform !== undefined ? { platform: input.device.platform } : {}),
        ...(input.device.ip !== undefined ? { ip: input.device.ip } : {}),
        ...(input.device.userAgent !== undefined ? { userAgent: input.device.userAgent } : {}),
      },
    });

    await this.cacheSession(session.id, {
      sessionId: session.id,
      tenantId: session.tenantId,
      userId: session.userId,
      revoked: false,
      absoluteExpiresAt: absoluteExpiresAt.toISOString(),
      idleExpiresAt: idleExpiresAt.toISOString(),
    }, absoluteTtl);

    return { session: this.toRecord(session), refreshToken: rawRefresh };
  }

  async touchSession(sessionId: string): Promise<SessionRecord | null> {
    const existing = await this.prisma.session.findFirst({
      where: { id: sessionId, revokedAt: null },
    });
    if (!existing) {
      return null;
    }
    const now = new Date();
    if (existing.absoluteExpiresAt <= now || existing.idleExpiresAt <= now) {
      await this.revokeSession(sessionId);
      return null;
    }

    const idleExpiresAt = new Date(now.getTime() + this.env.SESSION_IDLE_TIMEOUT_SECONDS * 1000);
    const updated = await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActivityAt: now, idleExpiresAt },
    });

    await this.cacheSession(sessionId, {
      sessionId,
      tenantId: updated.tenantId,
      userId: updated.userId,
      revoked: false,
      absoluteExpiresAt: updated.absoluteExpiresAt.toISOString(),
      idleExpiresAt: idleExpiresAt.toISOString(),
    }, this.env.SESSION_ABSOLUTE_TIMEOUT_SECONDS);

    return this.toRecord(updated);
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, revokedAt: null },
    });
    return session ? this.toRecord(session) : null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const now = new Date();
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: now },
    });
    await this.cache.del(this.sessionCacheKey(sessionId));
  }

  async rotateRefreshToken(rawRefreshToken: string): Promise<{
    session: SessionRecord;
    refreshToken: string;
    reuseDetected: boolean;
  }> {
    const tokenHash = hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    });

    if (!existing) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (existing.revokedAt || existing.compromisedAt || existing.reuseDetected) {
      await this.revokeRefreshFamily(existing.familyId);
      throw new UnauthorizedError('Refresh token reuse detected');
    }

    if (existing.expiresAt <= new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    if (existing.session.revokedAt) {
      throw new UnauthorizedError('Session revoked');
    }

    const rawRefresh = generateOpaqueToken();
    const newHash = hashToken(rawRefresh);
    const refreshTtl = existing.session.rememberMe
      ? this.env.SESSION_REMEMBER_ME_TTL_SECONDS
      : this.env.REFRESH_TOKEN_TTL_SECONDS;

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    await this.prisma.refreshToken.create({
      data: {
        sessionId: existing.sessionId,
        tokenHash: newHash,
        familyId: existing.familyId,
        rotationCount: existing.rotationCount + 1,
        rotatedFromId: existing.id,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    const touched = await this.touchSession(existing.sessionId);
    if (!touched) {
      throw new UnauthorizedError('Session expired');
    }

    return { session: touched, refreshToken: rawRefresh, reuseDetected: false };
  }

  async revokeRefreshFamily(familyId: string): Promise<void> {
    const now = new Date();
    const tokens = await this.prisma.refreshToken.findMany({ where: { familyId } });
    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { revokedAt: now, reuseDetected: true, compromisedAt: now },
    });
    const sessionIds = [...new Set(tokens.map((t) => t.sessionId))];
    for (const sessionId of sessionIds) {
      await this.revokeSession(sessionId);
    }
  }

  private toRecord(session: {
    id: string;
    tenantId: string;
    userId: string;
    absoluteExpiresAt: Date;
    idleExpiresAt: Date;
    lastActivityAt: Date;
    revokedAt: Date | null;
    rememberMe: boolean;
    mfaStatus: string;
  }): SessionRecord {
    return {
      id: session.id,
      tenantId: session.tenantId,
      userId: session.userId,
      absoluteExpiresAt: session.absoluteExpiresAt,
      idleExpiresAt: session.idleExpiresAt,
      lastActivityAt: session.lastActivityAt,
      revokedAt: session.revokedAt,
      rememberMe: session.rememberMe,
      mfaStatus: session.mfaStatus,
    };
  }

  private sessionCacheKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private async cacheSession(
    sessionId: string,
    record: {
      sessionId: string;
      tenantId: string;
      userId: string;
      revoked: boolean;
      absoluteExpiresAt: string;
      idleExpiresAt: string;
    },
    ttlSeconds: number,
  ): Promise<void> {
    await this.cache.set(this.sessionCacheKey(sessionId), JSON.stringify(record), ttlSeconds);
  }
}
