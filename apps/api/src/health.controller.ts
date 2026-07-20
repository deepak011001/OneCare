import { Controller, Get, Inject, Optional, ServiceUnavailableException } from '@nestjs/common';
import { AGENT_IDS, type AiRuntime } from '@onecare/ai';
import type { CachePort } from '@onecare/cache';
import type { OneCareEnv } from '@onecare/config';
import type { PrismaClient } from '@onecare/database';
import { PrismaHealthCheck } from '@onecare/database';
import type { FeatureFlagPort } from '@onecare/feature-flags';
import type { McpGatewayService } from '@onecare/mcp';
import { Public } from './shared/presentation/auth.decorators';
import { APP_TOKENS } from './shared/tokens';
import { AI_TOKENS } from './modules/ai/ai.tokens';
import { MCP_TOKENS } from './modules/mcp/mcp.tokens';

type DependencyStatus = {
  readonly name: string;
  readonly status: 'up' | 'down' | 'degraded' | 'skipped';
  readonly detail?: string;
  readonly latencyMs?: number;
};

@Controller()
export class HealthController {
  constructor(
    @Inject(APP_TOKENS.PRISMA) private readonly prisma: PrismaClient,
    @Inject(APP_TOKENS.ENV) private readonly env: OneCareEnv,
    @Inject(APP_TOKENS.CACHE) private readonly cache: CachePort,
    @Optional() @Inject(AI_TOKENS.RUNTIME) private readonly aiRuntime?: AiRuntime,
    @Optional() @Inject(MCP_TOKENS.GATEWAY) private readonly mcpGateway?: McpGatewayService,
    @Optional() @Inject(APP_TOKENS.FEATURE_FLAGS) private readonly flags?: FeatureFlagPort,
  ) {}

  /** Liveness — process is up (no dependency checks). */
  @Public()
  @Get('v1/health')
  @Get('v1/health/live')
  health() {
    return {
      data: {
        status: 'ok',
        service: 'api',
        agentsCatalogSize: AGENT_IDS.length,
        checks: 'liveness',
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /** Readiness — critical dependencies must be healthy. */
  @Public()
  @Get('v1/ready')
  @Get('v1/health/ready')
  async ready() {
    const dependencies = await this.collectDependencies({ includeOptional: false });
    const criticalDown = dependencies.filter((d) => d.name === 'database' && d.status === 'down');
    const status = criticalDown.length ? 'not_ready' : 'ready';
    if (status === 'not_ready') {
      throw new ServiceUnavailableException({
        data: { status, dependencies },
        meta: { timestamp: new Date().toISOString() },
      });
    }
    return {
      data: { status, dependencies },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /** Deep health — all known dependencies (graceful degradation). */
  @Public()
  @Get('v1/health/dependencies')
  async dependencies() {
    const dependencies = await this.collectDependencies({ includeOptional: true });
    const anyDown = dependencies.some((d) => d.status === 'down');
    const anyDegraded = dependencies.some((d) => d.status === 'degraded');
    return {
      data: {
        status: anyDown ? 'degraded' : anyDegraded ? 'degraded' : 'ok',
        dependencies,
      },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  private async collectDependencies(input: {
    readonly includeOptional: boolean;
  }): Promise<DependencyStatus[]> {
    const results: DependencyStatus[] = [];

    const dbStarted = Date.now();
    const db = await new PrismaHealthCheck(this.prisma).ping();
    results.push({
      name: 'database',
      status: db.ok ? 'up' : 'down',
      ...(db.ok ? {} : { detail: 'error' in db ? db.error : 'unreachable' }),
      latencyMs: Date.now() - dbStarted,
    });

    const redisStarted = Date.now();
    try {
      const probeKey = `health:probe:${Date.now()}`;
      await this.cache.set(probeKey, '1', 5);
      const value = await this.cache.get(probeKey);
      await this.cache.del(probeKey);
      results.push({
        name: 'redis',
        status: value === '1' ? 'up' : 'degraded',
        latencyMs: Date.now() - redisStarted,
      });
    } catch (error) {
      results.push({
        name: 'redis',
        status: this.env.NODE_ENV === 'test' ? 'skipped' : 'down',
        detail: error instanceof Error ? error.message : 'redis_unreachable',
        latencyMs: Date.now() - redisStarted,
      });
    }

    if (input.includeOptional) {
      if (this.mcpGateway) {
        const started = Date.now();
        try {
          const summary = await this.mcpGateway.healthSummary();
          const connectors = summary.connectors ?? [];
          const down = connectors.filter((c) => c.status === 'down').length;
          results.push({
            name: 'mcp_gateway',
            status: summary.status === 'degraded' || down > 0 ? 'degraded' : 'up',
            detail: `${connectors.length} connectors`,
            latencyMs: Date.now() - started,
          });
        } catch (error) {
          results.push({
            name: 'mcp_gateway',
            status: 'down',
            detail: error instanceof Error ? error.message : 'mcp_unreachable',
            latencyMs: Date.now() - started,
          });
        }
      } else {
        results.push({ name: 'mcp_gateway', status: 'skipped' });
      }

      if (this.aiRuntime) {
        const caps = this.aiRuntime.employeeCapabilities.list().length;
        results.push({
          name: 'ai_runtime',
          status: 'up',
          detail: `capabilities=${caps};provider=${this.aiRuntime.providers.listModels().length}`,
        });
        results.push({
          name: 'capability_registry',
          status: caps > 0 ? 'up' : 'degraded',
          detail: `registered=${caps}`,
        });
      } else {
        results.push({ name: 'ai_runtime', status: 'skipped' });
        results.push({ name: 'capability_registry', status: 'skipped' });
      }

      if (this.flags) {
        const chatOpen = await this.flags.isKillSwitchOpen('killswitch.ai.chat');
        results.push({
          name: 'feature_flags',
          status: chatOpen ? 'up' : 'degraded',
          detail: chatOpen ? 'ai.chat allowed' : 'ai.chat killswitch engaged',
        });
      }
    }

    return results;
  }
}
