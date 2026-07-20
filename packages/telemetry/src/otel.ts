/**
 * OpenTelemetry-compatible tracing ports.
 * Implementations may wrap @opentelemetry/api without coupling Domain to vendors.
 */

export interface TraceSpan {
  readonly name: string;
  setAttribute(key: string, value: string | number | boolean): void;
  recordException(error: unknown): void;
  end(): void;
}

export interface TracerPort {
  startSpan(
    name: string,
    attributes?: Readonly<Record<string, string | number | boolean>>,
  ): TraceSpan;
}

export class NoOpTracer implements TracerPort {
  startSpan(
    name: string,
    _attributes?: Readonly<Record<string, string | number | boolean>>,
  ): TraceSpan {
    return {
      name,
      setAttribute() {},
      recordException() {},
      end() {},
    };
  }
}

export interface MetricCounter {
  add(value: number, labels?: Readonly<Record<string, string>>): void;
}

export interface MetricHistogram {
  record(value: number, labels?: Readonly<Record<string, string>>): void;
}

export interface MetricsPort {
  counter(name: string): MetricCounter;
  histogram(name: string): MetricHistogram;
}

export class InMemoryMetrics implements MetricsPort {
  readonly counters = new Map<string, number>();
  readonly histograms = new Map<string, number[]>();

  counter(name: string): MetricCounter {
    return {
      add: (value, labels) => {
        const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
        this.counters.set(key, (this.counters.get(key) ?? 0) + value);
      },
    };
  }

  histogram(name: string): MetricHistogram {
    return {
      record: (value, labels) => {
        const key = labels ? `${name}:${JSON.stringify(labels)}` : name;
        const list = this.histograms.get(key) ?? [];
        list.push(value);
        this.histograms.set(key, list);
      },
    };
  }
}

/** Standard attribute keys for OneCare traces/logs. */
export const TRACE_ATTR = {
  requestId: 'onecare.request_id',
  correlationId: 'onecare.correlation_id',
  conversationId: 'onecare.conversation_id',
  sessionId: 'onecare.session_id',
  tenantId: 'onecare.tenant_id',
  userId: 'onecare.user_id',
  capabilityId: 'onecare.capability_id',
  executionGraphId: 'onecare.execution_graph_id',
  connectorId: 'onecare.connector_id',
  toolName: 'onecare.tool_name',
  agentId: 'onecare.agent_id',
} as const;
