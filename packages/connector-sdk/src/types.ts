import type { CorrelationId, TenantId, UserId } from '@onecare/shared';

export type ConnectorAuthType =
  | 'oauth2'
  | 'bearer'
  | 'api_key'
  | 'basic'
  | 'custom';

export type ConnectorHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export type ConnectorLifecycleState = 'registered' | 'starting' | 'ready' | 'stopped' | 'error';

export interface ConnectorMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly vendor: string;
  readonly description?: string;
}

export interface ConnectorAuthDescriptor {
  readonly type: ConnectorAuthType;
  readonly secretRef: string;
  readonly scopes?: readonly string[];
}

export interface ConnectorCapabilities {
  readonly supportedTools: readonly string[];
  readonly supportedResources: readonly string[];
  readonly supportedEvents: readonly string[];
}

export interface ConnectorRegistration extends ConnectorMetadata, ConnectorCapabilities {
  readonly authenticationType: ConnectorAuthType;
  healthStatus: ConnectorHealthStatus;
}

export interface ConnectorExecutionContext {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly correlationId: CorrelationId;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface ConnectorToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly version: string;
  readonly permissions: readonly string[];
  readonly confirmationRequired: boolean;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly sideEffect: 'read' | 'write' | 'destructive';
  readonly risk: 'low' | 'medium' | 'high' | 'critical';
  readonly retryPolicy?: ConnectorRetryPolicy;
  readonly timeoutMs?: number;
  readonly rateLimit?: ConnectorRateLimit;
  readonly exampleInvocations?: readonly Readonly<Record<string, unknown>>[];
}

export interface ConnectorRetryPolicy {
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  readonly retryableCodes?: readonly string[];
}

export interface ConnectorRateLimit {
  readonly maxPerMinute: number;
}

export interface ConnectorToolCallRequest {
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly context: ConnectorExecutionContext;
  readonly idempotencyKey?: string;
}

export interface ConnectorToolCallResult {
  readonly ok: boolean;
  readonly data?: unknown;
  readonly error?: ConnectorError;
  readonly latencyMs: number;
}

export interface ConnectorError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface ConnectorHealthReport {
  readonly status: ConnectorHealthStatus;
  readonly checkedAt: string;
  readonly message?: string;
}

export interface ConnectorSecrets {
  resolveSecret(ref: string): Promise<string | null>;
}

/** Contract every enterprise connector implements. */
export interface EnterpriseConnector {
  readonly metadata: ConnectorMetadata;
  readonly auth: ConnectorAuthDescriptor;
  readonly capabilities: ConnectorCapabilities;

  initialize(secrets: ConnectorSecrets): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<ConnectorHealthReport>;
  listTools(): readonly ConnectorToolDefinition[];
  executeTool(request: ConnectorToolCallRequest): Promise<ConnectorToolCallResult>;
}
