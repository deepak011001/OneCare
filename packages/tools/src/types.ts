import type { ToolRisk, ToolSideEffect } from '@onecare/mcp';

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly sideEffect: ToolSideEffect;
  readonly risk: ToolRisk;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  /** Placeholder only in M3 — no vendor implementation */
  readonly implemented: false;
}

export interface ToolRegistryPort {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | null;
  list(): readonly ToolDefinition[];
}
