import type { ConnectorToolDefinition } from '@onecare/connector-sdk';
import type { ConnectorSecrets } from '@onecare/connector-sdk';
import type { CorrelationId, TenantId, UserId } from '@onecare/shared';
import type { McpExecutionContext, McpToolCallRequest, McpToolCallResult } from './types';
import { ConnectorRegistry } from './connector-registry';
import { CircuitBreaker, withRetry, withTimeout } from './resilience';

export interface McpExecuteRequest {
  readonly connectorId: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly context: McpExecutionContext;
  readonly idempotencyKey?: string;
}

export interface McpGatewayTelemetryEvent {
  readonly connectorId: string;
  readonly toolName: string;
  readonly correlationId: CorrelationId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly latencyMs: number;
  readonly ok: boolean;
  readonly retries: number;
  readonly errorCode?: string;
  readonly costUsd?: number;
}

export interface McpTelemetryPort {
  record(event: McpGatewayTelemetryEvent): void;
}

export class InMemoryMcpTelemetry implements McpTelemetryPort {
  readonly events: McpGatewayTelemetryEvent[] = [];

  record(event: McpGatewayTelemetryEvent): void {
    this.events.push(event);
  }
}

export class McpGatewayService {
  private readonly circuitBreaker = new CircuitBreaker(5, 30_000);

  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly telemetry: McpTelemetryPort = new InMemoryMcpTelemetry(),
  ) {}

  listConnectors() {
    return this.registry.list();
  }

  getConnector(id: string) {
    return this.registry.list().find((c) => c.id === id) ?? null;
  }

  listTools(
    connectorId?: string,
  ): Array<ConnectorToolDefinition & { connectorId: string; connectorName: string }> {
    const items: Array<ConnectorToolDefinition & { connectorId: string; connectorName: string }> =
      [];
    for (const reg of this.registry.list()) {
      if (connectorId && reg.id !== connectorId) continue;
      const connector = this.registry.get(reg.id);
      if (!connector) continue;
      for (const tool of connector.listTools()) {
        items.push({
          ...tool,
          connectorId: reg.id,
          connectorName: reg.name,
        });
      }
    }
    return items;
  }

  async healthSummary(): Promise<{
    status: 'ok' | 'degraded';
    connectors: readonly { id: string; status: string }[];
  }> {
    await this.registry.refreshHealth();
    const connectors = this.registry.list().map((c) => ({
      id: c.id,
      status: c.healthStatus,
    }));
    const degraded = connectors.some((c) => c.status === 'down' || c.status === 'degraded');
    return { status: degraded ? 'degraded' : 'ok', connectors };
  }

  async execute(request: McpExecuteRequest): Promise<McpToolCallResult> {
    const started = Date.now();
    const connector = this.registry.get(request.connectorId);
    if (!connector) {
      return this.fail(
        started,
        request,
        'CONNECTOR_NOT_FOUND',
        'Connector is not registered',
        false,
      );
    }
    const registration = this.registry.list().find((c) => c.id === request.connectorId);
    if (registration?.healthStatus === 'down') {
      return this.fail(
        started,
        request,
        'CONNECTOR_DISABLED',
        'Connector is temporarily disabled',
        false,
      );
    }
    const breakerKey = `${request.connectorId}:${request.toolName}`;
    if (!this.circuitBreaker.canExecute(breakerKey)) {
      return this.fail(
        started,
        request,
        'CIRCUIT_OPEN',
        'Too many recent failures — try again later',
        true,
      );
    }

    const tool = connector.listTools().find((t) => t.name === request.toolName);
    if (!tool) {
      return this.fail(started, request, 'TOOL_NOT_FOUND', 'Tool is not available', false);
    }

    const timeoutMs = tool.timeoutMs ?? 15_000;
    const retryPolicy = tool.retryPolicy ?? {
      maxAttempts: 1,
      initialDelayMs: 200,
      maxDelayMs: 2_000,
    };

    let retries = 0;
    try {
      const result = await withRetry(
        async () => {
          retries += 1;
          return withTimeout(
            connector.executeTool({
              toolName: request.toolName,
              arguments: request.arguments,
              context: {
                tenantId: request.context.tenantId,
                userId: request.context.userId,
                correlationId: request.context.correlationId,
                roles: request.context.roles,
                permissions:
                  request.context.permissions ??
                  (request.context.attributes.permissions as string[] | undefined) ??
                  [],
                attributes: request.context.attributes,
              },
              ...(request.idempotencyKey ? { idempotencyKey: request.idempotencyKey } : {}),
            }),
            timeoutMs,
          );
        },
        {
          maxAttempts: retryPolicy.maxAttempts,
          initialDelayMs: retryPolicy.initialDelayMs,
          maxDelayMs: retryPolicy.maxDelayMs,
          shouldRetry: (error) =>
            error instanceof Error &&
            (error.message === 'EXECUTION_TIMEOUT' ||
              error.message.includes('retryable') ||
              error.message.includes('KEKA_HTTP_5')),
        },
      );

      if (result.ok) {
        this.circuitBreaker.recordSuccess(breakerKey);
      } else {
        this.circuitBreaker.recordFailure(breakerKey);
        if (result.error?.code?.includes('AUTH')) {
          this.registry.updateHealthStatus(request.connectorId, 'degraded');
        }
      }

      this.telemetry.record({
        connectorId: request.connectorId,
        toolName: request.toolName,
        correlationId: request.context.correlationId,
        tenantId: request.context.tenantId,
        userId: request.context.userId,
        latencyMs: result.latencyMs,
        ok: result.ok,
        retries: Math.max(0, retries - 1),
        ...(result.error?.code ? { errorCode: result.error.code } : {}),
        costUsd: 0,
      });

      return {
        ok: result.ok,
        ...(result.data !== undefined ? { data: result.data } : {}),
        ...(result.error
          ? { errorCode: result.error.code, errorMessage: result.error.message }
          : {}),
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      this.circuitBreaker.recordFailure(breakerKey);
      const message = error instanceof Error ? error.message : 'EXECUTION_FAILED';
      const code = message === 'EXECUTION_TIMEOUT' ? 'TIMEOUT' : 'NETWORK_FAILURE';
      this.telemetry.record({
        connectorId: request.connectorId,
        toolName: request.toolName,
        correlationId: request.context.correlationId,
        tenantId: request.context.tenantId,
        userId: request.context.userId,
        latencyMs: Date.now() - started,
        ok: false,
        retries: Math.max(0, retries - 1),
        errorCode: code,
        costUsd: 0,
      });
      return this.fail(started, request, code, 'Unable to complete the request', true);
    }
  }

  /** Adapter for legacy McpGatewayPort.callTool */
  async callTool(request: McpToolCallRequest): Promise<McpToolCallResult> {
    return this.execute({
      connectorId: request.serverId,
      toolName: request.toolName,
      arguments: request.arguments,
      context: request.context,
      ...(request.idempotencyKey ? { idempotencyKey: request.idempotencyKey } : {}),
    });
  }

  private fail(
    started: number,
    request: McpExecuteRequest,
    code: string,
    message: string,
    retryable: boolean,
  ): McpToolCallResult {
    this.telemetry.record({
      connectorId: request.connectorId,
      toolName: request.toolName,
      correlationId: request.context.correlationId,
      tenantId: request.context.tenantId,
      userId: request.context.userId,
      latencyMs: Date.now() - started,
      ok: false,
      retries: 0,
      errorCode: code,
      costUsd: 0,
    });
    return {
      ok: false,
      errorCode: code,
      errorMessage: message,
      latencyMs: Date.now() - started,
      ...(retryable ? { data: { retryable } } : {}),
    };
  }
}

export class EnvConnectorSecrets implements ConnectorSecrets {
  async resolveSecret(ref: string): Promise<string | null> {
    const value = process.env[ref];
    return value && value.length > 0 ? value : null;
  }
}

export function createDefaultMcpGateway(
  connectors: import('@onecare/connector-sdk').EnterpriseConnector[],
): {
  registry: ConnectorRegistry;
  gateway: McpGatewayService;
} {
  const registry = new ConnectorRegistry();
  for (const connector of connectors) {
    registry.register(connector);
  }
  const gateway = new McpGatewayService(registry);
  return { registry, gateway };
}
