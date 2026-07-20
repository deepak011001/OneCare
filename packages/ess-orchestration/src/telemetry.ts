import type { OrchestrationDiagnostics, OrchestrationProgressEvent } from './types';

export interface OrchestrationTelemetrySink {
  record(event: {
    readonly type: string;
    readonly payload?: Readonly<Record<string, unknown>>;
  }): void;
}

export class InMemoryOrchestrationTelemetry implements OrchestrationTelemetrySink {
  readonly events: Array<{ type: string; payload?: Readonly<Record<string, unknown>> }> = [];

  record(event: {
    readonly type: string;
    readonly payload?: Readonly<Record<string, unknown>>;
  }): void {
    this.events.push(event);
  }
}

export function createOrchestrationDiagnostics(input: {
  readonly graphId: string;
  readonly planningMs: number;
  readonly executionMs: number;
  readonly capabilitiesUsed: readonly string[];
  readonly clarifications: number;
  readonly confirmations: number;
  readonly retries: number;
  readonly failures: number;
  readonly parallelGroups: number;
  readonly success: boolean;
  readonly partial: boolean;
}): OrchestrationDiagnostics {
  return { ...input };
}

export type ProgressEmitter = (event: OrchestrationProgressEvent) => void;
