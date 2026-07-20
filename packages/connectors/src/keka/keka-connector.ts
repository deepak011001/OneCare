import type { ConnectorToolCallRequest } from '@onecare/connector-sdk';
import { BaseEnterpriseConnector, ConnectorInvocationError } from '@onecare/connector-sdk';
import type { ConnectorHealthReport, ConnectorToolDefinition } from '@onecare/connector-sdk';

export interface KekaHttpClient {
  getLeaveBalance(context: ConnectorToolCallRequest): Promise<unknown>;
  applyLeave(context: ConnectorToolCallRequest): Promise<unknown>;
  cancelLeave(context: ConnectorToolCallRequest): Promise<unknown>;
  leaveHistory(context: ConnectorToolCallRequest): Promise<unknown>;
  leaveTypes(context: ConnectorToolCallRequest): Promise<unknown>;
  holidayCalendar(context: ConnectorToolCallRequest): Promise<unknown>;
  ping(): Promise<void>;
}

export interface KekaConnectorOptions {
  readonly apiBaseUrl?: string;
  readonly httpClient?: KekaHttpClient;
}

const LEAVE_TOOLS: readonly ConnectorToolDefinition[] = [
  {
    name: 'leaveBalance',
    description: 'Read employee leave balance from HRIS',
    category: 'leave',
    version: '1.0.0',
    permissions: ['leave.read'],
    confirmationRequired: false,
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    outputSchema: {
      type: 'object',
      properties: {
        balances: { type: 'array' },
      },
    },
    sideEffect: 'read',
    risk: 'low',
    timeoutMs: 10_000,
    retryPolicy: { maxAttempts: 3, initialDelayMs: 200, maxDelayMs: 2_000 },
    exampleInvocations: [{}],
  },
  {
    name: 'applyLeave',
    description: 'Submit a leave application (translation only — no business rules)',
    category: 'leave',
    version: '1.0.0',
    permissions: ['leave.apply', 'mcp.execute'],
    confirmationRequired: true,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['startDate', 'endDate', 'leaveType'],
      properties: {
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        leaveType: { type: 'string' },
        reason: { type: 'string', maxLength: 1000 },
        halfDay: { type: 'boolean' },
        idempotencyKey: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        status: { type: 'string' },
      },
    },
    sideEffect: 'write',
    risk: 'medium',
    timeoutMs: 15_000,
    retryPolicy: { maxAttempts: 2, initialDelayMs: 300, maxDelayMs: 3_000 },
  },
  {
    name: 'cancelLeave',
    description: 'Cancel an existing leave request',
    category: 'leave',
    version: '1.0.0',
    permissions: ['leave.cancel', 'mcp.execute'],
    confirmationRequired: true,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['requestId'],
      properties: {
        requestId: { type: 'string' },
        reason: { type: 'string', maxLength: 500 },
      },
    },
    outputSchema: {
      type: 'object',
      properties: { requestId: { type: 'string' }, status: { type: 'string' } },
    },
    sideEffect: 'write',
    risk: 'medium',
    timeoutMs: 15_000,
  },
  {
    name: 'leaveHistory',
    description: 'List leave requests for the authenticated employee',
    category: 'leave',
    version: '1.0.0',
    permissions: ['leave.read'],
    confirmationRequired: false,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        fromDate: { type: 'string', format: 'date' },
        toDate: { type: 'string', format: 'date' },
        status: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: { items: { type: 'array' } },
    },
    sideEffect: 'read',
    risk: 'low',
    timeoutMs: 12_000,
  },
  {
    name: 'leaveTypes',
    description: 'List available leave types for the employee',
    category: 'leave',
    version: '1.0.0',
    permissions: ['leave.read'],
    confirmationRequired: false,
    inputSchema: { type: 'object', additionalProperties: false, properties: {} },
    outputSchema: {
      type: 'object',
      properties: { types: { type: 'array' } },
    },
    sideEffect: 'read',
    risk: 'low',
    timeoutMs: 8_000,
  },
  {
    name: 'holidayCalendar',
    description: 'List holidays for a month or date range',
    category: 'leave',
    version: '1.0.0',
    permissions: ['holiday.read'],
    confirmationRequired: false,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        month: { type: 'string', description: 'YYYY-MM' },
        fromDate: { type: 'string', format: 'date' },
        toDate: { type: 'string', format: 'date' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: { holidays: { type: 'array' } },
    },
    sideEffect: 'read',
    risk: 'low',
    timeoutMs: 8_000,
  },
];

