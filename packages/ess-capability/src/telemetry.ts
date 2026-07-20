export type CapabilityTelemetryEvent =
  | {
      readonly type: 'capability.handled';
      readonly capabilityId: string;
      readonly intent?: string;
      readonly latencyMs: number;
      readonly outcome: string;
    }
  | {
      readonly type: 'capability.validation_failed';
      readonly capabilityId: string;
      readonly intent?: string;
      readonly codes: readonly string[];
    }
  | {
      readonly type: 'capability.clarification';
      readonly capabilityId: string;
      readonly intent?: string;
      readonly missing: readonly string[];
    }
  | {
      readonly type: 'capability.confirmation';
      readonly capabilityId: string;
      readonly toolName: string;
    }
  | {
      readonly type: 'capability.tool';
      readonly capabilityId: string;
      readonly toolName: string;
      readonly ok: boolean;
      readonly latencyMs: number;
    }
  | {
      readonly type: 'capability.failure';
      readonly capabilityId: string;
      readonly message: string;
    };

export interface CapabilityTelemetrySink {
  record(event: CapabilityTelemetryEvent): void;
}

export class InMemoryCapabilityTelemetry implements CapabilityTelemetrySink {
  readonly events: CapabilityTelemetryEvent[] = [];

  record(event: CapabilityTelemetryEvent): void {
    this.events.push(event);
  }

  count(type: CapabilityTelemetryEvent['type']): number {
    return this.events.filter((e) => e.type === type).length;
  }
}

export function createCapabilityTelemetry(): InMemoryCapabilityTelemetry {
  return new InMemoryCapabilityTelemetry();
}
