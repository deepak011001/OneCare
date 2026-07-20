import type {
  ConnectorHealthReport,
  ConnectorSecrets,
  ConnectorToolCallRequest,
  ConnectorToolCallResult,
  ConnectorToolDefinition,
  EnterpriseConnector,
} from './types';

export abstract class BaseEnterpriseConnector implements EnterpriseConnector {
  abstract readonly metadata: EnterpriseConnector['metadata'];
  abstract readonly auth: EnterpriseConnector['auth'];
  abstract readonly capabilities: EnterpriseConnector['capabilities'];

  protected secrets: ConnectorSecrets | null = null;

  async initialize(secrets: ConnectorSecrets): Promise<void> {
    this.secrets = secrets;
  }

  async shutdown(): Promise<void> {
    this.secrets = null;
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
      const data = await this.invokeTool(tool, request);
      return { ok: true, data, latencyMs: Date.now() - started };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'connector_error';
      const code =
        error instanceof ConnectorInvocationError ? error.code : 'CONNECTOR_EXECUTION_FAILED';
      const retryable = error instanceof ConnectorInvocationError ? error.retryable : false;
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
