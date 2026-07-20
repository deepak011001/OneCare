import { withRetry, withTimeout, DEFAULT_RETRY } from '@onecare/shared';
import type {
  ConnectorHealthReport,
  ConnectorSecrets,
  ConnectorToolCallRequest,
  ConnectorToolCallResult,
  ConnectorToolDefinition,
  EnterpriseConnector,
} from './types';

export interface ConnectorRuntimeOptions {
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

export abstract class BaseEnterpriseConnector implements EnterpriseConnector {
  abstract readonly metadata: EnterpriseConnector['metadata'];
  abstract readonly auth: EnterpriseConnector['auth'];
  abstract readonly capabilities: EnterpriseConnector['capabilities'];

  protected secrets: ConnectorSecrets | null = null;
  protected runtime: ConnectorRuntimeOptions = {
    timeoutMs: 15_000,
    maxRetries: 2,
  };

  async initialize(secrets: ConnectorSecrets): Promise<void> {
    this.secrets = secrets;
  }

  async shutdown(): Promise<void> {
    this.secrets = null;
  }

  /** Optional runtime tuning without changing connector business behavior. */
  configureRuntime(options: ConnectorRuntimeOptions): void {
    this.runtime = { ...this.runtime, ...options };
  }

  abstract health(): Promise<ConnectorHealthReport>;
  abstract listTools(): readonly ConnectorToolDefinition[];
  protected abstract invokeTool(
    tool: ConnectorToolDefinition,
    request: ConnectorToolCallRequest,
  ): Promise<unknown>;

  async executeTool(request: ConnectorToolCallRequest): Promise<ConnectorToolCallResult> {
    const started = Date.now();
    const tool = this.listTools().find((t) => t.name === request.toolName);
    if (!tool) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool ${request.toolName} is not exposed by this connector`,
          retryable: false,
        },
      };
    }
    try {
      const timeoutMs = this.runtime.timeoutMs ?? 15_000;
      const maxRetries = this.runtime.maxRetries ?? 2;
      const data = await withRetry(
        () => withTimeout(this.invokeTool(tool, request), timeoutMs, 'CONNECTOR_TIMEOUT'),
        {
          ...DEFAULT_RETRY,
          maxAttempts: Math.max(1, maxRetries + 1),
          shouldRetry: (error) => {
            if (error instanceof ConnectorInvocationError) return error.retryable;
            if (error instanceof Error && error.message === 'CONNECTOR_TIMEOUT') return true;
            return DEFAULT_RETRY.shouldRetry?.(error, 1) ?? false;
          },
        },
      );
      return { ok: true, data, latencyMs: Date.now() - started };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'connector_error';
      const code =
        error instanceof ConnectorInvocationError
          ? error.code
          : message === 'CONNECTOR_TIMEOUT'
            ? 'CONNECTOR_TIMEOUT'
            : 'CONNECTOR_EXECUTION_FAILED';
      const retryable =
        error instanceof ConnectorInvocationError
          ? error.retryable
          : message === 'CONNECTOR_TIMEOUT';
      return {
        ok: false,
        latencyMs: Date.now() - started,
        error: { code, message, retryable },
      };
    }
  }

  protected async resolveSecret(ref: string): Promise<string> {
    if (!this.secrets) {
      throw new ConnectorInvocationError('CONNECTOR_NOT_INITIALIZED', 'Connector not ready', false);
    }
    const value = await this.secrets.resolveSecret(ref);
    if (!value) {
      throw new ConnectorInvocationError(
        'AUTH_SECRET_MISSING',
        'Required connector credential is not configured',
        false,
      );
    }
    return value;
  }
}

export class ConnectorInvocationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ConnectorInvocationError';
  }
}