export class KekaRestClient implements KekaHttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string>,
  ) {}

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const token = await this.getToken();
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      const retryable = response.status >= 500;
      throw new ConnectorInvocationError(
        `KEKA_HTTP_${response.status}`,
        `Keka API returned ${response.status}`,
        retryable,
      );
    }
    return response.json() as Promise<unknown>;
  }

  async ping(): Promise<void> {
    await this.request('/api/v1/health', { method: 'GET' });
  }

  async getLeaveBalance(_context: ConnectorToolCallRequest): Promise<unknown> {
    return this.request(`/api/v1/hr/employees/me/leave/balance`, { method: 'GET' });
  }

  async applyLeave(context: ConnectorToolCallRequest): Promise<unknown> {
    return this.request(`/api/v1/hr/leave/requests`, {
      method: 'POST',
      body: JSON.stringify(context.arguments),
    });
  }

  async cancelLeave(context: ConnectorToolCallRequest): Promise<unknown> {
    const requestId = String(context.arguments.requestId ?? '');
    return this.request(`/api/v1/hr/leave/requests/${encodeURIComponent(requestId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: context.arguments.reason }),
    });
  }

  async leaveHistory(context: ConnectorToolCallRequest): Promise<unknown> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(context.arguments)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.toString();
    return this.request(`/api/v1/hr/leave/requests${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }

  async leaveTypes(): Promise<unknown> {
    return this.request(`/api/v1/hr/leave/types`, { method: 'GET' });
  }

  async holidayCalendar(context: ConnectorToolCallRequest): Promise<unknown> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(context.arguments)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.toString();
    return this.request(`/api/v1/hr/holidays${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }
}

export class KekaStubClient implements KekaHttpClient {
  async ping(): Promise<void> {}

  async getLeaveBalance(): Promise<unknown> {
    return {
      balances: [
        { leaveType: 'Annual', available: 12, used: 3 },
        { leaveType: 'Casual', available: 5, used: 1 },
        { leaveType: 'Sick', available: 6, used: 1 },
      ],
      asOf: new Date().toISOString(),
    };
  }

  async applyLeave(context: ConnectorToolCallRequest): Promise<unknown> {
    return {
      requestId: `leave-${String(context.context.correlationId).slice(0, 8)}`,
      status: 'pending_approval',
      echo: context.arguments,
    };
  }

  async cancelLeave(context: ConnectorToolCallRequest): Promise<unknown> {
    return {
      requestId: String(context.arguments.requestId ?? ''),
      status: 'cancelled',
    };
  }

  async leaveHistory(): Promise<unknown> {
    return {
      items: [
        {
          requestId: 'leave-demo-1',
          leaveType: 'Annual',
          startDate: '2026-07-01',
          endDate: '2026-07-02',
          status: 'approved',
        },
        {
          requestId: 'leave-demo-2',
          leaveType: 'Casual',
          startDate: '2026-08-15',
          endDate: '2026-08-15',
          status: 'pending_approval',
        },
      ],
    };
  }

  async leaveTypes(): Promise<unknown> {
    return {
      types: [
        { name: 'Annual', unit: 'day' },
        { name: 'Casual', unit: 'day' },
        { name: 'Sick', unit: 'day' },
      ],
    };
  }

  async holidayCalendar(context: ConnectorToolCallRequest): Promise<unknown> {
    const month = String(context.arguments.month ?? '2026-07');
    return {
      month,
      holidays: [
        { date: `${month}-04`, name: 'Independence Observance' },
        { date: `${month}-15`, name: 'Company Foundation Day' },
      ],
    };
  }
}

export class KekaConnector extends BaseEnterpriseConnector {
  readonly metadata = {
    id: 'keka',
    name: 'Keka HRMS',
    version: '1.0.0',
    vendor: 'Keka',
    description: 'Leave tools via Keka REST API (translation layer)',
  };

  readonly auth = {
    type: 'bearer' as const,
    secretRef: 'KEKA_API_TOKEN',
  };

  readonly capabilities = {
    supportedTools: LEAVE_TOOLS.map((t) => t.name),
    supportedResources: ['employee.leave'],
    supportedEvents: ['leave.request.created'],
  };

  private client: KekaHttpClient = new KekaStubClient();

  constructor(private readonly options: KekaConnectorOptions = {}) {
    super();
    if (options.httpClient) {
      this.client = options.httpClient;
    }
  }

  override async initialize(
    secrets: Parameters<BaseEnterpriseConnector['initialize']>[0],
  ): Promise<void> {
    await super.initialize(secrets);
    if (this.options.httpClient) return;
    const baseUrl = this.options.apiBaseUrl ?? process.env.KEKA_API_BASE_URL;
    if (baseUrl) {
      this.client = new KekaRestClient(baseUrl, () => this.resolveSecret(this.auth.secretRef));
    } else {
      this.client = new KekaStubClient();
    }
  }

  async health(): Promise<ConnectorHealthReport> {
    try {
      await this.client.ping();
      return { status: 'healthy', checkedAt: new Date().toISOString() };
    } catch {
      return {
        status: 'degraded',
        checkedAt: new Date().toISOString(),
        message: 'Keka health probe failed — stub or remote API unavailable',
      };
    }
  }

  listTools(): readonly ConnectorToolDefinition[] {
    return LEAVE_TOOLS;
  }

  protected async invokeTool(
    tool: ConnectorToolDefinition,
    request: ConnectorToolCallRequest,
  ): Promise<unknown> {
    switch (tool.name) {
      case 'leaveBalance':
        return this.client.getLeaveBalance(request);
      case 'applyLeave':
        return this.client.applyLeave(request);
      case 'cancelLeave':
        return this.client.cancelLeave(request);
      case 'leaveHistory':
        return this.client.leaveHistory(request);
      case 'leaveTypes':
        return this.client.leaveTypes(request);
      case 'holidayCalendar':
        return this.client.holidayCalendar(request);
      default:
        throw new ConnectorInvocationError('TOOL_NOT_SUPPORTED', tool.name, false);
    }
  }
}

export function createKekaConnector(options?: KekaConnectorOptions): KekaConnector {
  return new KekaConnector(options);
}
