import { Global, Module } from '@nestjs/common';
import { loadEnv } from '@onecare/config';
import { createPrismaClient } from '@onecare/database';
import { InProcessEventBus } from '@onecare/events';
import { InMemoryFeatureFlagService } from '@onecare/feature-flags';
import { NoOpMfaChallengePort } from '@onecare/security';
import {
  createSafeLogger,
  InMemoryMetrics,
  NoOpTracer,
  PlatformMetrics,
} from '@onecare/telemetry';
import { InMemoryCachePort } from '@onecare/cache';
import { RbacPermissionChecker } from '@onecare/auth';
import { APP_TOKENS } from '../tokens';
import { RedisCacheService } from './redis-cache.service';
import { JoseTokenService } from '../../modules/identity/infrastructure/jose-token.service';
import { PrismaSessionService } from '../../modules/identity/infrastructure/prisma-session.service';
import {
  DevelopmentOidcService,
  EntraOidcService,
} from '../../modules/identity/infrastructure/oidc.service';
import { PrismaAuditService } from '../../modules/audit/infrastructure/prisma-audit.service';
import { IdentityService } from '../../modules/identity/application/identity.service';
import { AuthGuard, PermissionsGuard } from '../../modules/identity/presentation/auth.guard';

const env = loadEnv();

@Global()
@Module({
  providers: [
    { provide: APP_TOKENS.ENV, useValue: env },
    {
      provide: APP_TOKENS.LOGGER,
      useFactory: () => createSafeLogger('api', env.LOG_LEVEL),
    },
    {
      provide: APP_TOKENS.PRISMA,
      useFactory: () => createPrismaClient(env.DATABASE_URL),
    },
    {
      provide: APP_TOKENS.CACHE,
      useFactory: (environment: typeof env) => {
        if (environment.NODE_ENV === 'test') {
          return new InMemoryCachePort();
        }
        return new RedisCacheService(environment);
      },
      inject: [APP_TOKENS.ENV],
    },
    { provide: APP_TOKENS.EVENT_BUS, useClass: InProcessEventBus },
    { provide: APP_TOKENS.TOKEN_PORT, useClass: JoseTokenService },
    { provide: APP_TOKENS.SESSION_PORT, useClass: PrismaSessionService },
    {
      provide: APP_TOKENS.OIDC_PORT,
      useClass: env.AUTH_MODE === 'entra' ? EntraOidcService : DevelopmentOidcService,
    },
    { provide: APP_TOKENS.AUDIT_PORT, useClass: PrismaAuditService },
    { provide: APP_TOKENS.PERMISSION_CHECKER, useClass: RbacPermissionChecker },
    { provide: APP_TOKENS.MFA_PORT, useClass: NoOpMfaChallengePort },
    {
      provide: APP_TOKENS.FEATURE_FLAGS,
      useFactory: () => new InMemoryFeatureFlagService(),
    },
    { provide: APP_TOKENS.TRACER, useFactory: () => new NoOpTracer() },
    {
      provide: APP_TOKENS.METRICS,
      useFactory: () => {
        const metrics = new InMemoryMetrics();
        return new PlatformMetrics(metrics);
      },
    },
    IdentityService,
    AuthGuard,
    PermissionsGuard,
  ],
  exports: [
    APP_TOKENS.ENV,
    APP_TOKENS.LOGGER,
    APP_TOKENS.PRISMA,
    APP_TOKENS.CACHE,
    APP_TOKENS.EVENT_BUS,
    APP_TOKENS.TOKEN_PORT,
    APP_TOKENS.SESSION_PORT,
    APP_TOKENS.OIDC_PORT,
    APP_TOKENS.AUDIT_PORT,
    APP_TOKENS.PERMISSION_CHECKER,
    APP_TOKENS.MFA_PORT,
    APP_TOKENS.FEATURE_FLAGS,
    APP_TOKENS.TRACER,
    APP_TOKENS.METRICS,
    IdentityService,
    AuthGuard,
    PermissionsGuard,
  ],
})
export class CoreModule {}
