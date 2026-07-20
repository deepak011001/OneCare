import type {
  ConnectorRegistration,
  ConnectorSecrets,
  EnterpriseConnector,
} from '@onecare/connector-sdk';

export class ConnectorRegistry {
  private readonly connectors = new Map<string, EnterpriseConnector>();
  private readonly health = new Map<string, ConnectorRegistration>();

  register(connector: EnterpriseConnector): void {
    this.connectors.set(connector.metadata.id, connector);
    this.health.set(connector.metadata.id, {
      ...connector.metadata,
      supportedTools: connector.capabilities.supportedTools,
      supportedResources: connector.capabilities.supportedResources,
      supportedEvents: connector.capabilities.supportedEvents,
      authenticationType: connector.auth.type,
      healthStatus: 'unknown',
    });
  }

  get(id: string): EnterpriseConnector | null {
    return this.connectors.get(id) ?? null;
  }

  list(): readonly ConnectorRegistration[] {
    return [...this.health.values()];
  }

  async initializeAll(secrets: ConnectorSecrets): Promise<void> {
    for (const connector of this.connectors.values()) {
      await connector.initialize(secrets);
      const report = await connector.health();
      const reg = this.health.get(connector.metadata.id);
      if (reg) {
        reg.healthStatus = report.status;
      }
    }
  }

  async refreshHealth(): Promise<void> {
    for (const connector of this.connectors.values()) {
      const report = await connector.health();
      const reg = this.health.get(connector.metadata.id);
      if (reg) {
        reg.healthStatus = report.status;
      }
    }
  }

  updateHealthStatus(id: string, status: ConnectorRegistration['healthStatus']): void {
    const reg = this.health.get(id);
    if (reg) {
      reg.healthStatus = status;
    }
  }
}
