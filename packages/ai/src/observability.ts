export interface AiObservation {
  readonly correlationId?: string;
  readonly tenantId?: string;
  readonly userId?: string;
  readonly conversationId?: string;
  readonly provider: string;
  readonly model: string;
  readonly promptId?: string;
  readonly promptVersion?: string;
  readonly latencyMs: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
  readonly estimatedCostUsd: number;
  readonly error?: string;
  readonly retries: number;
  readonly agentId?: string;
  readonly planId?: string;
}

export interface AiObservabilityPort {
  record(observation: AiObservation): void;
  list(): readonly AiObservation[];
}

export class InMemoryAiObservability implements AiObservabilityPort {
  private readonly observations: AiObservation[] = [];

  record(observation: AiObservation): void {
    this.observations.push(observation);
  }

  list(): readonly AiObservation[] {
    return [...this.observations];
  }
}

/** Simple mock pricing table — replace with tenant config later. */
export function estimateCostUsd(model: string, totalTokens: number): number {
  const perMillion = model.startsWith('mock') ? 0 : 5;
  return Number(((totalTokens / 1_000_000) * perMillion).toFixed(6));
}
