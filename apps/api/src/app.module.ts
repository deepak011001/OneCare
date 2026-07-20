import { Module, type NestModule, type MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { CoreModule } from './shared/infrastructure/core.module';
import { IdentityModule } from './modules/identity/identity.module';
import { McpModule } from './modules/mcp/mcp.module';
import { LeaveModule } from './modules/leave/leave.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { KnowledgePlatformModule } from './modules/knowledge-platform/knowledge-platform.module';
import { EmployeeCapabilitiesModule } from './modules/employee-capabilities/employee-capabilities.module';
import { AiModule } from './modules/ai/ai.module';
import { AgentsModule } from './modules/agents/agents.module';
import { HealthController } from './health.controller';
import { GlobalExceptionFilter } from './shared/presentation/global-exception.filter';
import { AuthGuard } from './modules/identity/presentation/auth.guard';
import { correlationMiddleware } from './shared/presentation/correlation.middleware';
import { RateLimitMiddleware } from './shared/presentation/rate-limit.middleware';

@Module({
  imports: [
    CoreModule,
    IdentityModule,
    McpModule,
    KnowledgePlatformModule,
    AiModule,
    LeaveModule,
    AttendanceModule,
    KnowledgeModule,
    EmployeeCapabilitiesModule,
    AgentsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Reuse CoreModule's AuthGuard so Reflector + ports inject correctly.
    { provide: APP_GUARD, useExisting: AuthGuard },
    RateLimitMiddleware,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(correlationMiddleware, RateLimitMiddleware).forRoutes('*');
  }
}
