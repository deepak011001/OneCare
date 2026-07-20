import { createKekaConnector } from '@onecare/connectors';
import { InMemoryConfirmationStore } from '@onecare/confirmations';
import { createDefaultPolicyEngine, type PolicyEngine } from '@onecare/policies';
import { ConnectorRegistry } from './connector-registry';
import { EnvConnectorSecrets, McpGatewayService } from './gateway';

export interface McpPlatform {
  readonly registry: ConnectorRegistry;
  readonly gateway: McpGatewayService;
  readonly confirmations: InMemoryConfirmationStore;
  readonly policies: PolicyEngine;
}

let initialized: McpPlatform | null = null;

export async function createMcpPlatform(): Promise<McpPlatform> {
  if (initialized) return initialized;

  const registry = new ConnectorRegistry();
  registry.register(createKekaConnector());
  await registry.initializeAll(new EnvConnectorSecrets());

  initialized = {
    registry,
    gateway: new McpGatewayService(registry),
    confirmations: new InMemoryConfirmationStore(),
    policies: createDefaultPolicyEngine(),
  };
  return initialized;
}

export function resetMcpPlatformForTests(): void {
  initialized = null;
}
