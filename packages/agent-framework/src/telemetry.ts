import type { AgentTelemetryEvent, AgentTelemetryPort } from './types';

export class InMemoryAgentTelemetry implements AgentTelemetryPort {
  private readonly events: AgentTelemetryEvent[] = [];
  private selected = 0;
  private executions = 0;
  private failures = 0;
  private handoffs = 0;
  private lifecycleMsTotal = 0;

  record(event: AgentTelemetryEvent): void {
    this.events.push(event);
    switch (event.type) {
      case 'agent.selected':
        this.selected += 1;
        break;
      case 'agent.execution':
        this.executions += 1;
        break;
      case 'agent.failure':
        this.failures += 1;
        break;
      case 'agent.handoff':
        this.handoffs += 1;
        break;
      case 'agent.lifecycle':
      case 'agent.latency':
        this.lifecycleMsTotal += event.durationMs ?? 0;
        break;
      default:
        break;
    }
  }

  snapshot() {
    return {
      selected: this.selected,
      executions: this.executions,
      failures: this.failures,
      handoffs: this.handoffs,
      lifecycleMsTotal: this.lifecycleMsTotal,
      events: [...this.events],
    };
  }
}
