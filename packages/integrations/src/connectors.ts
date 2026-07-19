export type ConnectorProtocol =
  'rest' | 'graphql' | 'soap' | 'webhook' | 'scim' | 'smtp' | 'sftp' | 'browser';

export type ConnectorHealth = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface ConnectorDescriptor {
  readonly id: string;
  readonly name: string;
  readonly protocol: ConnectorProtocol;
  readonly secretRef: string;
  readonly status: ConnectorHealth;
}

/** Vendor SDKs belong behind adapters — agents never import them. */
export interface ConnectorRegistryPort {
  list(tenantId: string): Promise<readonly ConnectorDescriptor[]>;
  get(tenantId: string, connectorId: string): Promise<ConnectorDescriptor | null>;
}
