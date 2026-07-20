import type { ToolDefinition, ToolRegistryPort } from './types';

export class InMemoryToolRegistry implements ToolRegistryPort {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | null {
    return this.tools.get(name) ?? null;
  }

  list(): readonly ToolDefinition[] {
    return [...this.tools.values()];
  }
}

export const PLACEHOLDER_TOOLS: readonly ToolDefinition[] = [
  {
    name: 'leaveBalance',
    description: 'Read employee leave balance (placeholder — no HRIS call)',
    sideEffect: 'read',
    risk: 'low',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: { type: 'object' },
    implemented: false,
  },
  {
    name: 'attendance',
    description: 'Read attendance summary (placeholder)',
    sideEffect: 'read',
    risk: 'low',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: { type: 'object' },
    implemented: false,
  },
  {
    name: 'searchKnowledge',
    description: 'Search enterprise knowledge (placeholder — no RAG)',
    sideEffect: 'read',
    risk: 'low',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
    outputSchema: { type: 'object' },
    implemented: false,
  },
  {
    name: 'sendNotification',
    description: 'Send a notification (placeholder)',
    sideEffect: 'write',
    risk: 'medium',
    inputSchema: {
      type: 'object',
      properties: {
        channel: { type: 'string' },
        message: { type: 'string' },
      },
      required: ['channel', 'message'],
    },
    outputSchema: { type: 'object' },
    implemented: false,
  },
  {
    name: 'approveRequest',
    description: 'Approve a pending request (placeholder)',
    sideEffect: 'write',
    risk: 'medium',
    inputSchema: {
      type: 'object',
      properties: { requestId: { type: 'string' } },
      required: ['requestId'],
    },
    outputSchema: { type: 'object' },
    implemented: false,
  },
];

export function createDefaultToolRegistry(): InMemoryToolRegistry {
  const registry = new InMemoryToolRegistry();
  for (const tool of PLACEHOLDER_TOOLS) {
    registry.register(tool);
  }
  return registry;
}
