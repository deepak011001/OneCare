export interface McpGatewayTelemetryEvent {
  readonly connectorId: string;
  readonly toolName: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly latencyMs: number;
  readonly ok: boolean;
  readonly retries: number;
  readonly errorCode?: string;
  readonly costUsd?: number;
}

export interface McpMetricsSink {
  record(event: McpGatewayTelemetryEvent): void;
}

export class InMemoryMcpMetrics implements McpMetricsSink {
  readonly events: McpGatewayTelemetryEvent[] = [];

  record(event: McpGatewayTelemetryEvent): void {
    this.events.push(event);
  }
}
