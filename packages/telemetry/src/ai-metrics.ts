export interface AiMetricFields {
  readonly provider?: string;
  readonly model?: string;
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
  readonly latencyMs?: number;
  readonly estimatedCostUsd?: number;
  readonly retries?: number;
  readonly error?: string;
}

export interface AiMetricsPort {
  recordCompletion(fields: AiMetricFields): void;
  snapshot(): readonly AiMetricFields[];
}

export class InMemoryAiMetrics implements AiMetricsPort {
  private readonly entries: AiMetricFields[] = [];

  recordCompletion(fields: AiMetricFields): void {
    this.entries.push(fields);
  }

  snapshot(): readonly AiMetricFields[] {
    return [...this.entries];
  }
}
