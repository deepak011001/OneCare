import type { MetricsPort } from './otel';

export interface PlatformObservation {
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly conversationId?: string;
  readonly sessionId?: string;
  readonly tenantId?: string;
  readonly capabilityId?: string;
  readonly executionGraphId?: string;
  readonly connectorId?: string;
  readonly toolName?: string;
  readonly outcome: 'success' | 'failure' | 'timeout' | 'cancelled' | 'partial';
  readonly latencyMs: number;
  readonly retries?: number;
  readonly estimatedCostUsd?: number;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
}

export class PlatformMetrics {
  constructor(private readonly metrics: MetricsPort) {}

  recordRequest(obs: PlatformObservation): void {
    const labels = {
      outcome: obs.outcome,
      ...(obs.capabilityId ? { capabilityId: obs.capabilityId } : {}),
      ...(obs.connectorId ? { connectorId: obs.connectorId } : {}),
      ...(obs.toolName ? { toolName: obs.toolName } : {}),
    };
    this.metrics.counter('onecare.request.count').add(1, labels);
    this.metrics.histogram('onecare.request.latency_ms').record(obs.latencyMs, labels);
    if (obs.retries) {
      this.metrics.counter('onecare.request.retries').add(obs.retries, labels);
    }
    if (obs.estimatedCostUsd !== undefined) {
      this.metrics.histogram('onecare.ai.cost_usd').record(obs.estimatedCostUsd);
    }
    if (obs.promptTokens !== undefined) {
      this.metrics.counter('onecare.ai.prompt_tokens').add(obs.promptTokens);
    }
    if (obs.completionTokens !== undefined) {
      this.metrics.counter('onecare.ai.completion_tokens').add(obs.completionTokens);
    }
  }
}
