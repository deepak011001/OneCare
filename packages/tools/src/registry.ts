import type { ConnectorToolDefinition } from '@onecare/connector-sdk';
import type { McpGatewayService } from '@onecare/mcp';
import type { ToolDefinition, ToolRegistryPort } from './types';
import { InMemoryToolRegistry } from './in-memory-registry';

export { InMemoryToolRegistry } from './in-memory-registry';

export function toolFromConnectorTool(
  tool: ConnectorToolDefinition & {
    connectorId: string;
  },
): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    category: tool.category,
    version: tool.version,
    sideEffect: tool.sideEffect,
    risk: tool.risk,
    permissions: tool.permissions,
    confirmationRequired: tool.confirmationRequired,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    ...(tool.retryPolicy ? { retryPolicy: tool.retryPolicy } : {}),
    ...(tool.timeoutMs ? { timeoutMs: tool.timeoutMs } : {}),
    ...(tool.rateLimit ? { rateLimit: tool.rateLimit } : {}),
    ...(tool.exampleInvocations ? { exampleInvocations: tool.exampleInvocations } : {}),
    connectorId: tool.connectorId,
    implemented: true,
  };
}

export function syncToolsFromGateway(registry: ToolRegistryPort, gateway: McpGatewayService): void {
  for (const tool of gateway.listTools()) {
    registry.register(toolFromConnectorTool(tool));
  }
}

export function createMcpToolRegistry(gateway: McpGatewayService): InMemoryToolRegistry {
  const registry = new InMemoryToolRegistry();
  syncToolsFromGateway(registry, gateway);
  return registry;
}

/** Non-MCP placeholders retained for agents not yet wired to connectors. */
export const LEGACY_PLACEHOLDER_TOOLS: readonly ToolDefinition[] = [
  {
    name: 'attendance',
    description: 'Read attendance summary (placeholder)',
    category: 'attendance',
    version: '0.0.0',
    sideEffect: 'read',
    risk: 'low',
    permissions: ['attendance.view'],
    confirmationRequired: false,
    inputSchema: { type: 'object', properties: {} },
    outputSchema: { type: 'object' },
    connectorId: 'none',
    implemented: false,
  },
  {
    name: 'searchKnowledge',
    description: 'Search enterprise knowledge (legacy fallback when MCP knowledge tool is absent)',
    category: 'knowledge',
    version: '0.0.0',
    sideEffect: 'read',
    risk: 'low',
    permissions: ['knowledge.search'],
    confirmationRequired: false,
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    outputSchema: { type: 'object' },
    connectorId: 'none',
    implemented: false,
  },
  {
    name: 'sendNotification',
    description: 'Send a notification (placeholder)',
    category: 'notifications',
    version: '0.0.0',
    sideEffect: 'write',
    risk: 'medium',
    permissions: ['workflow.execute'],
    confirmationRequired: true,
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['channel', 'message'],
    },
    outputSchema: { type: 'object' },
    connectorId: 'none',
    implemented: false,
  },
  {
    name: 'approveRequest',
    description: 'Approve a pending request (placeholder)',
    category: 'workflow',
    version: '0.0.0',
    sideEffect: 'write',
    risk: 'medium',
    permissions: ['workflow.execute'],
    confirmationRequired: true,
    inputSchema: {
      type: 'object',
      properties: { requestId: { type: 'string' } },
      required: ['requestId'],
    },
    outputSchema: { type: 'object' },
    connectorId: 'none',
    implemented: false,
  },
];

export function createDefaultToolRegistry(): InMemoryToolRegistry {
  const registry = new InMemoryToolRegistry();
  for (const tool of LEGACY_PLACEHOLDER_TOOLS) {
    registry.register(tool);
  }
  return registry;
}
