import { Controller, Get, Inject } from '@nestjs/common';
import { AGENT_IDS } from '@onecare/ai';
import type { PrismaClient } from '@onecare/database';
import { PrismaHealthCheck } from '@onecare/database';
import { Public } from './shared/presentation/auth.decorators';
import { APP_TOKENS } from './shared/tokens';

@Controller()
export class HealthController {
  constructor(@Inject(APP_TOKENS.PRISMA) private readonly prisma: PrismaClient) {}

  @Public()
  @Get('v1/health')
  health() {
    return {
      data: {
        status: 'ok',
        service: 'api',
        agentsCatalogSize: AGENT_IDS.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Public()
  @Get('v1/ready')
  async ready() {
    const health = new PrismaHealthCheck(this.prisma);
    const db = await health.ping();
    return {
      data: {
        status: db.ok ? 'ready' : 'degraded',
        database: db,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
