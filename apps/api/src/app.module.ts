import { Module, type NestModule, type MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CoreModule } from './shared/infrastructure/core.module';
import { IdentityModule } from './modules/identity/identity.module';
import { HealthController } from './health.controller';
import { GlobalExceptionFilter } from './shared/presentation/global-exception.filter';
import { AuthGuard } from './modules/identity/presentation/auth.guard';
import { correlationMiddleware } from './shared/presentation/correlation.middleware';
import { RateLimitMiddleware } from './shared/presentation/rate-limit.middleware';

@Module({
  imports: [CoreModule, IdentityModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    RateLimitMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(correlationMiddleware, RateLimitMiddleware).forRoutes('*');
  }
}
