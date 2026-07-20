import { Inject, Injectable } from '@nestjs/common';
import type { EventBusPort } from '@onecare/events';
import { DOMAIN_EVENTS } from '@onecare/events';
import type { McpPlatform } from '@onecare/mcp';
import type { RequestContext } from '@onecare/shared';
import { AUDIT_ACTIONS, DomainError } from '@onecare/shared';
import { APP_TOKENS } from '../../../shared/tokens';
import type { AuditPort } from '../../audit/infrastructure/prisma-audit.service';
import { MCP_TOKENS } from '../../mcp/mcp.tokens';

@Injectable()
export class LeaveService {
  constructor(
    @Inject(MCP_TOKENS.PLATFORM) private readonly platform: McpPlatform,
    @Inject(APP_TOKENS.EVENT_BUS) private readonly events: EventBusPort,
    @Inject(APP_TOKENS.AUDIT_PORT) private readonly audit: AuditPort,
  ) {}

  private async callTool(
    context: RequestContext,
    toolName: string,
    args: Readonly<Record<string, unknown>> = {},
  ) {
    const tool = this.platform.gateway.listTools('keka').find((t) => t.name === toolName);
    if (!tool) {
      throw new DomainError('NOT_FOUND', `Leave tool ${toolName} is unavailable`);
    }
    const missing = tool.permissions.filter((p) => !context.permissions.includes(p));
    if (missing.length > 0) {
      await this.audit.write({
        tenantId: String(context.tenantId),
        userId: String(context.userId),
        sessionId: String(context.sessionId),
        action: AUDIT_ACTIONS.LEAVE_VIEW_DENIED,
        resource: `leave.tool.${toolName}`,
        resourceId: 'keka',
        result: 'denied',
        correlationId: String(context.correlationId),
        requestId: String(context.requestId),
        metadata: { missing },
      });
      throw new DomainError('FORBIDDEN', `Missing permissions: ${missing.join(', ')}`);
    }

    const result = await this.platform.gateway.execute({
      connectorId: 'keka',
      toolName,
      arguments: args,
      context: {
        tenantId: context.tenantId,
        userId: context.userId,
        correlationId: context.correlationId,
        roles: context.roles,
        permissions: context.permissions,
        attributes: context.attributes,
      },
    });

    await this.events.publish({
      name: DOMAIN_EVENTS.LEAVE_TOOL_READ,
      occurredAt: new Date(),
      tenantId: String(context.tenantId),
      correlationId: String(context.correlationId),
      payload: { toolName, ok: result.ok },
    });

    await this.audit.write({
      tenantId: String(context.tenantId),
      userId: String(context.userId),
      sessionId: String(context.sessionId),
      action:
        toolName === 'leaveBalance'
          ? AUDIT_ACTIONS.LEAVE_BALANCE_VIEW
          : toolName === 'leaveHistory'
            ? AUDIT_ACTIONS.LEAVE_HISTORY_VIEW
            : AUDIT_ACTIONS.LEAVE_READ,
      resource: `leave.tool.${toolName}`,
      resourceId: 'keka',
      result: result.ok ? 'success' : 'failure',
      correlationId: String(context.correlationId),
      requestId: String(context.requestId),
      metadata: { errorCode: result.errorCode ?? null },
    });

    if (!result.ok) {
      throw new DomainError(
        result.errorCode ?? 'LEAVE_TOOL_FAILED',
        result.errorMessage ?? 'Leave request failed',
      );
    }
    return result.data;
  }

  async getBalance(context: RequestContext) {
    return this.callTool(context, 'leaveBalance');
  }

  async getHistory(context: RequestContext, query?: { status?: string }) {
    return this.callTool(context, 'leaveHistory', {
      ...(query?.status ? { status: query.status } : {}),
    });
  }

  async getTypes(context: RequestContext) {
    return this.callTool(context, 'leaveTypes');
  }

  async getHolidays(context: RequestContext, month?: string) {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.callTool(context, 'holidayCalendar', { month: month ?? defaultMonth });
  }

  async getRequest(context: RequestContext, requestId: string) {
    const history = (await this.getHistory(context)) as {
      items?: Array<Record<string, unknown>>;
    };
    const item = history.items?.find((i) => String(i.requestId) === requestId);
    if (!item) {
      throw new DomainError('NOT_FOUND', 'Leave request not found');
    }
    return item;
  }

  async getDashboard(context: RequestContext) {
    const [balance, history, holidays, types] = await Promise.all([
      this.getBalance(context),
      this.getHistory(context),
      this.getHolidays(context),
      this.getTypes(context),
    ]);

    const items =
      (history as { items?: Array<Record<string, unknown>> }).items ??
      ([] as Array<Record<string, unknown>>);
    const upcoming = items.filter((i) => {
      const status = String(i.status ?? '');
      return status === 'pending_approval' || status === 'approved';
    });
    const recent = items.slice(0, 5);

    return {
      balance,
      upcoming,
      recent,
      holidays,
      types,
      quickActions: [
        { id: 'apply', label: 'Apply leave', href: '/app/ai?prompt=Apply%20leave' },
        {
          id: 'balance',
          label: 'Check balance',
          href: '/app/ai?prompt=What%20is%20my%20leave%20balance%3F',
        },
        { id: 'history', label: 'Leave history', href: '/app/employee/leave' },
        { id: 'holidays', label: 'Holidays', href: '/app/employee/leave/holidays' },
      ],
    };
  }
}
