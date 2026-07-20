import type { CorrelationId, TenantId, UserId } from '@onecare/shared';

export type ToolSideEffect = 'read' | 'write' | 'destructive';
export type ToolRisk = 'low' | 'medium' | 'high' | 'critical';

export interface McpToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly sideEffect: ToolSideEffect;
  readonly risk: ToolRisk;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
}

export interface McpExecutionContext {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly correlationId: CorrelationId;
  readonly roles: readonly string[];
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly permissions?: readonly string[];
}

export interface McpToolCallRequest {
  readonly serverId: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly context: McpExecutionContext;
  readonly idempotencyKey?: string;
}

export interface McpToolCallResult {
  readonly ok: boolean;
  readonly data?: unknown;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly latencyMs: number;
}

/** Port implemented by apps/mcp-gateway clients. */
export interface McpGatewayPort {
  listTools(serverId: string): Promise<readonly McpToolDefinition[]>;
  callTool(request: McpToolCallRequest): Promise<McpToolCallResult>;
}
