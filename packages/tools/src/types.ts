import type { ToolRisk, ToolSideEffect } from '@onecare/mcp';

export interface ToolRetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
}

export interface ToolRateLimit {
  readonly maxPerMinute: number;
}

export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly version: string;
  readonly sideEffect: ToolSideEffect;
  readonly risk: ToolRisk;
  readonly permissions: readonly string[];
  readonly confirmationRequired: boolean;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly retryPolicy?: ToolRetryPolicy;
  readonly timeoutMs?: number;
  readonly rateLimit?: ToolRateLimit;
  readonly exampleInvocations?: readonly Readonly<Record<string, unknown>>[];
  readonly connectorId: string;
  /** When false, orchestrator skips MCP execution (M3 placeholders). */
  readonly implemented: boolean;
}

export interface ToolRegistryPort {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | null;
  list(): readonly ToolDefinition[];
}

export interface ToolExecutionInput {
  readonly toolName: string;
  readonly connectorId: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly context: import('@onecare/mcp').McpExecutionContext;
  readonly confirmationApproved?: boolean;
}

export interface ToolExecutionResult {
  readonly ok: boolean;
  readonly data?: unknown;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly decision?: 'executed' | 'denied' | 'confirmation_required';
  readonly confirmationId?: string;
  readonly latencyMs?: number;
}

export interface ToolExecutorPort {
  execute(input: ToolExecutionInput): Promise<ToolExecutionResult>;
}
