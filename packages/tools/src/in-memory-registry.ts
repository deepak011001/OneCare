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
